/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/communication/services/communication.service.ts
import { httpClient } from "@/lib/axios/httpClient";
import {
  IConversation,
  IConversationParticipant,
  PaginatedConversations,
  PaginatedMessages,
  IMessage,
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  ICommunicationUser,
  IPresence,
  IMessageRequest,
  CreateMessageRequestDto,
} from "../types/communication.types";

export const communicationService = {
  // =========================================================================
  // 1. CONVERSATIONS
  // =========================================================================

  async getConversations(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedConversations> {
    const response = await httpClient.get<any>("/conversations", {
      params,
    });
    const raw = response.data;
    const list: IConversation[] = Array.isArray(raw) ? raw : raw?.data || [];
    const meta = response.meta || raw?.meta || {
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalItems: list.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    return { data: list, meta };
  },

  async getConversation(id: string): Promise<IConversation> {
    const response = await httpClient.get<any>(`/conversations/${id}`);
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async createDirectConversation(dto: CreateDirectConversationDto): Promise<IConversation> {
    const response = await httpClient.post<any>("/conversations/direct", dto);
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async createGroupConversation(dto: CreateGroupConversationDto): Promise<IConversation> {
    const response = await httpClient.post<any>("/conversations/group", dto);
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async getConversationParticipants(conversationId: string): Promise<IConversationParticipant[]> {
    const response = await httpClient.get<any>(
      `/conversations/${conversationId}/participants`
    );
    const raw = response.data;
    const list = Array.isArray(raw) ? raw : (raw as any)?.data || [];
    return list;
  },

  async getConversationPresence(conversationId: string): Promise<IPresence[]> {
    const response = await httpClient.get<any>(`/conversations/${conversationId}/presence`);
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw as any)?.data || [];
  },

  async leaveConversation(conversationId: string): Promise<{ message: string }> {
    const response = await httpClient.post<{ message: string }>(
      `/conversations/${conversationId}/leave`
    );
    return response.data;
  },

  // =========================================================================
  // 2. MESSAGES
  // =========================================================================

  async getMessages(
    conversationId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedMessages> {
    const response = await httpClient.get<any>(
      `/conversations/${conversationId}/messages`,
      { params }
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async sendMessage(
    conversationId: string,
    dto: { content: string; type?: string; clientMessageId?: string; metadata?: Record<string, unknown> }
  ): Promise<IMessage> {
    const response = await httpClient.post<any>(
      `/conversations/${conversationId}/messages`,
      dto
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async editMessage(messageId: string, content: string): Promise<IMessage> {
    const response = await httpClient.patch<any>(`/messages/${messageId}`, { content });
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async deleteMessage(messageId: string): Promise<{ messageId: string; conversationId?: string; deletedAt: string }> {
    const response = await httpClient.delete<any>(
      `/messages/${messageId}`
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  // =========================================================================
  // 3. RECEIPTS & UNREAD COUNTS
  // =========================================================================

  async markDelivered(messageId: string): Promise<{ messageId: string; userId: string; deliveredAt: string; conversationId?: string }> {
    const response = await httpClient.post<any>(`/messages/${messageId}/delivered`);
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async markRead(messageId: string): Promise<{ messageId: string; userId: string; readAt: string; deliveredAt?: string; conversationId?: string }> {
    const response = await httpClient.post<any>(`/messages/${messageId}/read`);
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async markConversationAsRead(
    conversationId: string,
    messageId?: string
  ): Promise<{ markedCount: number; lastReadMessageId?: string }> {
    const response = await httpClient.post<any>(
      `/conversations/${conversationId}/read`,
      { messageId }
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async getUnreadCounts(): Promise<Record<string, number>> {
    const response = await httpClient.get<any>(
      "/conversations/unread-counts"
    );
    const raw = response.data;
    return (raw as any)?.data || raw || {};
  },

  // =========================================================================
  // 4. COMMUNICATION USERS
  // =========================================================================

  async syncCurrentUser(dto: {
    externalId: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
  }): Promise<ICommunicationUser> {
    const response = await httpClient.post<any>(
      "/communication-users/sync",
      dto
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async getCommunicationUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: ICommunicationUser[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await httpClient.get<any>(
      "/communication-users",
      { params }
    );
    const raw = response.data;
    const list: ICommunicationUser[] = Array.isArray(raw) ? raw : raw?.data || [];
    const meta = response.meta || raw?.meta || {
      page: params?.page || 1,
      limit: params?.limit || 20,
      total: list.length,
      totalPages: 1,
    };
    return { data: list, meta };
  },

  async getUserByExternalId(externalId: string): Promise<ICommunicationUser> {
    const response = await httpClient.get<any>(
      `/communication-users/${externalId}`
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async getUserPresence(userId: string): Promise<IPresence> {
    const response = await httpClient.get<any>(
      `/communication-users/${userId}/presence`
    );
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  // =========================================================================
  // 5. MESSAGE REQUESTS
  // =========================================================================

  async sendMessageRequest(dto: CreateMessageRequestDto, senderId?: string): Promise<IMessageRequest> {
    const response = await httpClient.post<any>("/message-requests", dto, {
      headers: senderId ? { "x-user-id": senderId } : undefined,
    });
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async getIncomingRequests(userId?: string): Promise<{ data: IMessageRequest[]; pendingCount: number }> {
    const response = await httpClient.get<any>("/message-requests/incoming", {
      headers: userId ? { "x-user-id": userId } : undefined,
    });
    const raw = response.data;
    return {
      data: Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [],
      pendingCount: raw?.pendingCount ?? (Array.isArray(raw?.data) ? raw.data.length : 0),
    };
  },

  async getOutgoingRequests(userId?: string): Promise<{ data: IMessageRequest[] }> {
    const response = await httpClient.get<any>("/message-requests/outgoing", {
      headers: userId ? { "x-user-id": userId } : undefined,
    });
    const raw = response.data;
    return {
      data: Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [],
    };
  },

  async acceptMessageRequest(requestId: string, userId?: string): Promise<{ request: IMessageRequest; conversation: IConversation }> {
    const response = await httpClient.patch<any>(`/message-requests/${requestId}/accept`, {}, {
      headers: userId ? { "x-user-id": userId } : undefined,
    });
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async rejectMessageRequest(requestId: string, userId?: string): Promise<IMessageRequest> {
    const response = await httpClient.patch<any>(`/message-requests/${requestId}/reject`, {}, {
      headers: userId ? { "x-user-id": userId } : undefined,
    });
    const raw = response.data;
    return (raw as any)?.data || raw;
  },

  async cancelMessageRequest(requestId: string, userId?: string): Promise<{ message: string; requestId: string }> {
    const response = await httpClient.delete<any>(`/message-requests/${requestId}`, {
      headers: userId ? { "x-user-id": userId } : undefined,
    });
    const raw = response.data;
    return (raw as any)?.data || raw;
  },
};
