// src/features/communication/types/communication.types.ts

export type ConversationType = "DIRECT" | "GROUP";
export type ParticipantRole = "MEMBER" | "ADMIN";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";

export interface ICommunicationUser {
  id: string;
  projectId: string;
  externalId: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  lastReadAt?: string | null;
  lastReadMessageId?: string | null;
  user: ICommunicationUser;
}

export interface IConversation {
  id: string;
  projectId: string;
  type: ConversationType;
  title?: string | null;
  avatar?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: IConversationParticipant[];
  unreadCount?: number;
  lastMessagePreview?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read" | string | null;
}

export interface IMessageReceipt {
  id?: string;
  messageId: string;
  userId: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  conversationId?: string;
}

export interface IMessage {
  status: string;
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    externalId: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
  type: MessageType;
  content: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  clientMessageId?: string;
  // Optimistic UI fields
  isSending?: boolean;
  sendFailed?: boolean;
  receipts?: IMessageReceipt[];
}

export interface IPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
}

export interface ITypingNotification {
  conversationId: string;
  userId: string;
}

export interface PaginatedMessages {
  items: IMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedConversations {
  data: IConversation[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateDirectConversationDto {
  participantId: string;
}

export interface CreateGroupConversationDto {
  title: string;
  participantIds: string[];
  avatar?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: MessageType;
  metadata?: Record<string, unknown>;
  clientMessageId?: string;
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
}

export interface DeleteMessagePayload {
  messageId: string;
}

export interface MarkDeliveredPayload {
  messageId: string;
}

export interface MarkReadPayload {
  messageId: string;
}

export interface BulkConversationReadPayload {
  conversationId: string;
  messageId?: string;
}

export interface ConversationJoinSuccessData {
  conversationId: string;
  presence: IPresence[];
}

export interface RealtimeAckResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface IMessageRequest {
  id: string;
  projectId: string;
  senderId: string;
  receiverId: string;
  status: RequestStatus;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: ICommunicationUser;
  receiver?: ICommunicationUser;
}

export interface CreateMessageRequestDto {
  receiverId: string;
  message?: string;
}

