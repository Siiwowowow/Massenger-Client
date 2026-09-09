// src/features/communication/call/hooks/use-call-state.ts
"use client";

import { useAppSelector } from "@/lib/redux/hooks";

export function useCallState() {
  const callState = useAppSelector((state) => state.call.callState);
  const activeCall = useAppSelector((state) => state.call.activeCall);
  const statusMessage = useAppSelector((state) => state.call.statusMessage);
  const error = useAppSelector((state) => state.call.error);

  const isIdle = callState === "IDLE";
  const isRingingOutgoing = callState === "RINGING_OUTGOING";
  const isRingingIncoming = callState === "RINGING_INCOMING";
  const isAccepted = callState === "ACCEPTED";
  const isBusy = callState === "BUSY";
  const isRejected = callState === "REJECTED";
  const isCancelled = callState === "CANCELLED";
  const isEnded = callState === "ENDED";

  const isInCall = isAccepted;
  const isCallActiveOrPending = !isIdle;

  return {
    callState,
    activeCall,
    statusMessage,
    error,
    isIdle,
    isRingingOutgoing,
    isRingingIncoming,
    isAccepted,
    isBusy,
    isRejected,
    isCancelled,
    isEnded,
    isInCall,
    isCallActiveOrPending,
  };
}
