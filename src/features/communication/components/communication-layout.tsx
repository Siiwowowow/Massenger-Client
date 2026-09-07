/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/communication/components/communication-layout.tsx
"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCommunicationSocket } from "../hooks/use-communication-socket";
import { useConversations } from "../hooks/use-conversations";
import { useMessages } from "../hooks/use-messages";
import { usePresence } from "../hooks/use-presence";
import { useTyping } from "../hooks/use-typing";
import { useMessageRequests } from "../hooks/use-message-requests";
import { communicationService } from "../services/communication.service";
import { IConversation, IMessage } from "../types/communication.types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setActiveConversationId,
  setIsMobileChatOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setEditingMessage,
  setSearchQuery,
} from "../slices/communicationSlice";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { SettingsDialog } from "./settings-dialog";
import { useUser } from "@/features/user/hooks/useUser";
import { RefreshCw, MessageSquare, Plus, ShieldCheck, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommunicationLayoutProps {
  className?: string;
}

export function CommunicationLayout({ className }: CommunicationLayoutProps = {}) {
  const dispatch = useAppDispatch();
  const { user, logout } = useUser();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inChatSearch, setInChatSearch] = useState("");

  const activeConversationId = useAppSelector(
    (state) => state.communication.activeConversationId
  );
  const isMobileChatOpen = useAppSelector(
    (state) => state.communication.isMobileChatOpen
  );
  const isSidebarCollapsed = useAppSelector(
    (state) => state.communication.isSidebarCollapsed
  );
  const editingMessage = useAppSelector(
    (state) => state.communication.editingMessage
  );
  const searchQuery = useAppSelector(
    (state) => state.communication.searchQuery
  );

  // Debounced search query for backend conversations search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = useCallback(
    (val: string) => {
      dispatch(setSearchQuery(val));
    },
    [dispatch]
  );

  // 1. Initialize Socket Connection & Communication User
  const { commUser, connectionStatus } = useCommunicationSocket();

  // 2. Presence tracking
  const {
    presenceMap,
    getUserPresence,
    ingestPresenceSnapshot,
    seedFromConversations,
    fetchConversationPresence,
  } = usePresence();

  // 3. Conversations list & unread counts
  const {
    conversations: backendConversations,
    isLoading: isLoadingConversations,
    isError: isErrorConversations,
    refetch: refetchConversations,
    createDirectConversation,
  } = useConversations(commUser?.id, debouncedSearch);

  // 3. Real conversations list from backend
  const conversations = backendConversations;

  // Seed presence map from initial conversation participants
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      seedFromConversations(conversations);
    }
  }, [conversations, seedFromConversations]);

  // Sync activeConversationId from URL on mount and browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("conversationId");
      if (urlId) {
        dispatch(setActiveConversationId(urlId));
        dispatch(setIsMobileChatOpen(true));
      } else {
        dispatch(setIsMobileChatOpen(false));
      }
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dispatch]);

  // Fetch fresh conversation presence from backend when opening conversation
  useEffect(() => {
    if (activeConversationId) {
      fetchConversationPresence(activeConversationId);
    }
  }, [activeConversationId, fetchConversationPresence]);

  // Helper to cleanly clear active conversation from URL and Redux state
  const clearActiveConversation = useCallback(
    (reason?: string) => {
      dispatch(setActiveConversationId(null));
      dispatch(setIsMobileChatOpen(false));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("conversationId")) {
          url.searchParams.delete("conversationId");
          window.history.replaceState(
            null,
            "",
            url.pathname + (url.search ? url.search : "")
          );
        }
      }
      if (reason) {
        toast.error(reason);
      }
    },
    [dispatch]
  );

  // 4. Fallback lookup if active conversation was opened via URL
  const isFoundInList = conversations.some((c) => c.id === activeConversationId);
  const {
    data: directConversation,
    isError: isDirectError,
  } = useQuery<IConversation | null>({
    queryKey: ["conversation", activeConversationId],
    queryFn: () =>
      activeConversationId
        ? communicationService.getConversation(activeConversationId)
        : null,
    enabled: Boolean(activeConversationId && !isFoundInList),
    staleTime: 30000,
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

  // Automatically deselect if conversation is forbidden or not found
  useEffect(() => {
    if (isDirectError && activeConversationId && !isFoundInList) {
      clearActiveConversation(
        "You do not have access to this conversation or it no longer exists."
      );
    }
  }, [isDirectError, activeConversationId, isFoundInList, clearActiveConversation]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || directConversation || null;
  }, [conversations, activeConversationId, directConversation]);

  // 5. Messages for the active conversation
  const {
    messages: backendMessages,
    isLoading: isLoadingMessages,
    isError: isErrorMessages,
    refetch: refetchMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    sendMessage: backendSendMessage,
    editMessage: backendEditMessage,
    deleteMessage: backendDeleteMessage,
  } = useMessages({
    conversationId: activeConversationId || null,
    currentUserId: commUser?.id,
    onPresenceSnapshot: ingestPresenceSnapshot,
    onForbidden: useCallback(() => {
      clearActiveConversation(
        "You are not a member of this conversation or it is no longer available."
      );
    }, [clearActiveConversation]),
  });

  const messages = backendMessages;

  // Filter messages if search inside chat is active
  const displayedMessages = useMemo(() => {
    if (!inChatSearch.trim()) return messages;
    return messages.filter((m) =>
      Boolean(m.content && m.content.toLowerCase().includes(inChatSearch.toLowerCase()))
    );
  }, [messages, inChatSearch]);

  const handleSendMessage = async (text: string) => {
    await backendSendMessage(text);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (backendEditMessage) {
      await backendEditMessage(messageId, newContent);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (backendDeleteMessage) {
      await backendDeleteMessage(messageId);
    }
  };

  // 6. Typing indicators across conversations and for the active conversation
  const {
    typingUsers,
    isPartnerTyping,
    isConversationTyping,
    handleUserTyping,
  } = useTyping(activeConversationId, commUser?.id);

  // Resolve typing user's display name
  const typingUserName = useMemo(() => {
    if (!typingUsers.length || !activeConversation) return undefined;
    const typingUserId = typingUsers[0].userId;
    const participant = activeConversation.participants.find((p) => {
      if (typeof p === "string") return false;
      return p.userId === typingUserId;
    });
    if (!participant || typeof participant === "string") return "Someone";
    return participant?.user?.name || "Someone";
  }, [typingUsers, activeConversation]);

  // Handler to select conversation with URL state update (without router.replace to prevent Next.js full page unmount)
  const handleSelectConversation = useCallback(
    (id: string) => {
      dispatch(setActiveConversationId(id));
      dispatch(setIsMobileChatOpen(true));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("conversationId", id);
        window.history.replaceState(null, "", url.toString());
      }
    },
    [dispatch]
  );

  // Handler for mobile back button
  const handleBackMobile = useCallback(() => {
    dispatch(setIsMobileChatOpen(false));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("conversationId");
      window.history.replaceState(null, "", url.toString());
    }
  }, [dispatch]);

  // Handler for closing/collapsing sidebar across all devices
  const handleCloseSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768 && activeConversationId) {
      dispatch(setIsMobileChatOpen(true));
    } else {
      dispatch(setSidebarCollapsed(true));
    }
  }, [dispatch, activeConversationId]);

  // Handler for toggling/restoring sidebar
  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      dispatch(setIsMobileChatOpen(false));
    } else {
      dispatch(toggleSidebarCollapsed());
    }
  }, [dispatch]);

  // Handler for starting edit
  const handleStartEdit = useCallback(
    (msg: IMessage) => {
      if (activeConversationId) {
        dispatch(
          setEditingMessage({
            id: msg.id,
            conversationId: activeConversationId,
            content: msg.content || "",
          })
        );
      }
    },
    [activeConversationId, dispatch]
  );

  const handleCancelEdit = useCallback(() => {
    dispatch(setEditingMessage(null));
  }, [dispatch]);

  // Resolve presence for active conversation partner
  const otherUserId = useMemo(() => {
    if (!activeConversation || activeConversation.type !== "DIRECT") return undefined;
    const p = activeConversation.participants.find((item) => {
      if (typeof item === "string") return item !== commUser?.id;
      return item.userId !== commUser?.id;
    });
    if (!p) return undefined;
    return typeof p === "string" ? p : p.userId;
  }, [activeConversation, commUser?.id]);

  const activePresence = otherUserId ? getUserPresence(otherUserId) : undefined;

  const otherAvatarUrl = useMemo(() => {
    if (!activeConversation) return undefined;
    if (activeConversation.type === "DIRECT") {
      const p = activeConversation.participants.find((item) => {
        if (typeof item === "string") return item !== commUser?.id;
        return item.userId !== commUser?.id;
      });
      if (!p || typeof p === "string") return undefined;
      return p.user?.avatar || undefined;
    }
    return activeConversation.avatar || undefined;
  }, [activeConversation, commUser?.id]);

  // 6. Message Requests Management (Incoming, Outgoing, Realtime Socket, Actions)
  const messageRequests = useMessageRequests({
    currentUserId: commUser?.id,
    conversations,
    onOpenConversation: handleSelectConversation,
  });

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden bg-[#f8fafc] text-slate-900",
        className
      )}
    >
      {/* 1. Conversations Sidebar with Collapsible Width Mode */}
      <div
        className={cn(
          "h-full shrink-0 border-r border-[#e2e8f0] bg-white transition-all duration-200 z-10",
          isSidebarCollapsed
            ? "w-[68px] sm:w-[70px]"
            : "w-full md:w-80 lg:w-[340px] xl:w-[360px]",
          isMobileChatOpen && !isSidebarCollapsed ? "hidden md:block" : "block"
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUserId={commUser?.id}
          currentUser={user}
          isLoading={isLoadingConversations}
          isError={isErrorConversations}
          onRetry={refetchConversations}
          presenceMap={presenceMap}
          isConversationTyping={isConversationTyping}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSelectConversation={handleSelectConversation}
          onCreateDirectConversation={createDirectConversation}
          messageRequests={messageRequests}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSidebar={handleCloseSidebar}
          onLogout={logout}
          className="h-full"
        />
      </div>

      {/* 2. Active Chat Timeline / Empty State Screen */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden relative bg-transparent",
          !isMobileChatOpen ? "hidden md:flex" : "flex"
        )}
      >
          {/* Connection Status Warning */}
          {connectionStatus === "connecting" && (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-3 py-1 text-xs font-medium flex items-center justify-center gap-1.5 select-none shrink-0 transition-all z-20">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
              <span>Connecting to real-time chat...</span>
            </div>
          )}

          {activeConversation ? (
            <>
              {/* Chat Header */}
              <ChatHeader
                conversation={activeConversation}
                currentUserId={commUser?.id}
                presence={activePresence}
                isTyping={isPartnerTyping}
                typingUserName={typingUserName}
                onBackMobile={handleBackMobile}
                onSearchInChat={setInChatSearch}
              />

              {/* Message Timeline */}
              <MessageList
                messages={displayedMessages}
                conversationId={activeConversationId}
                currentUserId={commUser?.id || user?.id || ""}
                isGroup={activeConversation.type === "GROUP"}
                isLoading={isLoadingMessages}
                isError={isErrorMessages}
                onRetry={refetchMessages}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                onEditMessage={handleStartEdit}
                onDeleteMessage={handleDeleteMessage}
                isPartnerTyping={isPartnerTyping}
                typingUserName={typingUserName}
                otherAvatarUrl={otherAvatarUrl}
              />

              {/* Message Composer with White Background & Visible Border */}
              <MessageComposer
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
                onTyping={handleUserTyping}
                disabled={connectionStatus === "disconnected"}
              />
            </>
          ) : (
            /* Clean Modern Messenger Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 select-none">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#e2e8f0] text-slate-900 flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-8 h-8 stroke-[2]" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#9ef01a] border-2 border-white rounded-full shadow-xs" />
              </div>

              <h2 className="font-bold text-2xl text-slate-900 mb-2 tracking-tight">
                Pulse Messenger
              </h2>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
                Fast, secure communication with instant real-time synchronization across all devices.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {conversations.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleSelectConversation(conversations[0].id)}
                    className="bg-[#9ef01a] hover:bg-[#8ee015] text-[#1a1a1a] text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                    Open First Chat
                  </Button>
                )}

                {/* Show conversations button if sidebar was collapsed on desktop */}
                {isSidebarCollapsed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleSidebar}
                    className="text-xs font-semibold h-9 px-4 rounded-xl border-slate-300 text-slate-800 hover:bg-slate-100 shadow-2xs gap-1.5"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                    Show Conversations
                  </Button>
                )}
              </div>

              <div className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>End-to-end encrypted messaging</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Settings Dialog */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
  );
}
