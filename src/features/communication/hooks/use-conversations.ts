// src/features/communication/hooks/use-conversations.ts
"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communicationService } from "../services/communication.service";
import { socketClient } from "../socket/socket-client";
import { REALTIME_EVENTS } from "../socket/socket-events";
import {
  IConversation,
  IMessage,
  PaginatedConversations,
} from "../types/communication.types";
import { useAppSelector } from "@/lib/redux/hooks";

export function useConversations(currentUserId?: string, searchQuery?: string) {
  const queryClient = useQueryClient();
  const activeConversationId = useAppSelector(
    (state) => state.communication.activeConversationId
  );

  const cleanSearch = searchQuery?.trim() || "";

  // 1. Fetch conversations list (with debounced backend search support)
  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedConversations>({
    queryKey: ["conversations", { search: cleanSearch }],
    queryFn: () =>
      communicationService.getConversations({
        search: cleanSearch || undefined,
        limit: 50,
      }),
    staleTime: 30000,
  });

  // 2. Fetch unread counts map
  const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["conversations", "unread-counts"],
    queryFn: () => communicationService.getUnreadCounts(),
    staleTime: 30000,
  });

  // Optimistically clear unread count when conversation becomes active
  useEffect(() => {
    if (activeConversationId) {
      queryClient.setQueryData<Record<string, number>>(
        ["conversations", "unread-counts"],
        (old = {}) => ({
          ...old,
          [activeConversationId]: 0,
        })
      );
    }
  }, [activeConversationId, queryClient]);

  // 3. Realtime updates for conversation list & unread counts
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleNewMessage = (message: IMessage) => {
      if (!message || !message.conversationId) return;

      // Update conversations query cache across all conversations queries
      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old || !old.data) return old;

          const existingIndex = old.data.findIndex((c) => c.id === message.conversationId);
          let updatedList: IConversation[];

          if (existingIndex >= 0) {
            const target = { ...old.data[existingIndex] };
            target.lastMessageAt = message.createdAt;
            target.lastMessagePreview = message.deletedAt ? "Message was deleted" : message.content;
            target.updatedAt = message.createdAt;

            target.lastMessageSenderId = message.senderId;
            target.lastMessageStatus =
              message.senderId === currentUserId
                ? message.isSending
                  ? "sending"
                  : message.status?.toLowerCase() || "sent"
                : null;

            // Move updated conversation to top
            updatedList = [
              target,
              ...old.data.filter((_, idx) => idx !== existingIndex),
            ];
          } else {
            // If not present in page, refetch
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            return old;
          }

          return {
            ...old,
            data: updatedList,
          };
        }
      );

      // Update unread count if received from someone else and not in active view
      const isFromOther = message.senderId !== currentUserId;
      const isNotActive = message.conversationId !== activeConversationId;

      if (isFromOther && isNotActive) {
        queryClient.setQueryData<Record<string, number>>(
          ["conversations", "unread-counts"],
          (old = {}) => ({
            ...old,
            [message.conversationId]: (old[message.conversationId] || 0) + 1,
          })
        );
      }
    };

    const handleMessageUpdated = (updatedMsg: IMessage) => {
      if (!updatedMsg || !updatedMsg.conversationId) return;

      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((c) => {
              if (c.id === updatedMsg.conversationId) {
                return {
                  ...c,
                  lastMessagePreview: updatedMsg.deletedAt ? "Message was deleted" : updatedMsg.content,
                };
              }
              return c;
            }),
          };
        }
      );
    };

    const handleMessageDeleted = (payload: {
      messageId: string;
      conversationId: string;
      deletedAt: string;
    }) => {
      if (!payload || !payload.conversationId) return;

      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((c) => {
              if (c.id === payload.conversationId) {
                return {
                  ...c,
                  lastMessagePreview: "Message was deleted",
                };
              }
              return c;
            }),
          };
        }
      );
    };

    const handleDeliveryUpdated = (payload: {
      messageId: string;
      userId: string;
      deliveredAt: string;
      conversationId: string;
    }) => {
      if (!payload || !payload.conversationId) return;

      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((c) => {
              if (
                c.id === payload.conversationId &&
                c.lastMessageSenderId === currentUserId
              ) {
                if (c.lastMessageStatus !== "read") {
                  return { ...c, lastMessageStatus: "delivered" };
                }
              }
              return c;
            }),
          };
        }
      );
    };

    const handleReadUpdated = (payload: {
      messageId: string;
      userId: string;
      readAt: string;
      conversationId: string;
    }) => {
      if (!payload || !payload.conversationId) return;

      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: old.data.map((c) => {
              if (
                c.id === payload.conversationId &&
                c.lastMessageSenderId === currentUserId
              ) {
                return { ...c, lastMessageStatus: "read" };
              }
              return c;
            }),
          };
        }
      );
    };

    const handleConversationReadUpdated = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      if (!payload || !payload.conversationId) return;

      if (payload.userId === currentUserId) {
        queryClient.setQueryData<Record<string, number>>(
          ["conversations", "unread-counts"],
          (old = {}) => ({
            ...old,
            [payload.conversationId]: 0,
          })
        );
      } else {
        // Other participant read our messages in this conversation
        queryClient.setQueriesData<PaginatedConversations>(
          { queryKey: ["conversations"] },
          (old) => {
            if (!old || !old.data) return old;
            return {
              ...old,
              data: old.data.map((c) => {
                if (
                  c.id === payload.conversationId &&
                  c.lastMessageSenderId === currentUserId
                ) {
                  return { ...c, lastMessageStatus: "read" };
                }
                return c;
              }),
            };
          }
        );
      }
    };

    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_NEW, handleNewMessage);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_DELETED, handleMessageDeleted);
    socket.on(
      REALTIME_EVENTS.SERVER.MESSAGE_DELIVERY_UPDATED,
      handleDeliveryUpdated
    );
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_READ_UPDATED, handleReadUpdated);
    socket.on(
      REALTIME_EVENTS.SERVER.CONVERSATION_READ_UPDATED,
      handleConversationReadUpdated
    );

    return () => {
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_NEW, handleNewMessage);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_DELETED, handleMessageDeleted);
      socket.off(
        REALTIME_EVENTS.SERVER.MESSAGE_DELIVERY_UPDATED,
        handleDeliveryUpdated
      );
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_READ_UPDATED, handleReadUpdated);
      socket.off(
        REALTIME_EVENTS.SERVER.CONVERSATION_READ_UPDATED,
        handleConversationReadUpdated
      );
    };
  }, [queryClient, currentUserId, activeConversationId]);

  // 4. Create direct conversation mutation
  const createDirectMutation = useMutation({
    mutationFn: (participantId: string) =>
      communicationService.createDirectConversation({ participantId }),
    onSuccess: (newConv) => {
      queryClient.setQueriesData<PaginatedConversations>(
        { queryKey: ["conversations"] },
        (old) => {
          if (!old) {
            return {
              data: [newConv],
              meta: {
                page: 1,
                limit: 50,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            };
          }
          const exists = old.data.some((c) => c.id === newConv.id);
          if (exists) return old;
          return {
            ...old,
            data: [newConv, ...old.data],
          };
        }
      );
      // Invalidate to guarantee full sync with backend
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const conversations: IConversation[] = useMemo(() => {
    return (paginatedData?.data || []).map((conv) => ({
      ...conv,
      unreadCount: unreadCounts[conv.id] || 0,
    }));
  }, [paginatedData?.data, unreadCounts]);

  return {
    conversations,
    isLoading,
    isError,
    error,
    refetch,
    unreadCounts,
    createDirectConversation: createDirectMutation.mutateAsync,
    isCreatingDirect: createDirectMutation.isPending,
  };
}
