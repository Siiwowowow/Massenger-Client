// src/features/communication/call/services/livekit-call-manager.ts
import { Room, RoomEvent, ConnectionState, Track } from "livekit-client";
import { callService } from "./call.service";
import {
  CallState,
  CallType,
  LiveKitConnectionState,
  CallMediaState,
} from "../types/call.types";
import { env } from "@/config/env";

export interface ConnectOptions {
  callId: string;
  conversationId: string;
  callState: CallState;
  callType?: CallType;
}

export type StateChangeCallback = (state: LiveKitConnectionState) => void;
export type ErrorCallback = (error: Error | null) => void;
export type MediaChangeCallback = (media: CallMediaState) => void;

/**
 * LiveKitCallManager
 *
 * Encapsulates the LiveKit media room connection and media lifecycle:
 * - Only connects when callState === "ACCEPTED"
 * - Automatically subscribes to incoming audio/video tracks (autoSubscribe: true)
 * - Publishes real microphone (AUDIO & VIDEO) and camera (VIDEO only)
 * - Autoplay handling via room.startAudio()
 * - Real hardware track release via track.stop() on disconnect
 * - Stale Call Protection: validates callId before and after token & room resolution
 * - Room Duplication Protection: prevents duplicate connections and instances
 * - Media state tracking & reactive control methods (mic on/off, camera on/off)
 */
export class LiveKitCallManager {
  private room: Room | null = null;
  private connectionState: LiveKitConnectionState = "DISCONNECTED";
  private isConnecting = false;
  private connectedCallId: string | null = null;
  private activeCallId: string | null = null;
  private currentCallType: CallType = "AUDIO";

  private mediaState: CallMediaState = {
    isMicEnabled: false,
    isCameraEnabled: false,
    hasCameraError: false,
    hasMicError: false,
    mediaErrorMessage: null,
  };

  private stateChangeListeners = new Set<StateChangeCallback>();
  private errorListeners = new Set<ErrorCallback>();
  private mediaStateListeners = new Set<MediaChangeCallback>();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.disconnect();
      });
    }
  }

  /**
   * Current LiveKit connection state
   */
  public getConnectionState(): LiveKitConnectionState {
    return this.connectionState;
  }

  /**
   * Current Room instance in runtime scope (never stored in Redux)
   */
  public getRoom(): Room | null {
    return this.room;
  }

  /**
   * Whether a connection attempt is currently in progress
   */
  public getIsConnecting(): boolean {
    return this.isConnecting;
  }

  /**
   * Currently connected callId
   */
  public getConnectedCallId(): string | null {
    return this.connectedCallId;
  }

  /**
   * Current call media state
   */
  public getMediaState(): CallMediaState {
    return { ...this.mediaState };
  }

  /**
   * Subscribe to connection state changes
   */
  public onConnectionStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeListeners.add(callback);
    return () => {
      this.stateChangeListeners.delete(callback);
    };
  }

  /**
   * Subscribe to connection errors
   */
  public onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Subscribe to media state changes (mic, camera, permission warnings)
   */
  public onMediaStateChange(callback: MediaChangeCallback): () => void {
    this.mediaStateListeners.add(callback);
    return () => {
      this.mediaStateListeners.delete(callback);
    };
  }

  private setConnectionState(state: LiveKitConnectionState): void {
    this.connectionState = state;
    for (const listener of this.stateChangeListeners) {
      try {
        listener(state);
      } catch (e) {
        console.error("[LiveKitCallManager] state change listener error:", e);
      }
    }
  }

  private notifyError(error: Error | null): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (e) {
        console.error("[LiveKitCallManager] error listener error:", e);
      }
    }
  }

  private setMediaState(update: Partial<CallMediaState>): void {
    this.mediaState = {
      ...this.mediaState,
      ...update,
    };
    for (const listener of this.mediaStateListeners) {
      try {
        listener({ ...this.mediaState });
      } catch (e) {
        console.error("[LiveKitCallManager] media state listener error:", e);
      }
    }
  }

  /**
   * Connect to LiveKit Room for the specified active call
   */
  public async connect({
    callId,
    conversationId,
    callState,
    callType = "AUDIO",
  }: ConnectOptions): Promise<void> {
    // 1. Connection Flow Check: Only connect when callState is ACCEPTED
    if (callState !== "ACCEPTED") {
      if (this.room || this.isConnecting) {
        this.disconnect();
      }
      return;
    }

    if (!callId || !conversationId) {
      return;
    }

    // 2. Room Duplication Protection:
    // If already connected or connecting for this exact callId, do not duplicate
    if (
      (this.connectedCallId === callId && this.room) ||
      (this.isConnecting && this.activeCallId === callId)
    ) {
      return;
    }

    // If another room is connected from a prior call, tear it down cleanly first
    if (this.room) {
      this.disconnect();
    }

    const currentAttemptCallId = callId;
    this.activeCallId = currentAttemptCallId;
    this.currentCallType = callType;
    this.isConnecting = true;
    this.notifyError(null);
    this.setConnectionState("CONNECTING");

    try {
      // 3. Token Security: Request token from backend (token is in-memory only)
      const tokenResult = await callService.requestCallToken({
        conversationId,
      });

      // 4. Stale Call Protection:
      // If the call ended, cancelled, or a new call started while token request was pending, abort!
      if (
        this.activeCallId !== currentAttemptCallId ||
        !this.isConnecting
      ) {
        this.isConnecting = false;
        return;
      }

      const { token, serverUrl } = tokenResult;
      if (!token) {
        throw new Error("No LiveKit call token returned by backend.");
      }

      // Determine server URL: backend serverUrl > NEXT_PUBLIC_LIVEKIT_URL > fallback
      const targetUrl =
        serverUrl ||
        env.client.NEXT_PUBLIC_LIVEKIT_URL ||
        "ws://localhost:7880";

      // 5. Instantiate LiveKit Room with official adaptive stream and dynacast
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.room = room;

      // 6. Register Room Event Listeners
      room.on(RoomEvent.Connected, () => {
        if (this.activeCallId === currentAttemptCallId) {
          this.connectedCallId = currentAttemptCallId;
          this.isConnecting = false;
          this.setConnectionState("CONNECTED");
        }
      });

      room.on(RoomEvent.Reconnecting, () => {
        if (this.activeCallId === currentAttemptCallId) {
          this.setConnectionState("RECONNECTING");
        }
      });

      room.on(RoomEvent.Reconnected, () => {
        if (this.activeCallId === currentAttemptCallId) {
          this.setConnectionState("CONNECTED");
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (this.activeCallId === currentAttemptCallId) {
          this.connectedCallId = null;
          this.isConnecting = false;
          this.setConnectionState("DISCONNECTED");
        }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (this.activeCallId !== currentAttemptCallId) return;

        switch (state) {
          case ConnectionState.Connected:
            this.connectedCallId = currentAttemptCallId;
            this.isConnecting = false;
            this.setConnectionState("CONNECTED");
            break;
          case ConnectionState.Connecting:
            this.setConnectionState("CONNECTING");
            break;
          case ConnectionState.Reconnecting:
            this.setConnectionState("RECONNECTING");
            break;
          case ConnectionState.Disconnected:
            this.connectedCallId = null;
            this.isConnecting = false;
            this.setConnectionState("DISCONNECTED");
            break;
        }
      });

      // Synchronize media mute/unmute events
      room.on(RoomEvent.TrackMuted, (pub, participant) => {
        if (participant.isLocal) {
          if (pub.source === Track.Source.Microphone) {
            this.setMediaState({ isMicEnabled: false });
          } else if (pub.source === Track.Source.Camera) {
            this.setMediaState({ isCameraEnabled: false });
          }
        }
      });

      room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
        if (participant.isLocal) {
          if (pub.source === Track.Source.Microphone) {
            this.setMediaState({ isMicEnabled: true });
          } else if (pub.source === Track.Source.Camera) {
            this.setMediaState({ isCameraEnabled: true });
          }
        }
      });

      // 7. Connect Room with autoSubscribe: true to receive remote media
      await room.connect(targetUrl, token, {
        autoSubscribe: true,
      });

      // Verify active call didn't change during connect() async resolution
      if (this.activeCallId !== currentAttemptCallId) {
        this.disconnect();
        return;
      }

      // 8. Unlock Audio Playback for Browser Autoplay Policies
      try {
        await room.startAudio();
      } catch (audioErr) {
        console.warn("[LiveKitCallManager] startAudio warning:", audioErr);
      }

      // 9. Publish Real Media Tracks based on CallType
      if (callType === "AUDIO") {
        // AUDIO CALL: Publish microphone only. Camera is NEVER requested or published.
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          this.setMediaState({
            isMicEnabled: true,
            isCameraEnabled: false,
            hasMicError: false,
            hasCameraError: false,
            mediaErrorMessage: null,
          });
        } catch (micErr: unknown) {
          console.error("[LiveKitCallManager] Audio call microphone permission error:", micErr);
          const errorMsg = "Microphone access was denied. Please check your browser permissions.";
          this.setMediaState({
            isMicEnabled: false,
            isCameraEnabled: false,
            hasMicError: true,
            mediaErrorMessage: errorMsg,
          });
          throw new Error(errorMsg);
        }
      } else if (callType === "VIDEO") {
        // VIDEO CALL: Publish microphone + camera with graceful degradation
        let micSuccess = false;
        let camSuccess = false;
        let errorNotice: string | null = null;

        // Try microphone first
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          micSuccess = true;
        } catch (micErr: unknown) {
          console.warn("[LiveKitCallManager] Video call mic error:", micErr);
          errorNotice = "Microphone access denied.";
        }

        // Try camera second
        try {
          await room.localParticipant.setCameraEnabled(true);
          camSuccess = true;
        } catch (camErr: unknown) {
          console.warn("[LiveKitCallManager] Video call camera error:", camErr);
          errorNotice = errorNotice
            ? "Camera and microphone access denied."
            : "Camera access denied. Continuing as audio-only.";
        }

        // If both failed, media cannot proceed
        if (!micSuccess && !camSuccess) {
          this.setMediaState({
            isMicEnabled: false,
            isCameraEnabled: false,
            hasMicError: true,
            hasCameraError: true,
            mediaErrorMessage: "Camera and microphone permissions were denied or unavailable.",
          });
          throw new Error("Camera and microphone permissions were denied or unavailable.");
        }

        this.setMediaState({
          isMicEnabled: micSuccess,
          isCameraEnabled: camSuccess,
          hasMicError: !micSuccess,
          hasCameraError: !camSuccess,
          mediaErrorMessage: errorNotice,
        });
      }
    } catch (err) {
      if (this.activeCallId !== currentAttemptCallId) {
        return;
      }

      this.isConnecting = false;
      this.connectedCallId = null;
      this.setConnectionState("DISCONNECTED");

      let connMsg = "Failed to connect to LiveKit call room.";
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (
          msg.includes("connect") ||
          msg.includes("websocket") ||
          msg.includes("failed to fetch") ||
          msg.includes("refused") ||
          msg.includes("network")
        ) {
          connMsg =
            "Cannot connect to LiveKit media server (ws://localhost:7880). Please ensure livekit-server is running.";
        } else {
          connMsg = err.message;
        }
      }

      if (!this.mediaState.mediaErrorMessage) {
        this.setMediaState({
          mediaErrorMessage: connMsg,
        });
      }

      const error =
        err instanceof Error
          ? err
          : new Error(connMsg);

      this.notifyError(error);
    }
  }

  /**
   * Toggle local microphone on/off
   */
  public async toggleMicrophone(): Promise<boolean> {
    if (!this.room || this.connectionState !== "CONNECTED") {
      return false;
    }

    try {
      const current = this.room.localParticipant.isMicrophoneEnabled;
      const target = !current;
      await this.room.localParticipant.setMicrophoneEnabled(target);
      this.setMediaState({ isMicEnabled: target });
      return target;
    } catch (err) {
      console.error("[LiveKitCallManager] toggleMicrophone error:", err);
      return this.mediaState.isMicEnabled;
    }
  }

  /**
   * Toggle local camera on/off (only allowed for VIDEO calls)
   */
  public async toggleCamera(): Promise<boolean> {
    // Guard: AUDIO calls must remain audio-only per requirement 9
    if (this.currentCallType === "AUDIO") {
      return false;
    }

    if (!this.room || this.connectionState !== "CONNECTED") {
      return false;
    }

    try {
      const current = this.room.localParticipant.isCameraEnabled;
      const target = !current;
      await this.room.localParticipant.setCameraEnabled(target);
      this.setMediaState({ isCameraEnabled: target });
      return target;
    } catch (err) {
      console.error("[LiveKitCallManager] toggleCamera error:", err);
      return this.mediaState.isCameraEnabled;
    }
  }

  /**
   * Returns current microphone state
   */
  public isMicrophoneEnabled(): boolean {
    return this.room?.localParticipant.isMicrophoneEnabled ?? this.mediaState.isMicEnabled;
  }

  /**
   * Returns current camera state
   */
  public isCameraEnabled(): boolean {
    if (this.currentCallType === "AUDIO") return false;
    return this.room?.localParticipant.isCameraEnabled ?? this.mediaState.isCameraEnabled;
  }

  /**
   * Cleanly disconnect the room and release all listeners and media tracks
   */
  public disconnect(): void {
    this.activeCallId = null;
    this.isConnecting = false;
    this.connectedCallId = null;

    if (this.room) {
      try {
        // Requirement 3 & 11: Release hardware tracks explicitly so LEDs turn off unconditionally
        const local = this.room.localParticipant;
        if (local) {
          // Stop all published tracks (both audio and video)
          if (local.trackPublications) {
            local.trackPublications.forEach((pub) => {
              if (pub.track) {
                try {
                  pub.track.stop();
                  const rawTrack = pub.track as unknown as { mediaStreamTrack?: { stop: () => void } };
                  rawTrack.mediaStreamTrack?.stop();
                } catch (e) {
                  console.warn("[LiveKitCallManager] track stop error:", e);
                }
              }
            });
          }

          if (local.audioTrackPublications) {
            local.audioTrackPublications.forEach((pub) => {
              if (pub.track) {
                try {
                  pub.track.stop();
                  const rawTrack = pub.track as unknown as { mediaStreamTrack?: { stop: () => void } };
                  rawTrack.mediaStreamTrack?.stop();
                } catch (e) {
                  console.warn("[LiveKitCallManager] audio track stop error:", e);
                }
              }
            });
          }

          if (local.videoTrackPublications) {
            local.videoTrackPublications.forEach((pub) => {
              if (pub.track) {
                try {
                  pub.track.stop();
                  const rawTrack = pub.track as unknown as { mediaStreamTrack?: { stop: () => void } };
                  rawTrack.mediaStreamTrack?.stop();
                } catch (e) {
                  console.warn("[LiveKitCallManager] video track stop error:", e);
                }
              }
            });
          }
        }

        this.room.removeAllListeners();
        this.room.disconnect(true);
      } catch {
        // Safe teardown
      }
      this.room = null;
    }

    this.setMediaState({
      isMicEnabled: false,
      isCameraEnabled: false,
      hasMicError: false,
      hasCameraError: false,
      mediaErrorMessage: null,
    });

    this.notifyError(null);
    this.setConnectionState("DISCONNECTED");
  }

  /**
   * Tear down manager completely
   */
  public destroy(): void {
    this.disconnect();
    this.stateChangeListeners.clear();
    this.errorListeners.clear();
    this.mediaStateListeners.clear();
  }
}

// Export singleton instance for convenience
export const liveKitCallManager = new LiveKitCallManager();

