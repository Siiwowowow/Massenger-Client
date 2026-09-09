
// src/features/communication/socket/socket-client.ts
import { io, Socket } from "socket.io-client";
import { env } from "@/config/env";
import { REALTIME_EVENTS } from "./socket-events";
import { RealtimeAckResponse } from "../types/communication.types";

export interface SocketAuthOptions {
  projectId: string;
  userId?: string;
  externalId?: string;
}

class SocketClientManager {
  private socket: Socket | null = null;
  private currentAuth: SocketAuthOptions | null = null;
  private listeners: Set<(status: "connected" | "connecting" | "disconnected") => void> = new Set();

  /**
   * Subscribe to connection status changes
   */
  public onStatusChange(callback: (status: "connected" | "connecting" | "disconnected") => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyStatus(status: "connected" | "connecting" | "disconnected") {
    this.listeners.forEach((cb) => cb(status));
  }

  /**
   * Initialize or return the singleton socket connection
   */
  public connect(auth: SocketAuthOptions): Socket {
    const isSameProjectAndExternal =
      this.currentAuth?.projectId === auth.projectId &&
      this.currentAuth?.externalId === auth.externalId;

    if (this.socket && isSameProjectAndExternal && (this.socket.connected || this.socket.active)) {
      if (auth.userId && this.currentAuth && this.currentAuth.userId !== auth.userId) {
        this.currentAuth.userId = auth.userId;
        if (this.socket.auth && typeof this.socket.auth === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.socket.auth as any).userId = auth.userId;
        }
      }
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.currentAuth = { ...auth };
    this.notifyStatus("connecting");

    const socketUrl = env.client.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        projectId: auth.projectId,
        ...(auth.userId ? { userId: auth.userId } : {}),
        ...(auth.externalId ? { externalId: auth.externalId } : {}),
      },
    });

    this.setupInternalListeners(this.socket);
    return this.socket;
  }

  private setupInternalListeners(socket: Socket) {
    socket.on("connect", () => {
      console.log(`[Socket] Connected with ID: ${socket.id}`);
      this.notifyStatus("connected");
    });

    socket.on("connect_error", (err) => {
      if (err.message !== "websocket error" && err.message !== "xhr poll error") {
        console.warn(`[Socket] Connect error:`, err.message);
      }
      this.notifyStatus("disconnected");
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected:`, reason);
      this.notifyStatus("disconnected");
    });

    socket.on(REALTIME_EVENTS.SERVER.SOCKET_ERROR, (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = (err as any)?.error || err;
      if (errObj?.code === "FORBIDDEN") {
        console.warn(`[Socket] Access restricted:`, errObj?.message || errObj);
      } else {
        console.error(`[Socket] Gateway error:`, err);
      }
    });
  }

  /**
   * Get the current active socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is currently connected
   */
  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  /**
   * Disconnect and cleanup active socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentAuth = null;
    this.notifyStatus("disconnected");
  }

  /**
   * Emit an event and wait for acknowledgement promise with timeout
   */
  public async emitWithAck<TResponse = RealtimeAckResponse>(
    event: string,
    payload: unknown,
    timeoutMs = 5000
  ): Promise<TResponse> {
    if (!this.socket || !this.socket.connected) {
      throw new Error("Socket is not connected");
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for acknowledgement of '${event}' after ${timeoutMs}ms`));
      }, timeoutMs);

      this.socket!.emit(event, payload, (response: TResponse) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }
}

export const socketClient = new SocketClientManager();
