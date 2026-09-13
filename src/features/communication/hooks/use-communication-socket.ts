// src/features/communication/hooks/use-communication-socket.ts
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/features/user/hooks/useUser";
import { socketClient } from "../socket/socket-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setConnectionStatus } from "../slices/communicationSlice";
import { env } from "@/config/env";
import { communicationService } from "../services/communication.service";
import { ICommunicationUser } from "../types/communication.types";

export function useCommunicationSocket() {
  const { user } = useUser();
  const dispatch = useAppDispatch();
  const connectionStatus = useAppSelector((state) => state.communication.connectionStatus);
  const [commUser, setCommUser] = useState<ICommunicationUser | null>(null);

  const userId = user?.id;
  const userName = user?.name;
  const userEmail = user?.email;
  const userAvatar = user?.uploadedImage || user?.image || null;

  // 1. Sync CommunicationUser for the current authenticated user
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      const timer = setTimeout(() => {
        if (isMounted) setCommUser(null);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    async function syncUser() {
      try {
        const synced = await communicationService.syncCurrentUser({
          externalId: userId!,
          name: userName || "User",
          email: userEmail || null,
          avatar: userAvatar,
        });

        if (isMounted) {
          if (synced?.id && typeof window !== "undefined") {
            localStorage.setItem("pulse_comm_user_id", synced.id);
          }
          setCommUser(synced);
        }
      } catch (err) {
        console.warn("[Communication] Could not sync communication user:", err);
      }
    }

    syncUser();
    const heartbeat = window.setInterval(syncUser, 20_000);

    return () => {
      isMounted = false;
      window.clearInterval(heartbeat);
    };
  }, [userId, userName, userEmail, userAvatar]);

  // 2. Connect and maintain Socket.IO connection
  useEffect(() => {
    if (!userId) {
      socketClient.disconnect();
      return;
    }

    const projectId = env.client.NEXT_PUBLIC_PROJECT_ID;
    if (!projectId) {
      console.warn("[Communication] Missing NEXT_PUBLIC_PROJECT_ID; socket not connected");
      return;
    }

    // Subscribe to connection status changes
    const unsubscribe = socketClient.onStatusChange((status) => {
      dispatch(setConnectionStatus(status));
    });

    // Establish connection
    socketClient.connect({
      projectId,
      externalId: userId,
      userId: commUser?.id,
    });

    return () => {
      unsubscribe();
    };
  }, [userId, commUser?.id, dispatch]);

  return {
    connectionStatus,
    commUser,
    isConnected: connectionStatus === "connected",
    socket: socketClient.getSocket(),
  };
}
