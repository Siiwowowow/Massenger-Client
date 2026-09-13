/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/communication/hooks/use-messages.ts
"use client";

import { useEffect, useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { communicationService } from "../services/communication.service";
import { socketClient } from "../socket/socket-client";
import { REALTIME_EVENTS } from "../socket/socket-events";
import {
  IMessage,
  PaginatedMessages,
  IPresence,
  ConversationJoinSuccessData,
  RealtimeAckResponse,
} from "../types/communication.types";

interface UseMessagesProps {
  conversationId: string | null;
  currentUserId?: string;
  onPresenceSnapshot?: (presences: IPresence[]) => void;
  onForbidden?: () => void;
}

export function useMessages({
  conversationId,
  currentUserId,
  onPresenceSnapshot,
  onForbidden,
}: UseMessagesProps) {
  const queryClient = useQueryClient();

  // 1. Infinite query for message history with cursor pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
  } = useInfiniteQuery<PaginatedMessages, Error, InfiniteData<PaginatedMessages>, (string | null)[], string | undefined>({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      const page = await communicationService.getMessages(conversationId, {
        limit: 30,
        cursor: pageParam,
      });

      // Keep locally sending messages visible while a polling response catches up.
      if (pageParam !== undefined) return page;

      const cached = queryClient.getQueryData<InfiniteData<PaginatedMessages>>([
        "messages",
        conversationId,
      ]);
      const serverKeys = new Set(
        page.items.flatMap((message) => [message.id, message.clientMessageId].filter(Boolean))
      );
      const pendingMessages = cached?.pages
        .flatMap((cachedPage) => cachedPage.items)
        .filter(
          (message) =>
            message.isSending &&
            Boolean(message.clientMessageId) &&
            !serverKeys.has(message.clientMessageId as string)
        ) ?? [];

      return pendingMessages.length
        ? { ...page, items: [...page.items, ...pendingMessages] }
        : page;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined),
    enabled: Boolean(conversationId),
    staleTime: 30000,
    // Vercel serverless deployments cannot keep a Socket.IO connection alive.
    // Keep the REST fallback fast enough for messages to appear without reload.
    refetchInterval: conversationId ? 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, err: any) => {
      if (
        err?.status === 403 ||
        err?.statusCode === 403 ||
        err?.status === 404 ||
        err?.statusCode === 404
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Handle unauthorized/forbidden conversation query response
  useEffect(() => {
    if (isError && error) {
      const status = (error as any)?.status || (error as any)?.statusCode;
      const msg = (error as any)?.message || "";
      if (
        status === 403 ||
        status === 404 ||
        msg.toLowerCase().includes("not a member") ||
        msg.toLowerCase().includes("forbidden")
      ) {
        onForbidden?.();
      }
    }
  }, [isError, error, onForbidden]);

  // Flatten messages from infinite pages (oldest to newest)
  const messages: IMessage[] = useMemo(() => {
    if (!data?.pages) return [];
    // Each page items array is ordered chronological (oldest to newest)
    // When paginating backwards with nextCursor, older pages are fetched later
    const allItems: IMessage[] = [];
    const seen = new Set<string>();

    // Pages are fetched: [Page 1 (newest window), Page 2 (older), Page 3 (even older)]
    // To present oldest -> newest, reverse pages order then concat items
    const reversedPages = [...data.pages].reverse();
    for (const page of reversedPages) {
      for (const msg of page.items) {
        const key = msg.clientMessageId || msg.id;
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(msg);
        }
      }
    }
    return allItems;
  }, [data]);

  // 2. Join and leave conversation room via socket
  useEffect(() => {
    if (!conversationId) return;

    const socket = socketClient.getSocket();
    if (!socket) return;

    // A. Join the active conversation room
    socket.emit(REALTIME_EVENTS.CLIENT.CONVERSATION_JOIN, {
      conversationId,
    });

    // B. Handle join success and presence snapshot
    const handleJoinSuccess = (payload: ConversationJoinSuccessData) => {
      if (payload.conversationId === conversationId && payload.presence) {
        onPresenceSnapshot?.(payload.presence);
      }
    };

    // Handle join forbidden / authorization rejection
    const handleJoinError = (err: any) => {
      const code = err?.error?.code || err?.code;
      const msg = err?.error?.message || err?.message || "";
      if (
        code === "FORBIDDEN" ||
        code === "NOT_FOUND" ||
        msg.toLowerCase().includes("not a member") ||
        msg.toLowerCase().includes("forbidden")
      ) {
        onForbidden?.();
      }
    };

    socket.on(REALTIME_EVENTS.SERVER.CONVERSATION_JOIN_SUCCESS, handleJoinSuccess);
    socket.on(REALTIME_EVENTS.SERVER.CONVERSATION_JOIN_ERROR, handleJoinError);

    // C. Mark conversation as read on entry (realtime socket + REST persistence)
    socket.emit(REALTIME_EVENTS.CLIENT.CONVERSATION_READ, {
      conversationId,
    });
    communicationService.markConversationAsRead(conversationId).catch(() => {});

    // D. Cleanup: leave room and unsubscribe
    return () => {
      socket.emit(REALTIME_EVENTS.CLIENT.CONVERSATION_LEAVE, {
        conversationId,
      });
      socket.off(REALTIME_EVENTS.SERVER.CONVERSATION_JOIN_SUCCESS, handleJoinSuccess);
      socket.off(REALTIME_EVENTS.SERVER.CONVERSATION_JOIN_ERROR, handleJoinError);
    };
  }, [conversationId, onPresenceSnapshot, onForbidden]);

  // 3. Realtime message listeners
  useEffect(() => {
    if (!conversationId) return;

    const socket = socketClient.getSocket();
    if (!socket) return;

    // New Message Received
    const handleNewMessage = (rawMsg: IMessage) => {
      if (rawMsg.conversationId !== conversationId) return;

      const metadata = rawMsg.metadata as Record<string, unknown> | null | undefined;
      const clientMessageId =
        rawMsg.clientMessageId ||
        (typeof metadata?.clientMessageId === "string" ? metadata.clientMessageId : undefined);
      const newMsg: IMessage = {
        ...rawMsg,
        clientMessageId,
      };

      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old || !old.pages.length) {
            return {
              pageParams: [undefined],
              pages: [{ items: [newMsg], nextCursor: null, hasMore: false }],
            };
          }

          // Check if message already exists by id or clientMessageId
          let alreadyExists = false;
          const updatedPages = old.pages.map((page, pageIdx) => {
            // Check if replacing an optimistic message
            const hasOptimistic = page.items.some(
              (m) =>
                (clientMessageId && m.clientMessageId === clientMessageId) ||
                m.id === newMsg.id
            );

            if (hasOptimistic) {
              alreadyExists = true;
              return {
                ...page,
                items: page.items.map((m) =>
                  (clientMessageId && m.clientMessageId === clientMessageId) ||
                  m.id === newMsg.id
                    ? newMsg
                    : m
                ),
              };
            }

            // Append to the first page (newest window) if not already added
            if (pageIdx === 0 && !alreadyExists) {
              return {
                ...page,
                items: [...page.items, newMsg],
              };
            }
            return page;
          });

          return {
            ...old,
            pages: updatedPages,
          };
        }
      );

      // If message is from another user and user is viewing this conversation, auto-read
      if (newMsg.senderId !== currentUserId) {
        socket.emit(REALTIME_EVENTS.CLIENT.MESSAGE_DELIVERED, {
          messageId: newMsg.id,
        });
        socket.emit(REALTIME_EVENTS.CLIENT.MESSAGE_READ, {
          messageId: newMsg.id,
        });
        socket.emit(REALTIME_EVENTS.CLIENT.CONVERSATION_READ, {
          conversationId,
          messageId: newMsg.id,
        });
      }
    };

    // Message Updated (Edit)
    const handleMessageUpdated = (updatedMsg: IMessage) => {
      if (updatedMsg.conversationId !== conversationId) return;

      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
              ),
            })),
          };
        }
      );
    };

    // Message Deleted (Soft delete)
    const handleMessageDeleted = (payload: {
      messageId: string;
      conversationId: string;
      deletedAt: string;
    }) => {
      if (payload.conversationId !== conversationId) return;

      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === payload.messageId
                  ? { ...m, deletedAt: payload.deletedAt, content: null }
                  : m
              ),
            })),
          };
        }
      );
    };

    // Delivery Updated
    const handleDeliveryUpdated = (payload: {
      messageId: string;
      userId: string;
      deliveredAt: string;
      conversationId: string;
    }) => {
      if (payload.conversationId !== conversationId) return;

      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) => {
                if (m.id === payload.messageId) {
                  const receipts = m.receipts || [];
                  const existingIdx = receipts.findIndex((r) => r.userId === payload.userId);
                  const updatedReceipts = [...receipts];
                  if (existingIdx >= 0) {
                    updatedReceipts[existingIdx] = {
                      ...updatedReceipts[existingIdx],
                      deliveredAt: payload.deliveredAt,
                    };
                  } else {
                    updatedReceipts.push({
                      messageId: payload.messageId,
                      userId: payload.userId,
                      deliveredAt: payload.deliveredAt,
                    });
                  }
                  return { ...m, receipts: updatedReceipts };
                }
                return m;
              }),
            })),
          };
        }
      );
    };

    // Read Updated
    const handleReadUpdated = (payload: {
      messageId: string;
      userId: string;
      readAt: string;
      deliveredAt?: string;
      conversationId: string;
    }) => {
      if (payload.conversationId !== conversationId) return;

      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) => {
                if (m.id === payload.messageId) {
                  const receipts = m.receipts || [];
                  const existingIdx = receipts.findIndex((r) => r.userId === payload.userId);
                  const updatedReceipts = [...receipts];
                  if (existingIdx >= 0) {
                    updatedReceipts[existingIdx] = {
                      ...updatedReceipts[existingIdx],
                      readAt: payload.readAt,
                    };
                  } else {
                    updatedReceipts.push({
                      messageId: payload.messageId,
                      userId: payload.userId,
                      readAt: payload.readAt,
                      deliveredAt: payload.deliveredAt,
                    });
                  }
                  return { ...m, receipts: updatedReceipts };
                }
                return m;
              }),
            })),
          };
        }
      );
    };

    // Bulk Conversation Read Updated
    const handleConversationReadUpdated = (payload: {
      conversationId: string;
      userId: string;
      markedCount?: number;
      lastReadMessageId?: string;
      readAt?: string;
    }) => {
      if (!payload || payload.conversationId !== conversationId) return;

      // When another user reads the conversation, update read receipts for all our sent messages
      if (payload.userId !== currentUserId) {
        const readAtTimestamp = payload.readAt || new Date().toISOString();
        queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
          ["messages", conversationId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((m) => {
                  if (m.senderId === currentUserId) {
                    const receipts = m.receipts || [];
                    const existingIdx = receipts.findIndex(
                      (r) => r.userId === payload.userId
                    );
                    const updatedReceipts = [...receipts];
                    if (existingIdx >= 0) {
                      updatedReceipts[existingIdx] = {
                        ...updatedReceipts[existingIdx],
                        readAt: readAtTimestamp,
                      };
                    } else {
                      updatedReceipts.push({
                        messageId: m.id,
                        userId: payload.userId,
                        readAt: readAtTimestamp,
                        deliveredAt: readAtTimestamp,
                      });
                    }
                    return { ...m, status: "READ", receipts: updatedReceipts };
                  }
                  return m;
                }),
              })),
            };
          }
        );
      }
    };

    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_NEW, handleNewMessage);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_DELETED, handleMessageDeleted);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_DELIVERY_UPDATED, handleDeliveryUpdated);
    socket.on(REALTIME_EVENTS.SERVER.MESSAGE_READ_UPDATED, handleReadUpdated);
    socket.on(
      REALTIME_EVENTS.SERVER.CONVERSATION_READ_UPDATED,
      handleConversationReadUpdated
    );

    return () => {
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_NEW, handleNewMessage);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_DELETED, handleMessageDeleted);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_DELIVERY_UPDATED, handleDeliveryUpdated);
      socket.off(REALTIME_EVENTS.SERVER.MESSAGE_READ_UPDATED, handleReadUpdated);
      socket.off(
        REALTIME_EVENTS.SERVER.CONVERSATION_READ_UPDATED,
        handleConversationReadUpdated
      );
    };
  }, [conversationId, currentUserId, queryClient]);

  // 4. Send Message (Optimistic UI + clientMessageId)
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;

      const clientMessageId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const optimisticMessage: IMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: currentUserId || "me",
        type: "TEXT",
        content: content.trim(),
        status: "SENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSending: true,
      };

      // Add optimistic message to cache
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        ["messages", conversationId],
        (old) => {
          if (!old || !old.pages.length) {
            return {
              pageParams: [undefined],
              pages: [{ items: [optimisticMessage], nextCursor: null, hasMore: false }],
            };
          }
          const updatedPages = [...old.pages];
          updatedPages[0] = {
            ...updatedPages[0],
            items: [...updatedPages[0].items, optimisticMessage],
          };
          return {
            ...old,
            pages: updatedPages,
          };
        }
      );

      const socket = socketClient.getSocket();
      try {
        if (socket && socket.connected) {
          // Send via Socket.IO
          const ack = await socketClient.emitWithAck<RealtimeAckResponse<IMessage>>(
            REALTIME_EVENTS.CLIENT.MESSAGE_SEND,
            {
              conversationId,
              content: content.trim(),
              type: "TEXT",
              clientMessageId,
            }
          );

          if (!ack?.success) {
            throw new Error(
              typeof ack?.error?.message === "string"
                ? ack.error.message
                : "Message was not sent"
            );
          }

          const sentMessage = ack.data;
          queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
            ["messages", conversationId],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((message) =>
                    message.clientMessageId === clientMessageId
                      ? sentMessage ?? { ...message, isSending: false, status: "SENT" }
                      : message
                  ),
                })),
              };
            }
          );
        } else {
          // Fallback to REST
          const sent = await communicationService.sendMessage(conversationId, {
            content: content.trim(),
            clientMessageId,
          });

          // Reconcile optimistic message
          queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
            ["messages", conversationId],
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((m) =>
                    m.clientMessageId === clientMessageId ? sent : m
                  ),
                })),
              };
            }
          );
        }
      } catch (err) {
        console.error("[Communication] Error sending message:", err);
        // Mark optimistic message as failed
        queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
          ["messages", conversationId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((m) =>
                  m.clientMessageId === clientMessageId
                    ? { ...m, isSending: false, sendFailed: true }
                    : m
                ),
              })),
            };
          }
        );
      }
    },
    [conversationId, currentUserId, queryClient]
  );

  // 5. Edit Message
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const socket = socketClient.getSocket();
      if (socket && socket.connected) {
        await socketClient.emitWithAck(REALTIME_EVENTS.CLIENT.MESSAGE_EDIT, {
          messageId,
          content: newContent.trim(),
        });
      } else {
        await communicationService.editMessage(messageId, newContent.trim());
      }
    },
    []
  );

  // 6. Delete Message
  const deleteMessage = useCallback(async (messageId: string) => {
    const socket = socketClient.getSocket();
    if (socket && socket.connected) {
      await socketClient.emitWithAck(REALTIME_EVENTS.CLIENT.MESSAGE_DELETE, {
        messageId,
      });
    } else {
      await communicationService.deleteMessage(messageId);
    }
  }, []);

  return {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
