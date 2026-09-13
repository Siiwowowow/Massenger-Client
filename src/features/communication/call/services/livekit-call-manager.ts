// src/features/communication/call/services/livekit-call-manager.ts
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Participant,
} from "livekit-client";
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

export class LiveKitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveKitConfigError";
  }
}

/**
 * Resolves the LiveKit SFU server URL with environment safety:
 * - Production:
 *   - Requires serverUrl (from backend) or NEXT_PUBLIC_LIVEKIT_URL.
 *   - Throws a clear configuration error if both are missing.
 *   - Localhost and insecure ws:// URLs are strictly disallowed.
 * - Development:
 *   - Allows localhost.
 *   - Falls back to ws://localhost:7880 if neither serverUrl nor NEXT_PUBLIC_LIVEKIT_URL is provided.
 */
export function resolveLiveKitServerUrl(
  backendServerUrl?: string | null,
  clientEnvUrl?: string | null,
  envMode: string = process.env.NODE_ENV || "development"
): string {
  const isProduction = envMode === "production";
  const trimmedBackend = backendServerUrl?.trim() || "";
  const trimmedEnv = clientEnvUrl?.trim() || "";

  const candidateUrl = trimmedBackend || trimmedEnv;

  if (!candidateUrl) {
    if (isProduction) {
      throw new LiveKitConfigError(
        "LiveKit configuration error: LiveKit server URL is missing. Both backend serverUrl and NEXT_PUBLIC_LIVEKIT_URL are undefined in production."
      );
    }
    // Development fallback: localhost allowed only in development
    return "ws://localhost:7880";
  }

  if (isProduction) {
    const isLocalhost =
      candidateUrl.includes("localhost") ||
      candidateUrl.includes("127.0.0.1") ||
      candidateUrl.startsWith("ws://");

    if (isLocalhost) {
      throw new LiveKitConfigError(
        `LiveKit configuration error: Localhost or insecure URL "${candidateUrl}" is not allowed in production. Localhost is permitted only in development.`
      );
    }
  }

  return candidateUrl;
}

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
  private remoteAudioElements = new Map<string, HTMLAudioElement[]>();

  private mediaState: CallMediaState = {
    isMicEnabled: false,
    isCameraEnabled: false,
    hasCameraError: false,
    hasMicError: false,
    mediaErrorMessage: null,
    isAudioPlaybackBlocked: false,
    isLocalSpeaking: false,
    isRemoteSpeaking: false,
    isSpeakerEnabled: false,
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
   * Resolves the LiveKit server URL for the given environment.
   */
  public resolveServerUrl(
    serverUrl?: string | null,
    envMode: string = process.env.NODE_ENV || "development"
  ): string {
    return resolveLiveKitServerUrl(
      serverUrl,
      env.client.NEXT_PUBLIC_LIVEKIT_URL,
      envMode
    );
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

    let targetUrl = "";
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

      // Determine server URL: backend serverUrl > NEXT_PUBLIC_LIVEKIT_URL > dev fallback
      targetUrl = this.resolveServerUrl(serverUrl);

      // 5. Instantiate LiveKit Room with official adaptive stream and dynacast
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // 5.5 Pre-acquire media to avoid gesture timeouts on iOS/mobile browsers
      try {
        if (callType === "VIDEO") {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (e) {
        console.warn("[LiveKitCallManager] Pre-acquire media failed:", e);
      }

      this.room = room;
      
      // Trigger a state update so the React UI can grab the new room instance immediately
      this.setConnectionState("CONNECTING");

      // 6. Register Room Event Listeners
      room.on(RoomEvent.Connected, () => {
        if (this.activeCallId !== currentAttemptCallId) {
          room.disconnect();
          return;
        }
        this.connectedCallId = currentAttemptCallId;
        this.isConnecting = false;
        this.setConnectionState("CONNECTED");
      });

      room.on(RoomEvent.Reconnecting, () => {
        this.setConnectionState("RECONNECTING");
      });

      room.on(RoomEvent.Reconnected, () => {
        this.setConnectionState("CONNECTED");
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

      // Direct native handling of remote media tracks (ensures sound is audible in DOM)
      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log(`[LiveKitCallManager] TrackSubscribed: kind=${track.kind}, source=${publication.source}, participant=${participant.identity}`);
          console.log(`[LiveKitCallManager DIAGNOSTICS] Remote audio publication count for ${participant.identity}: ${participant.audioTrackPublications.size}`);

          if (track.kind === Track.Kind.Audio) {
            const attachedElement = track.attach();
            const audioElements = (Array.isArray(attachedElement) ? attachedElement : [attachedElement]).filter(
              (element): element is HTMLAudioElement => element instanceof HTMLAudioElement,
            );
            const trackKey = participant.identity;

            audioElements.forEach((element) => {
              element.autoplay = true;
              element.controls = false;
              element.setAttribute("aria-hidden", "true");
              element.style.display = "none";
              document.body.appendChild(element);
              void element.play().catch(() => {
                this.setMediaState({ isAudioPlaybackBlocked: true });
              });
            });

            this.remoteAudioElements.set(trackKey, audioElements);
          }
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log(
            `[LiveKitCallManager] TrackUnsubscribed: kind=${track.kind}, participant=${participant.identity}`
          );
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach((element) => element.remove());
            const trackKey = participant.identity;
            this.remoteAudioElements.get(trackKey)?.forEach((element) => element.remove());
            this.remoteAudioElements.delete(trackKey);
          }
        }
      );

      // Instantly drop the call if the remote participant leaves (for 1:1 calls)
      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`[LiveKitCallManager] Remote participant disconnected: ${participant.identity}`);
        if (this.room && this.room.remoteParticipants.size === 0) {
          console.log(`[LiveKitCallManager] No remote participants left. Disconnecting instantly.`);
          this.disconnect();
        }
      });

      // Autoplay unlock tracking
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        const canPlay = room.canPlaybackAudio;
        console.log("[LiveKitCallManager] AudioPlaybackStatusChanged: canPlaybackAudio =", canPlay);
        this.setMediaState({ isAudioPlaybackBlocked: !canPlay });
      });

      // Real-time speaking detection for visual feedback
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const isLocalSpeaking = speakers.some((s) => s.isLocal);
        const isRemoteSpeaking = speakers.some((s) => !s.isLocal);
        this.setMediaState({
          isLocalSpeaking,
          isRemoteSpeaking,
        });
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
        this.setMediaState({ isAudioPlaybackBlocked: !room.canPlaybackAudio });
      } catch (audioErr) {
        console.warn("[LiveKitCallManager] startAudio warning:", audioErr);
        // Mobile browsers require a user gesture before remote audio can play.
        this.setMediaState({ isAudioPlaybackBlocked: true });
      }
      // 9. Publish Real Media Tracks based on CallType
      if (callType === "AUDIO") {
        // AUDIO CALL: Publish microphone only. Camera is NEVER requested or published.
        try {
          // Optimistic UI updates
          this.setMediaState({
            isMicEnabled: true,
            isCameraEnabled: false,
            isSpeakerEnabled: false,
            hasMicError: false,
            hasCameraError: false,
            mediaErrorMessage: null,
          });
          await room.localParticipant.setMicrophoneEnabled(true);
          console.log('[LiveKitCallManager DIAGNOSTICS] localParticipant.audioTrackPublications.size:', room.localParticipant.audioTrackPublications.size);
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

        // Optimistic UI updates
        this.setMediaState({
          isMicEnabled: true,
          isCameraEnabled: true,
          isSpeakerEnabled: true,
        });

        // Try microphone and camera concurrently
        const results = await Promise.allSettled([
          room.localParticipant.setMicrophoneEnabled(true),
          room.localParticipant.setCameraEnabled(true)
        ]);

        if (results[0].status === "fulfilled") {
          micSuccess = true;
        } else {
          console.warn("[LiveKitCallManager] Video call mic error:", results[0].reason);
        }

        if (results[1].status === "fulfilled") {
          camSuccess = true;
        } else {
          console.warn("[LiveKitCallManager] Video call camera error:", results[1].reason);
        }

        if (!micSuccess && !camSuccess) {
           errorNotice = "Camera and microphone permissions were denied or unavailable.";
        } else if (!micSuccess) {
           errorNotice = "Microphone access denied.";
        } else if (!camSuccess) {
           errorNotice = "Camera access denied. Continuing as audio-only.";
        }

        // If both failed, media cannot proceed
        if (!micSuccess && !camSuccess) {
          this.setMediaState({
            isMicEnabled: false,
            isCameraEnabled: false,
            hasMicError: true,
            hasCameraError: true,
            mediaErrorMessage: errorNotice,
          });
          throw new Error(errorNotice ?? "Camera and microphone permissions were denied.");
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
        if (
          err instanceof LiveKitConfigError ||
          err.name === "LiveKitConfigError" ||
          err.message.includes("LiveKit configuration error")
        ) {
          connMsg = err.message;
        } else {
          const msg = err.message.toLowerCase();
          if (
            msg.includes("connect") ||
            msg.includes("websocket") ||
            msg.includes("failed to fetch") ||
            msg.includes("refused") ||
            msg.includes("network")
          ) {
            const isDev = process.env.NODE_ENV !== "production";
            connMsg = isDev
              ? `Cannot connect to LiveKit media server (${targetUrl || "ws://localhost:7880"}). Please ensure livekit-server is running.`
              : `Cannot connect to LiveKit media server (${targetUrl || "configured server"}). Please check network connectivity and server status.`;
          } else {
            connMsg = err.message;
          }
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
      throw error;
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
      
      // Optimistic UI update for instant feedback
      this.setMediaState({ isMicEnabled: target });
      
      await this.room.localParticipant.setMicrophoneEnabled(target);
      return target;
    } catch (err) {
      console.error("[LiveKitCallManager] toggleMicrophone error:", err);
      // Revert on failure
      const current = this.room.localParticipant.isMicrophoneEnabled;
      this.setMediaState({ isMicEnabled: current });
      return current;
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
      
      // Optimistic UI update for instant feedback
      this.setMediaState({ isCameraEnabled: target });
      
      await this.room.localParticipant.setCameraEnabled(target);
      return target;
    } catch (err) {
      console.error("[LiveKitCallManager] toggleCamera error:", err);
      // Revert on failure
      const current = this.room.localParticipant.isCameraEnabled;
      this.setMediaState({ isCameraEnabled: current });
      return current;
    }
  }

  /**
   * Switch front/back camera (if multiple video inputs exist)
   */
  public async switchCamera(): Promise<boolean> {
    if (this.currentCallType !== "VIDEO" || !this.room || this.connectionState !== "CONNECTED") {
      return false;
    }

    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
      if (devices.length < 2) return false;

      const currentDeviceId = this.room.getActiveDevice("videoinput");
      let nextDevice = devices[0];
      
      if (currentDeviceId) {
        const currentIndex = devices.findIndex((device) => device.deviceId === currentDeviceId);
        if (currentIndex !== -1) {
          nextDevice = devices[(currentIndex + 1) % devices.length];
        } else {
          nextDevice = devices[1]; // fallback if current not found in list
        }
      } else {
        // If we don't know the current, try the last one (often the back camera)
        nextDevice = devices[devices.length - 1];
      }

      await this.room.switchActiveDevice("videoinput", nextDevice.deviceId);
      return true;
    } catch (err) {
      console.error("[LiveKitCallManager] switchCamera error:", err);
      return false;
    }
  }

  /**
   * Toggle between Loudspeaker and Earpiece (if supported)
   */
  public async toggleSpeaker(): Promise<boolean> {
    if (!this.room) return false;
    try {
      const currentState = this.mediaState.isSpeakerEnabled ?? false;
      const newState = !currentState;
      
      // Optimistic UI update
      this.setMediaState({ isSpeakerEnabled: newState });

      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "audiooutput",
      );

      if (devices.length > 1) {
        const currentDeviceId = this.room.getActiveDevice("audiooutput");
        let targetDevice = devices[0];
        
        if (currentDeviceId) {
           const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
           if (currentIndex !== -1) {
              targetDevice = devices[(currentIndex + 1) % devices.length];
           }
        }
        await this.room.switchActiveDevice("audiooutput", targetDevice.deviceId);
      } else {
        console.warn("[LiveKitCallManager] Only 1 audio output device found, cannot toggle speaker programmatically via standard WebRTC.");
      }
      
      return true;
    } catch (err) {
      console.error("[LiveKitCallManager] toggleSpeaker error:", err);
      // Revert on error
      this.setMediaState({ isSpeakerEnabled: !this.mediaState.isSpeakerEnabled });
      return false;
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
   * Unlock or resume audio context and LiveKit room audio playback.
   * Safely called on user gestures (e.g. click accept, click unmute).
   */
  public async unlockAudio(): Promise<boolean> {
    return this.startAudio();
  }

  /**
   * Start or resume audio playback manually
   */
  public async startAudio(): Promise<boolean> {
    if (!this.room) {
      console.warn('[LiveKitCallManager] Cannot start audio: Room does not exist yet.');
      return false;
    }
    try {
      await this.room.startAudio();
      const playbackResults = await Promise.all(
        [...this.remoteAudioElements.values()].flat().map((element) =>
          element.play().then(() => true).catch(() => false),
        ),
      );
      const isBlocked = !this.room.canPlaybackAudio || playbackResults.includes(false);
      this.setMediaState({ isAudioPlaybackBlocked: isBlocked });
      return !isBlocked;
    } catch (err) {
      console.warn('[LiveKitCallManager] Failed to start audio:', err);
      this.setMediaState({ isAudioPlaybackBlocked: true });
      return false;
    }
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
        this.remoteAudioElements.forEach((elements) => {
          elements.forEach((element) => element.remove());
        });
        this.remoteAudioElements.clear();

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

    if (typeof document !== "undefined") {
      const container = document.getElementById("livekit-audio-container");
      if (container) {
        container.innerHTML = "";
      }
    }

    this.setMediaState({
      isMicEnabled: false,
      isCameraEnabled: false,
      hasMicError: false,
      hasCameraError: false,
      mediaErrorMessage: null,
      isAudioPlaybackBlocked: false,
      isLocalSpeaking: false,
      isRemoteSpeaking: false,
      isSpeakerEnabled: false,
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

