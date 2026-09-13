// src/features/communication/hooks/use-presence.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { socketClient } from "../socket/socket-client";
import { REALTIME_EVENTS } from "../socket/socket-events";
import { IPresence, IConversation } from "../types/communication.types";
import { communicationService } from "../services/communication.service";

export function usePresence() {
  const [presenceMap, setPresenceMap] = useState<Record<string, IPresence>>({});

  // Helper to ingest snapshots of presence
  const ingestPresenceSnapshot = useCallback((presences: IPresence[]) => {
    if (!presences || !Array.isArray(presences)) return;

    setPresenceMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of presences) {
        if (p && p.userId) {
          const current = prev[p.userId];
          const isOnline = Boolean(p.isOnline);
          const lastSeenAt = p.lastSeenAt || null;
          if (!current || current.isOnline !== isOnline || current.lastSeenAt !== lastSeenAt) {
            next[p.userId] = {
              userId: p.userId,
              isOnline,
              lastSeenAt,
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Helper to seed initial presence from conversation participants loaded via REST
  const seedFromConversations = useCallback((conversations: IConversation[]) => {
    if (!conversations || !Array.isArray(conversations)) return;

    setPresenceMap((prev) => {
      const next = { ...prev };
      let updated = false;

      for (const conv of conversations) {
        if (!conv.participants) continue;
        for (const p of conv.participants) {
          if (typeof p !== "string" && p.user && p.user.id) {
            // If user presence not already in map, seed from DB state
            if (!next[p.user.id]) {
              next[p.user.id] = {
                userId: p.user.id,
                isOnline: Boolean(p.user.isOnline),
                lastSeenAt: p.user.lastSeenAt || null,
              };
              updated = true;
            }
          }
        }
      }

      return updated ? next : prev;
    });
  }, []);

  // Fetch presence from backend for a specific user
  const fetchUserPresence = useCallback(async (userId: string) => {
    try {
      const presence = await communicationService.getUserPresence(userId);
      if (presence && presence.userId) {
        setPresenceMap((prev) => ({
          ...prev,
          [presence.userId]: presence,
        }));
      }
      return presence;
    } catch {
      return null;
    }
  }, []);

  // Fetch presence snapshot from backend for a specific conversation
  const fetchConversationPresence = useCallback(
    async (conversationId: string) => {
      try {
        const presences = await communicationService.getConversationPresence(
          conversationId
        );
        if (presences && Array.isArray(presences)) {
          ingestPresenceSnapshot(presences);
        }
        return presences;
      } catch {
        return [];
      }
    },
    [ingestPresenceSnapshot]
  );

  // Listen to realtime presence updates (presence:online and presence:offline)
  useEffect(() => {
    const handleOnline = (payload: { userId: string; isOnline: boolean }) => {
      if (!payload || !payload.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          isOnline: true,
          lastSeenAt: null,
        },
      }));
    };

    const handleOffline = (payload: {
      userId: string;
      isOnline: boolean;
      lastSeenAt?: string | null;
    }) => {
      if (!payload || !payload.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          isOnline: false,
          lastSeenAt: payload.lastSeenAt || new Date().toISOString(),
        },
      }));
    };

    let activeSocket = socketClient.getSocket();
    let listenersAttached = false;

    const attachListeners = () => {
      const socket = socketClient.getSocket();
      if (!socket || listenersAttached) return;

      activeSocket = socket;
      socket.on(REALTIME_EVENTS.SERVER.PRESENCE_ONLINE, handleOnline);
      socket.on(REALTIME_EVENTS.SERVER.PRESENCE_OFFLINE, handleOffline);
      listenersAttached = true;
    };

    attachListeners();
    const unsubscribe = socketClient.onStatusChange((status) => {
      if (status === "connected" || status === "connecting") {
        attachListeners();
      }
    });

    return () => {
      unsubscribe();
      if (listenersAttached && activeSocket) {
        activeSocket.off(REALTIME_EVENTS.SERVER.PRESENCE_ONLINE, handleOnline);
        activeSocket.off(REALTIME_EVENTS.SERVER.PRESENCE_OFFLINE, handleOffline);
      }
    };
  }, []);

  const getUserPresence = useCallback(
    (userId: string): IPresence => {
      return (
        presenceMap[userId] || {
          userId,
          isOnline: false,
          lastSeenAt: null,
        }
      );
    },
    [presenceMap]
  );

  return {
    presenceMap,
    getUserPresence,
    ingestPresenceSnapshot,
    seedFromConversations,
    fetchUserPresence,
    fetchConversationPresence,
  };
}
