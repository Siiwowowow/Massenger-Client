// src/features/communication/socket/socket-events.ts

export const REALTIME_EVENTS = {
  CLIENT: {
    CONVERSATION_JOIN: 'conversation:join',
    CONVERSATION_LEAVE: 'conversation:leave',
    MESSAGE_SEND: 'message:send',
    MESSAGE_EDIT: 'message:edit',
    MESSAGE_DELETE: 'message:delete',
    MESSAGE_DELIVERED: 'message:delivered',
    MESSAGE_READ: 'message:read',
    CONVERSATION_READ: 'conversation:read',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
  },
  SERVER: {
    MESSAGE_NEW: 'message:new',
    MESSAGE_UPDATED: 'message:updated',
    MESSAGE_DELETED: 'message:deleted',
    MESSAGE_DELIVERY_UPDATED: 'message:delivery_updated',
    MESSAGE_READ_UPDATED: 'message:read_updated',
    CONVERSATION_READ_UPDATED: 'conversation:read_updated',
    CONVERSATION_JOIN_SUCCESS: 'conversation:join:success',
    CONVERSATION_JOIN_ERROR: 'conversation:join:error',
    CONVERSATION_LEAVE_SUCCESS: 'conversation:leave:success',
    PRESENCE_ONLINE: 'presence:online',
    PRESENCE_OFFLINE: 'presence:offline',
    TYPING_STARTED: 'typing:started',
    TYPING_STOPPED: 'typing:stopped',
    SOCKET_ERROR: 'socket:error',
  },
} as const;

export type RealtimeClientEvent =
  (typeof REALTIME_EVENTS.CLIENT)[keyof typeof REALTIME_EVENTS.CLIENT];
export type RealtimeServerEvent =
  (typeof REALTIME_EVENTS.SERVER)[keyof typeof REALTIME_EVENTS.SERVER];
