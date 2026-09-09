/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/communication/hooks/use-message-requests.ts
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { communicationService } from "../services/communication.service";
import { socketClient } from "../socket/socket-client";
import {
  IMessageRequest,
  ICommunicationUser,
  IConversation,
} from "../types/communication.types";
import { toast } from "sonner";

export interface UseMessageRequestsProps {
  currentUserId?: string;
  conversations?: IConversation[];
  onOpenConversation?: (conversationId: string) => void;
}

export function useMessageRequests({
  currentUserId,
  conversations = [],
  onOpenConversation,
}: UseMessageRequestsProps) {
  const queryClient = useQueryClient();

  const [incomingRequests, setIncomingRequests] = useState<IMessageRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<IMessageRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isLoadedRef = useRef(false);

  // Storage key for resilient offline/mock fallback sync
  const storageKey = useMemo(() => {
    return currentUserId ? `pulse_requests_${currentUserId}` : null;
  }, [currentUserId]);

  // Load persisted requests from localStorage
  const loadLocalRequests = useCallback(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.incoming)) setIncomingRequests(parsed.incoming);
        if (Array.isArray(parsed.outgoing)) setOutgoingRequests(parsed.outgoing);
      }
    } catch (err) {
      console.warn("Failed to load local message requests:", err);
    }
  }, [storageKey]);

  // Save requests to localStorage
  const saveLocalRequests = useCallback(
    (incoming: IMessageRequest[], outgoing: IMessageRequest[]) => {
      if (typeof window === "undefined" || !storageKey) return;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ incoming, outgoing, updatedAt: new Date().toISOString() })
        );
      } catch (err) {
        console.warn("Failed to persist local message requests:", err);
      }
    },
    [storageKey]
  );

  // Initial fetch from backend with localStorage fallback
  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      // 1. Fetch incoming
      try {
        const incRes = await communicationService.getIncomingRequests(currentUserId);
        if (incRes && Array.isArray(incRes.data)) {
          setIncomingRequests(incRes.data);
        }
      } catch {
        // Backend endpoint might not be ready yet, keep local state
      }

      // 2. Fetch outgoing
      try {
        const outRes = await communicationService.getOutgoingRequests(currentUserId);
        if (outRes && Array.isArray(outRes.data)) {
          setOutgoingRequests(outRes.data);
        }
      } catch {
        // Backend endpoint might not be ready yet, keep local state
      }
    } finally {
      setIsLoading(false);
      isLoadedRef.current = true;
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    loadLocalRequests();
    fetchRequests();
  }, [currentUserId, loadLocalRequests, fetchRequests]);

  // Auto-persist whenever requests change
  useEffect(() => {
    if (isLoadedRef.current) {
      saveLocalRequests(incomingRequests, outgoingRequests);
    }
  }, [incomingRequests, outgoingRequests, saveLocalRequests]);

  // Real-time socket events
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket || !currentUserId) return;

    const handleNewRequest = (req: IMessageRequest) => {
      if (req.receiverId === currentUserId) {
        setIncomingRequests((prev) => {
          if (prev.some((item) => item.id === req.id)) return prev;
          return [req, ...prev];
        });
        toast.info(`New message request from ${req.sender?.name || "a user"}!`, {
          description: req.message || "Wants to connect with you on Pulse",
          duration: 5000,
        });
      }
    };

    const handleRequestAccepted = (data: { request: IMessageRequest; conversation?: IConversation }) => {
      const req = data.request || data;
      // If we are sender, our request was accepted
      if (req.senderId === currentUserId) {
        setOutgoingRequests((prev) =>
          prev.map((item) => (item.id === req.id ? { ...item, status: "ACCEPTED" } : item))
        );
        toast.success(`${req.receiver?.name || "User"} accepted your message request!`);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      // If we are receiver
      if (req.receiverId === currentUserId) {
        setIncomingRequests((prev) => prev.filter((item) => item.id !== req.id));
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    };

    const handleRequestRejected = (data: { requestId: string; request?: IMessageRequest }) => {
      const id = data.requestId || data.request?.id;
      setOutgoingRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "REJECTED" } : item))
      );
      toast.error("Your message request was declined.");
    };

    const handleRequestCancelled = (data: { requestId: string }) => {
      setIncomingRequests((prev) => prev.filter((item) => item.id !== data.requestId));
      setOutgoingRequests((prev) => prev.filter((item) => item.id !== data.requestId));
    };

    socket.on("request:new", handleNewRequest);
    socket.on("request:accepted", handleRequestAccepted);
    socket.on("request:rejected", handleRequestRejected);
    socket.on("request:cancelled", handleRequestCancelled);

    return () => {
      socket.off("request:new", handleNewRequest);
      socket.off("request:accepted", handleRequestAccepted);
      socket.off("request:rejected", handleRequestRejected);
      socket.off("request:cancelled", handleRequestCancelled);
    };
  }, [currentUserId, queryClient]);

  // Send a message request
  const sendRequest = useCallback(
    async (targetUser: ICommunicationUser, message?: string) => {
      if (!currentUserId) {
        toast.error("Please log in to send message requests");
        return;
      }

      if (targetUser.id === currentUserId || targetUser.externalId === currentUserId) {
        toast.error("Cannot send request to yourself");
        return;
      }

      // Check if already in direct conversation
      const hasDirectChat = conversations.some((c) => {
        if (c.type !== "DIRECT") return false;
        return c.participants.some(
          (p) =>
            (typeof p === "string" ? p : p.userId) === targetUser.id ||
            (typeof p === "string" ? p : p.user?.externalId) === targetUser.externalId
        );
      });

      if (hasDirectChat) {
        toast.info("You already have an active conversation with this user");
        return;
      }

      // Optimistic new request
      const tempId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRequest: IMessageRequest = {
        id: tempId,
        projectId: targetUser.projectId || "",
        senderId: currentUserId,
        receiverId: targetUser.id,
        status: "PENDING",
        message: message || "Hi! I would like to connect on Pulse.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        receiver: targetUser,
      };

      setOutgoingRequests((prev) => [newRequest, ...prev.filter((r) => r.receiverId !== targetUser.id)]);

      // Emit real-time notification via socket if connected
      const socket = socketClient.getSocket();
      if (socket && socket.connected) {
        socket.emit("request:send", {
          receiverId: targetUser.id,
          message: newRequest.message,
        });
      }

      toast.success(`Message request sent to ${targetUser.name}!`);

      // Try backend endpoint
      try {
        const res = await communicationService.sendMessageRequest(
          { receiverId: targetUser.id, message: newRequest.message || undefined },
          currentUserId
        );
        const actual = (res as any)?.data || res;
        if (actual && actual.id) {
          setOutgoingRequests((prev) =>
            prev.map((r) => (r.id === tempId ? { ...actual, receiver: targetUser } : r))
          );
        }
      } catch {
        // Kept in optimistic local state
      }
    },
    [currentUserId, conversations]
  );

  // Accept an incoming request
  const acceptRequest = useCallback(
    async (request: IMessageRequest) => {
      if (!currentUserId) return;

      try {
        // 1. Create or get direct conversation with sender
        const conversation = await communicationService.createDirectConversation({
          participantId: request.senderId,
        });

        // 2. Remove from incoming
        setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));

        // 3. Notify sender via socket
        const socket = socketClient.getSocket();
        if (socket && socket.connected) {
          socket.emit("request:accept", { requestId: request.id, senderId: request.senderId });
        }

        toast.success(`Request accepted! Chat created with ${request.sender?.name || "User"}.`);

        // 4. Invalidate conversations query to refresh list
        queryClient.invalidateQueries({ queryKey: ["conversations"] });

        // 5. Open new conversation immediately
        if (conversation && conversation.id && onOpenConversation) {
          onOpenConversation(conversation.id);
        }

        // Try backend PATCH endpoint
        try {
          await communicationService.acceptMessageRequest(request.id, currentUserId);
        } catch {
          // Handled via conversation creation
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to accept request";
        toast.error(msg);
      }
    },
    [currentUserId, queryClient, onOpenConversation]
  );

  // Reject an incoming request
  const rejectRequest = useCallback(
    async (request: IMessageRequest) => {
      if (!currentUserId) return;

      // Remove from incoming
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));

      // Notify sender via socket
      const socket = socketClient.getSocket();
      if (socket && socket.connected) {
        socket.emit("request:reject", { requestId: request.id, senderId: request.senderId });
      }

      toast.info("Message request declined.");

      // Try backend PATCH endpoint
      try {
        await communicationService.rejectMessageRequest(request.id, currentUserId);
      } catch {
        // Local state handled
      }
    },
    [currentUserId]
  );

  // Cancel an outgoing request
  const cancelRequest = useCallback(
    async (requestId: string) => {
      if (!currentUserId) return;

      const reqToCancel = outgoingRequests.find(
        (r) => r.id === requestId || r.receiverId === requestId
      );
      setOutgoingRequests((prev) =>
        prev.filter((r) => r.id !== requestId && r.receiverId !== requestId)
      );

      const targetId = reqToCancel?.id || requestId;
      const targetReceiverId = reqToCancel?.receiverId;

      const socket = socketClient.getSocket();
      if (socket && socket.connected && targetReceiverId) {
        socket.emit("request:cancel", { requestId: targetId, receiverId: targetReceiverId });
      }

      toast.success("Message request cancelled.");

      try {
        await communicationService.cancelMessageRequest(targetId, currentUserId);
      } catch {
        // Local state handled
      }
    },
    [currentUserId, outgoingRequests]
  );

  // Check relationship status with any user
  const getUserRequestStatus = useCallback(
    (targetUserId: string, targetExternalId?: string): {
      status: "connected" | "pending_sent" | "pending_received" | "rejected" | "none";
      requestId?: string;
      conversationId?: string;
    } => {
      // 1. Check if connected in active direct conversation
      const directConv = conversations.find((c) => {
        if (c.type !== "DIRECT") return false;
        return c.participants.some((p) => {
          const uId = typeof p === "string" ? p : p.userId;
          const extId = typeof p === "string" ? undefined : p.user?.externalId;
          return uId === targetUserId || (targetExternalId && extId === targetExternalId);
        });
      });

      if (directConv) {
        return { status: "connected", conversationId: directConv.id };
      }

      // 2. Check incoming requests
      const incoming = incomingRequests.find(
        (r) => r.senderId === targetUserId || r.sender?.externalId === targetExternalId
      );
      if (incoming && incoming.status === "PENDING") {
        return { status: "pending_received", requestId: incoming.id };
      }

      // 3. Check outgoing requests
      const outgoing = outgoingRequests.find(
        (r) => r.receiverId === targetUserId || r.receiver?.externalId === targetExternalId
      );
      if (outgoing) {
        if (outgoing.status === "PENDING") {
          return { status: "pending_sent", requestId: outgoing.id };
        }
        if (outgoing.status === "REJECTED") {
          return { status: "rejected", requestId: outgoing.id };
        }
        if (outgoing.status === "ACCEPTED") {
          return { status: "connected" };
        }
      }

      return { status: "none" };
    },
    [conversations, incomingRequests, outgoingRequests]
  );

  const pendingIncomingCount = useMemo(() => {
    return incomingRequests.filter((r) => r.status === "PENDING").length;
  }, [incomingRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    pendingIncomingCount,
    isLoading,
    fetchRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    getUserRequestStatus,
  };
}
