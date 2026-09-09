// src/features/communication/call/types/call.types.ts

export type CallType = "AUDIO" | "VIDEO";

export type CallState =
  | "IDLE"
  | "RINGING_OUTGOING"
  | "RINGING_INCOMING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "ENDED"
  | "BUSY";

export type LiveKitConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING";

export interface CallMediaState {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  hasCameraError?: boolean;
  hasMicError?: boolean;
  mediaErrorMessage?: string | null;
}

export interface CallParticipantInfo {
  id?: string;
  externalId?: string;
  name: string;
  avatar?: string | null;
}

export interface ActiveCallSession {
  callId: string | null;
  conversationId: string | null;
  callType: CallType;
  caller: CallParticipantInfo | null;
  receiver: CallParticipantInfo | null;
  startedAt?: string;
  statusText?: string;
  error?: string | null;
}

export interface CallTokenResult {
  token: string;
  serverUrl: string;
  roomName: string;
}

// ============================================================================
// Socket.IO Payload Definitions (Matching Backend NestJS Gateway Contracts)
// ============================================================================

export interface CallStartPayload {
  conversationId: string;
  callType: CallType;
}

export interface CallAcceptPayload {
  callId: string;
}

export interface CallRejectPayload {
  callId: string;
}

export interface CallCancelPayload {
  callId: string;
}

export interface CallEndPayload {
  callId: string;
}

export interface CallIncomingPayload {
  callId: string;
  conversationId: string;
  caller: {
    id: string;
    externalId: string;
    name: string;
    avatar?: string | null;
  };
  callType: CallType;
}

export interface CallAcceptedPayload {
  callId: string;
  conversationId: string;
  acceptedBy: string;
}

export interface CallRejectedPayload {
  callId: string;
  conversationId: string;
  rejectedBy?: string;
  reason?: string;
}

export interface CallCancelledPayload {
  callId: string;
  conversationId: string;
  cancelledBy?: string;
}

export interface CallEndedPayload {
  callId: string;
  conversationId: string;
  endedBy?: string;
  reason?: "TIMEOUT" | "NORMAL" | "USER_HANGUP" | string;
}

export interface CallBusyPayload {
  callId: string;
  conversationId: string;
  userId?: string;
  reason?: string;
}

export interface CallErrorPayload {
  code?: string;
  message: string;
  callId?: string;
}
