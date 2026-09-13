// src/features/communication/call/hooks/use-call-signaling.ts
"use client";

import { useEffect, useCallback, useRef } from "react";
import { socketClient } from "../../socket/socket-client";
import { REALTIME_EVENTS } from "../../socket/socket-events";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  initiateOutgoingCall,
  setOutgoingRinging,
  setOutgoingCallId,
  setIncomingCall,
  setCallAccepted,
  setCallRejected,
  setCallCancelled,
  setCallEnded,
  setCallBusy,
  setCallError,
  resetCallState,
} from "../slices/callSlice";
import {
  CallType,
  CallParticipantInfo,
  CallIncomingPayload,
  CallAcceptedPayload,
  CallRejectedPayload,
  CallCancelledPayload,
  CallEndedPayload,
  CallBusyPayload,
  CallErrorPayload,
} from "../types/call.types";
import { toast } from "sonner";
import { callService } from "../services/call.service";

export function useCallSignaling() {
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((state) => state.call.activeCall);
  const callState = useAppSelector((state) => state.call.callState);
  const connectionStatus = useAppSelector(
    (state) => state.communication.connectionStatus
  );

  // Keep a ref to activeCall to avoid re-subscribing socket listeners on every state change
  const activeCallRef = useRef(activeCall);
  const callStateRef = useRef(callState);

  useEffect(() => {
    activeCallRef.current = activeCall;
    callStateRef.current = callState;
  }, [activeCall, callState]);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const scheduleReset = useCallback((delayMs: number = 2000) => {
    clearAutoResetTimer();
    resetTimerRef.current = setTimeout(() => {
      dispatch(resetCallState());
      resetTimerRef.current = null;
    }, delayMs);
  }, [dispatch, clearAutoResetTimer]);

  // ============================================================================
  // Centralized Socket Event Listeners Lifecycle
  // Registered strictly once per mount and cleanly unbound on unmount
  // ============================================================================
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    // 1. INCOMING CALL
    const handleCallIncoming = (payload: CallIncomingPayload) => {
      clearAutoResetTimer();
      // If already in an active or ringing call, do not overwrite; backend handles busy logic
      if (callStateRef.current !== "IDLE") {
        return;
      }
      dispatch(setIncomingCall(payload));
    };

    // 2. CALL ACCEPTED
    const handleCallAccepted = (payload: CallAcceptedPayload) => {
      clearAutoResetTimer();
      const currentCall = activeCallRef.current;
      // If we are currently ringing (incoming or outgoing) for this call
      if (
        callStateRef.current === "RINGING_OUTGOING" ||
        callStateRef.current === "RINGING_INCOMING" ||
        currentCall?.callId === payload.callId
      ) {
        dispatch(
          setCallAccepted({
            callId: payload.callId,
            acceptedBy: payload.acceptedBy,
          })
        );
      }
    };

    // 3. CALL REJECTED
    const handleCallRejected = (payload: CallRejectedPayload) => {
      const currentCall = activeCallRef.current;
      if (
        callStateRef.current === "RINGING_OUTGOING" ||
        callStateRef.current === "RINGING_INCOMING" ||
        currentCall?.callId === payload.callId
      ) {
        dispatch(
          setCallRejected({
            callId: payload.callId,
            reason: payload.reason || "Call declined",
          })
        );
        scheduleReset(2500);
      }
    };

    // 4. CALL CANCELLED
    const handleCallCancelled = (payload: CallCancelledPayload) => {
      const currentCall = activeCallRef.current;
      if (
        callStateRef.current === "RINGING_INCOMING" ||
        currentCall?.callId === payload.callId
      ) {
        dispatch(setCallCancelled({ callId: payload.callId }));
        scheduleReset(2000);
      }
    };

    // 5. CALL ENDED
    const handleCallEnded = (payload: CallEndedPayload) => {
      const currentCall = activeCallRef.current;
      if (
        callStateRef.current !== "IDLE" ||
        currentCall?.callId === payload.callId
      ) {
        dispatch(
          setCallEnded({
            callId: payload.callId,
            reason: payload.reason,
          })
        );

        if (payload.reason === "TIMEOUT") {
          toast.info("Call timed out — no answer", { duration: 3000 });
        }

        scheduleReset(2500);
      }
    };

    // 6. CALL BUSY
    const handleCallBusy = (payload: CallBusyPayload) => {
      dispatch(
        setCallBusy({
          callId: payload.callId,
          reason: payload.reason || "User is currently on another call.",
        })
      );
      toast.warning("User is currently on another call.", { duration: 3500 });
      scheduleReset(3000);
    };

    // 7. CALL ERROR
    const handleCallError = (payload: CallErrorPayload) => {
      const msg = payload.message || "Unable to complete call.";
      dispatch(setCallError({ message: msg, callId: payload.callId }));
      toast.error(msg, { duration: 3500 });
      scheduleReset(2500);
    };

    // Register all event listeners
    socket.on(REALTIME_EVENTS.SERVER.CALL_INCOMING, handleCallIncoming);
    socket.on(REALTIME_EVENTS.SERVER.CALL_ACCEPTED, handleCallAccepted);
    socket.on(REALTIME_EVENTS.SERVER.CALL_REJECTED, handleCallRejected);
    socket.on(REALTIME_EVENTS.SERVER.CALL_CANCELLED, handleCallCancelled);
    socket.on(REALTIME_EVENTS.SERVER.CALL_ENDED, handleCallEnded);
    socket.on(REALTIME_EVENTS.SERVER.CALL_BUSY, handleCallBusy);
    socket.on(REALTIME_EVENTS.SERVER.CALL_ERROR, handleCallError);

    // Clean up all listeners strictly on unmount or socket change
    return () => {
      socket.off(REALTIME_EVENTS.SERVER.CALL_INCOMING, handleCallIncoming);
      socket.off(REALTIME_EVENTS.SERVER.CALL_ACCEPTED, handleCallAccepted);
      socket.off(REALTIME_EVENTS.SERVER.CALL_REJECTED, handleCallRejected);
      socket.off(REALTIME_EVENTS.SERVER.CALL_CANCELLED, handleCallCancelled);
      socket.off(REALTIME_EVENTS.SERVER.CALL_ENDED, handleCallEnded);
      socket.off(REALTIME_EVENTS.SERVER.CALL_BUSY, handleCallBusy);
      socket.off(REALTIME_EVENTS.SERVER.CALL_ERROR, handleCallError);
      clearAutoResetTimer();
    };
  }, [dispatch, clearAutoResetTimer, scheduleReset, connectionStatus]);

  // Move an offline call to Ringing when the receiver comes online.
  useEffect(() => {
    const currentCall = activeCall;
    const receiverId = currentCall?.receiver?.id;
    if (callState !== "RINGING_OUTGOING" || !currentCall?.callId || !receiverId) {
      return;
    }

    const checkReceiverPresence = async () => {
      if (callStateRef.current !== "RINGING_OUTGOING") return;
      const online = await callService.isUserOnline(receiverId);
      if (online && callStateRef.current === "RINGING_OUTGOING") {
        dispatch(
          setOutgoingRinging({
            callId: currentCall.callId!,
            conversationId: currentCall.conversationId || undefined,
          })
        );
      }
    };

    const interval = window.setInterval(checkReceiverPresence, 2000);
    return () => window.clearInterval(interval);
  }, [activeCall, callState, dispatch]);

  // ============================================================================
  // Outgoing Call Control Methods
  // ============================================================================

  /**
   * Start an outgoing AUDIO or VIDEO call
   */
  const startCall = useCallback(
    async (
      conversationId: string,
      callType: CallType,
      receiverInfo?: CallParticipantInfo | null
    ) => {
      if (callStateRef.current !== "IDLE") {
        toast.warning("You are already in a call or connecting.", { duration: 2500 });
        return;
      }

      clearAutoResetTimer();
      
      // Optimistically enter outgoing ringing state with callee details
      dispatch(
        initiateOutgoingCall({
          conversationId,
          callType,
          receiver: receiverInfo || null,
        })
      );

      try {
        const socketReady = await socketClient.waitForConnection();
        if (!socketReady) {
          const fallback = await callService.startCall({ conversationId, callType });
          if (fallback.isBusy) {
            dispatch(setCallBusy({ callId: fallback.callId, reason: "User is currently on another call." }));
            scheduleReset(3000);
            return;
          }
          if (fallback.callId) {
            dispatch(
              fallback.receiverOnline
                ? setOutgoingRinging({ callId: fallback.callId, conversationId })
                : setOutgoingCallId({ callId: fallback.callId, conversationId })
            );
          }
          return;
        }

        interface StartCallAck {
          success: boolean;
          data?: {
            callId: string;
            conversationId: string;
            status: string;
            busyUserId?: string;
            receiverOnline?: boolean;
          };
          error?: {
            code: string;
            message: string;
          };
        }

        const res = await socketClient.emitWithAck<StartCallAck>(
          REALTIME_EVENTS.CLIENT.CALL_START,
          { conversationId, callType },
          6000
        );

        if (res && res.success && res.data) {
          if (res.data.status === "BUSY") {
            dispatch(
              setCallBusy({
                callId: res.data.callId,
                reason: "User is currently on another call.",
              })
            );
            toast.warning("User is currently on another call.", { duration: 3500 });
            scheduleReset(3000);
            return;
          }

          dispatch(
            res.data.receiverOnline
              ? setOutgoingRinging({
                  callId: res.data.callId,
                  conversationId: res.data.conversationId,
                })
              : setOutgoingCallId({
                  callId: res.data.callId,
                  conversationId: res.data.conversationId,
                })
          );
        } else if (res && !res.success && res.error) {
          dispatch(setCallError({ message: res.error.message }));
          toast.error(res.error.message || "Unable to start call.");
          scheduleReset(2500);
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Call could not be connected.";
        console.warn("[CallSignaling] startCall error:", err);
        dispatch(setCallError({ message: errorMsg }));
        toast.error(errorMsg);
        scheduleReset(2500);
      }
    },
    [dispatch, clearAutoResetTimer, scheduleReset]
  );

  /**
   * Accept an incoming call
   */
  const acceptCall = useCallback(
    async (targetCallId?: string) => {
      const callId = targetCallId || activeCallRef.current?.callId;
      if (!callId) {
        console.warn("[CallSignaling] acceptCall called with missing callId");
        return;
      }

      clearAutoResetTimer();
            dispatch(setCallAccepted({ callId }));

      try {
        const socket = socketClient.getSocket();
        if (socket && socket.connected) {
          socket.emit(REALTIME_EVENTS.CLIENT.CALL_ACCEPT, { callId });
        }
      } catch (err) {
        console.error("[CallSignaling] acceptCall emit error:", err);
      }
    },
    [dispatch, clearAutoResetTimer]
  );

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(
    async (targetCallId?: string) => {
      const callId = targetCallId || activeCallRef.current?.callId;
      if (!callId) {
        dispatch(resetCallState());
        return;
      }

      dispatch(setCallRejected({ callId, reason: "Call declined" }));

      try {
        const socket = socketClient.getSocket();
        if (socket && socket.connected) {
          socket.emit(REALTIME_EVENTS.CLIENT.CALL_REJECT, { callId });
        }
      } catch (err) {
        console.error("[CallSignaling] rejectCall emit error:", err);
      }

      scheduleReset(500);
    },
    [dispatch, scheduleReset]
  );

  /**
   * Cancel an outgoing ringing call before pickup
   */
  const cancelCall = useCallback(
    async (targetCallId?: string) => {
      const callId = targetCallId || activeCallRef.current?.callId;

      dispatch(
        setCallCancelled({
          callId: callId || "pending",
        })
      );

      if (callId) {
        try {
          const socket = socketClient.getSocket();
          if (socket && socket.connected) {
            socket.emit(REALTIME_EVENTS.CLIENT.CALL_CANCEL, { callId });
          }
        } catch (err) {
          console.error("[CallSignaling] cancelCall emit error:", err);
        }
      }

      scheduleReset(500);
    },
    [dispatch, scheduleReset]
  );

  /**
   * End an active or accepted call
   */
  const endCall = useCallback(
    async (targetCallId?: string) => {
      const callId = targetCallId || activeCallRef.current?.callId;

      dispatch(
        setCallEnded({
          callId: callId || "active",
          reason: "NORMAL",
        })
      );

      if (callId) {
        try {
          const socket = socketClient.getSocket();
          if (socket && socket.connected) {
            socket.emit(REALTIME_EVENTS.CLIENT.CALL_END, { callId });
          }
        } catch (err) {
          console.error("[CallSignaling] endCall emit error:", err);
        }
      }

      scheduleReset(600);
    },
    [dispatch, scheduleReset]
  );

  return {
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    activeCall,
    callState,
  };
}
