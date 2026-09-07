// src/features/communication/hooks/use-typing.ts
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { socketClient } from "../socket/socket-client";
import { REALTIME_EVENTS } from "../socket/socket-events";

export interface TypingParticipant {
  conversationId: string;
  userId: string;
}

interface StoredTypingUser {
  userId: string;
  lastUpdated: number;
}

export function useTyping(activeConversationId: string | null, currentUserId?: string) {
  const [typingMap, setTypingMap] = useState<Record<string, StoredTypingUser[]>>({});
  const lastEmitTimeRef = useRef<number>(0);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing events from server across conversations
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleTypingStarted = (payload: { conversationId: string; userId: string }) => {
      if (!payload || !payload.conversationId || !payload.userId) return;
      if (payload.userId === currentUserId) return;

      setTypingMap((prev) => {
        const currentList = prev[payload.conversationId] || [];
        const existingIdx = currentList.findIndex((u) => u.userId === payload.userId);
        const now = Date.now();

        if (existingIdx >= 0) {
          const updated = [...currentList];
          updated[existingIdx] = { userId: payload.userId, lastUpdated: now };
          return { ...prev, [payload.conversationId]: updated };
        }

        return {
          ...prev,
          [payload.conversationId]: [
            ...currentList,
            { userId: payload.userId, lastUpdated: now },
          ],
        };
      });
    };

    const handleTypingStopped = (payload: { conversationId: string; userId: string }) => {
      if (!payload || !payload.conversationId || !payload.userId) return;

      setTypingMap((prev) => {
        const currentList = prev[payload.conversationId];
        if (!currentList || !currentList.length) return prev;

        const filtered = currentList.filter((u) => u.userId !== payload.userId);
        return {
          ...prev,
          [payload.conversationId]: filtered,
        };
      });
    };

    socket.on(REALTIME_EVENTS.SERVER.TYPING_STARTED, handleTypingStarted);
    socket.on(REALTIME_EVENTS.SERVER.TYPING_STOPPED, handleTypingStopped);

    return () => {
      socket.off(REALTIME_EVENTS.SERVER.TYPING_STARTED, handleTypingStarted);
      socket.off(REALTIME_EVENTS.SERVER.TYPING_STOPPED, handleTypingStopped);
    };
  }, [currentUserId]);

  // Periodic cleanup for stale typing state (> 5s without update)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingMap((prev) => {
        let hasChanges = false;
        const next: Record<string, StoredTypingUser[]> = {};

        for (const [convId, users] of Object.entries(prev)) {
          const activeUsers = users.filter((u) => now - u.lastUpdated < 5000);
          if (activeUsers.length !== users.length) {
            hasChanges = true;
          }
          if (activeUsers.length > 0) {
            next[convId] = activeUsers;
          }
        }

        return hasChanges ? next : prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Emit typing stop helper
  const emitStopTyping = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    const socket = socketClient.getSocket();
    if (socket && socket.connected && activeConversationId) {
      socket.emit(REALTIME_EVENTS.CLIENT.TYPING_STOP, {
        conversationId: activeConversationId,
      });
    }
    lastEmitTimeRef.current = 0;
  }, [activeConversationId]);

  // Handle client keystroke typing emission
  const handleUserTyping = useCallback(
    (inputValue: string) => {
      if (!activeConversationId) return;

      if (!inputValue || !inputValue.trim()) {
        emitStopTyping();
        return;
      }

      const socket = socketClient.getSocket();
      if (!socket || !socket.connected) return;

      const now = Date.now();
      // Throttle: emit typing:start at most once every 3000ms
      if (now - lastEmitTimeRef.current > 3000) {
        socket.emit(REALTIME_EVENTS.CLIENT.TYPING_START, {
          conversationId: activeConversationId,
        });
        lastEmitTimeRef.current = now;
      }

      // Reset inactivity timeout (auto stop typing after 2.5s of no key presses)
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }

      stopTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
      }, 2500);
    },
    [activeConversationId, emitStopTyping]
  );

  // Clean up typing state when active conversation changes or on unmount
  useEffect(() => {
    return () => {
      emitStopTyping();
    };
  }, [emitStopTyping]);

  const activeTypingUsers: TypingParticipant[] =
    activeConversationId && typingMap[activeConversationId]
      ? typingMap[activeConversationId].map((u) => ({
          conversationId: activeConversationId,
          userId: u.userId,
        }))
      : [];

  const isConversationTyping = useCallback(
    (conversationId: string): boolean => {
      const users = typingMap[conversationId];
      return Boolean(users && users.length > 0);
    },
    [typingMap]
  );

  return {
    typingUsers: activeTypingUsers,
    isPartnerTyping: activeTypingUsers.length > 0,
    isConversationTyping,
    handleUserTyping,
    emitStopTyping,
  };
}
