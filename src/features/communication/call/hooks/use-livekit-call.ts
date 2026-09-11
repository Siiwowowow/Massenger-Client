// src/features/communication/call/hooks/use-livekit-call.ts
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Room } from "livekit-client";
import {
  ActiveCallSession,
  CallState,
  LiveKitConnectionState,
  CallMediaState,
} from "../types/call.types";
import { liveKitCallManager } from "../services/livekit-call-manager";

export interface UseLiveKitCallOptions {
  callState: CallState;
  activeCall: ActiveCallSession | null;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseLiveKitCallReturn {
  liveKitState: LiveKitConnectionState;
  room: Room | null;
  error: string | null;
  mediaState: CallMediaState;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  toggleMic: () => Promise<boolean>;
  toggleCamera: () => Promise<boolean>;
  switchCamera: () => Promise<boolean>;
  disconnect: () => void;
  startAudio: () => Promise<boolean>;
}

/**
 * useLiveKitCall Hook
 *
 * Connects React UI components with LiveKitCallManager.
 * Enforces separation of concerns:
 * - Socket.IO -> signaling
 * - LiveKitCallManager -> media room lifecycle & hardware tracks
 * - Redux -> application call state
 * - React components -> presentation
 */
export function useLiveKitCall({
  callState,
  activeCall,
  onDisconnected,
  onError,
}: UseLiveKitCallOptions): UseLiveKitCallReturn {
  const [liveKitState, setLiveKitState] = useState<LiveKitConnectionState>(
    () => liveKitCallManager.getConnectionState()
  );
  const [error, setError] = useState<string | null>(null);
  const [mediaState, setMediaState] = useState<CallMediaState>(
    () => liveKitCallManager.getMediaState()
  );

  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
  }, [onDisconnected, onError]);

  // Subscribe to manager state changes
  useEffect(() => {
    const unsubState = liveKitCallManager.onConnectionStateChange((state) => {
      setLiveKitState(state);
      if (state === "DISCONNECTED") {
        onDisconnectedRef.current?.();
      }
    });

    const unsubError = liveKitCallManager.onError((err) => {
      setError(err ? err.message : null);
      if (err) {
        onErrorRef.current?.(err);
      }
    });

    const unsubMedia = liveKitCallManager.onMediaStateChange((media) => {
      setMediaState(media);
    });

    return () => {
      unsubState();
      unsubError();
      unsubMedia();
    };
  }, []);

  // Drive connection from application call state
  useEffect(() => {
    const callId = activeCall?.callId;
    const conversationId = activeCall?.conversationId;
    const callType = activeCall?.callType;

    if (callState === "ACCEPTED" && callId && conversationId && callType) {
      liveKitCallManager.connect({
        callId,
        conversationId,
        callState,
        callType,
      });
    } else {
      // Clean disconnect whenever call is no longer ACCEPTED
      liveKitCallManager.disconnect();
    }
  }, [callState, activeCall?.callId, activeCall?.conversationId, activeCall?.callType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveKitCallManager.disconnect();
    };
  }, []);

  const toggleMic = useCallback(async () => {
    return liveKitCallManager.toggleMicrophone();
  }, []);

  const toggleCamera = useCallback(async () => {
    return liveKitCallManager.toggleCamera();
  }, []);

  const switchCamera = useCallback(async () => {
    return liveKitCallManager.switchCamera();
  }, []);

  const disconnect = useCallback(() => {
    liveKitCallManager.disconnect();
  }, []);

  const startAudio = useCallback(async () => {
    return liveKitCallManager.startAudio();
  }, []);

  return {
    liveKitState,
    room: liveKitCallManager.getRoom(),
    error,
    mediaState,
    isMicEnabled: mediaState.isMicEnabled,
    isCameraEnabled: mediaState.isCameraEnabled,
    toggleMic,
    toggleCamera,
    switchCamera,
    disconnect,
    startAudio,
  };
}

