// src/features/communication/call/slices/callSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CallState,
  CallType,
  CallParticipantInfo,
  ActiveCallSession,
  CallIncomingPayload,
} from "../types/call.types";

export interface CallSliceState {
  callState: CallState;
  activeCall: ActiveCallSession | null;
  statusMessage: string | null;
  error: string | null;
}

const initialState: CallSliceState = {
  callState: "IDLE",
  activeCall: null,
  statusMessage: null,
  error: null,
};

export const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    initiateOutgoingCall: (
      state,
      action: PayloadAction<{
        conversationId: string;
        callType: CallType;
        receiver?: CallParticipantInfo | null;
      }>
    ) => {
      state.callState = "RINGING_OUTGOING";
      state.statusMessage = "Calling...";
      state.error = null;
      state.activeCall = {
        callId: null, // Will be updated as soon as backend returns ack/call:incoming
        conversationId: action.payload.conversationId,
        callType: action.payload.callType,
        caller: null,
        receiver: action.payload.receiver || null,
        statusText: "Calling...",
      };
    },

    setOutgoingRinging: (
      state,
      action: PayloadAction<{
        callId: string;
        conversationId?: string;
      }>
    ) => {
      if (state.activeCall) {
        state.activeCall.callId = action.payload.callId;
        if (action.payload.conversationId) {
          state.activeCall.conversationId = action.payload.conversationId;
        }
      }
      state.callState = "RINGING_OUTGOING";
      state.statusMessage = "Ringing...";
      if (state.activeCall) state.activeCall.statusText = "Ringing...";
    },

    setOutgoingCallId: (
      state,
      action: PayloadAction<{ callId: string; conversationId?: string }>
    ) => {
      if (state.activeCall) {
        state.activeCall.callId = action.payload.callId;
        if (action.payload.conversationId) {
          state.activeCall.conversationId = action.payload.conversationId;
        }
        state.activeCall.statusText = "Calling...";
      }
    },

    setIncomingCall: (state, action: PayloadAction<CallIncomingPayload>) => {
      state.callState = "RINGING_INCOMING";
      state.statusMessage = `${action.payload.caller.name} is calling you`;
      state.error = null;
      state.activeCall = {
        callId: action.payload.callId,
        conversationId: action.payload.conversationId,
        callType: action.payload.callType,
        caller: action.payload.caller,
        receiver: null,
        statusText: `${action.payload.caller.name} is calling you`,
      };
    },

    setCallAccepted: (
      state,
      action: PayloadAction<{
        callId: string;
        acceptedBy?: string;
      }>
    ) => {
      // Validate or assign active call id
      if (state.activeCall) {
        state.activeCall.callId = action.payload.callId;
        state.activeCall.startedAt = new Date().toISOString();
        state.activeCall.statusText = "Connected";
      }
      state.callState = "ACCEPTED";
      state.statusMessage = "Connecting...";
    },

    setCallRejected: (
      state,
      action: PayloadAction<{
        callId: string;
        reason?: string;
      }>
    ) => {
      state.callState = "REJECTED";
      state.statusMessage = action.payload.reason || "Call declined";
    },

    setCallCancelled: (
      state,
      action: PayloadAction<{
        callId: string;
      }>
    ) => {
      if (state.activeCall && !state.activeCall.callId) {
        state.activeCall.callId = action.payload.callId;
      }
      state.callState = "CANCELLED";
      state.statusMessage = "Call cancelled";
    },

    setCallEnded: (
      state,
      action: PayloadAction<{
        callId: string;
        reason?: string;
      }>
    ) => {
      state.callState = "ENDED";
      state.statusMessage =
        action.payload.reason === "TIMEOUT"
          ? "Call timed out"
          : "Call ended";
    },

    setCallBusy: (
      state,
      action: PayloadAction<{
        callId?: string;
        reason?: string;
      }>
    ) => {
      state.callState = "BUSY";
      state.statusMessage =
        action.payload.reason || "User is currently on another call.";
    },

    setCallError: (
      state,
      action: PayloadAction<{
        message: string;
        callId?: string;
      }>
    ) => {
      state.error = action.payload.message;
    },

    resetCallState: (state) => {
      state.callState = "IDLE";
      state.activeCall = null;
      state.statusMessage = null;
      state.error = null;
    },
  },
});

export const {
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
} = callSlice.actions;

export default callSlice.reducer;
