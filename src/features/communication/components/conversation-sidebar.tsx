// src/features/communication/components/conversation-sidebar.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  IConversation,
  IPresence,
  IMessageRequest,
  ICommunicationUser,
} from "../types/communication.types";
import { ConversationItem } from "./conversation-item";
import { NewConversationDialog } from "./new-conversation-dialog";
import { communicationService } from "../services/communication.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ICurrentUser } from "@/features/user/types/user.types";
import { useProject } from "@/features/project/hooks/use-project";
import {
  Search,
  Plus,
  X,
  MessageSquare,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  Send,
  Check,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ConversationSidebarProps {
  conversations: IConversation[];
  activeConversationId: string | null;
  currentUserId?: string;
  currentUser?: ICurrentUser | null;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  presenceMap: Record<string, IPresence>;
  isConversationTyping?: (conversationId: string) => boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateDirectConversation: (participantId: string) => Promise<IConversation>;
  messageRequests?: {
    incomingRequests: IMessageRequest[];
    outgoingRequests: IMessageRequest[];
    pendingIncomingCount: number;
    sendRequest: (targetUser: ICommunicationUser, message?: string) => Promise<void>;
    acceptRequest: (request: IMessageRequest) => Promise<void>;
    rejectRequest: (request: IMessageRequest) => Promise<void>;
    cancelRequest: (requestId: string) => Promise<void>;
    getUserRequestStatus: (targetUserId: string, targetExternalId?: string) => {
      status: "connected" | "pending_sent" | "pending_received" | "rejected" | "none";
      requestId?: string;
      conversationId?: string;
    };
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
  onCloseSidebar?: () => void;
  onLogout?: () => Promise<void>;
  className?: string;
}

type FilterCategory = "all" | "unread" | "direct" | "groups" | "requests";

export function ConversationSidebar({
  conversations,
  activeConversationId,
  currentUserId,
  currentUser,
  isLoading,
  isError,
  onRetry,
  presenceMap,
  isConversationTyping,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onCreateDirectConversation,
  messageRequests,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSettings,
  onCloseSidebar,
  onLogout,
  className,
}: ConversationSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [requestsSubTab, setRequestsSubTab] = useState<"incoming" | "outgoing">("incoming");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { project } = useProject();

  // Dual search state: Global users from backend matching name or email
  const [globalUsers, setGlobalUsers] = useState<ICommunicationUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setGlobalUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    let isMounted = true;
    setIsSearchingUsers(true);

    const timer = setTimeout(async () => {
      try {
        const res = await communicationService.getCommunicationUsers({
          search: q,
          limit: 20,
        });

        if (isMounted) {
          // Filter out current user completely from search by ID, externalId, and email
          const list = (res.data || []).filter((u) => {
            const isSelf =
              u.id === currentUserId ||
              u.externalId === currentUserId ||
              (currentUser?.id && (u.externalId === currentUser.id || u.id === currentUser.id)) ||
              (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase());
            return !isSelf;
          });
          setGlobalUsers(list);
        }
      } catch (err) {
        console.warn("Failed to query global users by search:", err);
      } finally {
        if (isMounted) setIsSearchingUsers(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, currentUserId]);

  const handleClearSearch = () => {
    onSearchChange("");
    searchInputRef.current?.focus();
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClearSearch();
    }
  };

  const handleStartChatWithUser = async (u: { id: string }) => {
    const conv = await onCreateDirectConversation(u.id);
    onSelectConversation(conv.id);
  };

  // Filter conversations by Category
  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === "unread") {
      return (conv.unreadCount || 0) > 0;
    }
    if (activeFilter === "groups") {
      return conv.type === "GROUP";
    }
    if (activeFilter === "direct") {
      return conv.type === "DIRECT";
    }
    return true;
  });

  const pendingRequestsCount = messageRequests?.pendingIncomingCount || 0;

  // Collapsed Mini-Rail Mode (~70px)
  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "flex flex-col h-full w-[68px] sm:w-[70px] bg-white border-r border-[#e2e8f0] select-none text-slate-900 items-center py-3 shrink-0",
          className
        )}
      >
        {/* Top: Expand Button & Actions */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleCollapse || onCloseSidebar}
                className="h-9 w-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="h-8.5 w-8.5 rounded-xl bg-[#9ef01a] hover:bg-[#8ee015] active:scale-95 text-[#1a1a1a] transition-all shadow-2xs cursor-pointer"
                aria-label="New chat"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>

          {/* Collapsed Requests Shortcut with Badge */}
          {messageRequests && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (onToggleCollapse) onToggleCollapse();
                    setActiveFilter("requests");
                  }}
                  className="relative h-8.5 w-8.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Message Requests"
                >
                  <UserCheck className="w-4 h-4" />
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                      {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {pendingRequestsCount > 0
                  ? `${pendingRequestsCount} Message Requests`
                  : "Message Requests"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="w-8 h-px bg-slate-200 my-2.5 shrink-0" />

        {/* Middle: Conversation Avatars Rail */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 py-1 scrollbar-hide">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isDirect = conv.type === "DIRECT";
            const otherParticipant = isDirect
              ? conv.participants.find(
                  (p) => (typeof p === "string" ? p : p.userId) !== currentUserId
                )
              : null;
            const otherUser =
              typeof otherParticipant !== "string" ? otherParticipant?.user : null;
            const otherId =
              typeof otherParticipant === "string"
                ? otherParticipant
                : otherParticipant?.userId;

            const name = isDirect
              ? otherUser?.name || "Direct Message"
              : conv.title || "Group Chat";

            const avatarUrl = isDirect
              ? otherUser?.avatar || undefined
              : conv.avatar || undefined;

            const initials = name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const presence = otherId
              ? presenceMap[otherId] ||
                (otherUser
                  ? {
                      userId: otherId,
                      isOnline: Boolean(otherUser.isOnline),
                      lastSeenAt: otherUser.lastSeenAt || null,
                    }
                  : undefined)
              : undefined;

            const unreadCount = conv.unreadCount || 0;

            return (
              <Tooltip key={conv.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "relative p-1 rounded-2xl transition-all hover:scale-105 active:scale-95 focus:outline-hidden cursor-pointer",
                      isActive
                        ? "ring-2 ring-[#9ef01a] bg-slate-100 shadow-xs"
                        : "hover:bg-slate-100"
                    )}
                    aria-label={`Open chat with ${name}`}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-slate-200">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                        <AvatarFallback className="bg-slate-200 text-slate-800 font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Presence Dot */}
                      {isDirect && (
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                            presence?.isOnline ? "bg-[#9ef01a]" : "bg-slate-300"
                          )}
                        />
                      )}

                      {/* Unread Badge */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#1a1a1a] text-[#9ef01a] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shadow-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-semibold text-xs">{name}</p>
                  {conv.lastMessagePreview && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {conv.lastMessagePreview}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="w-8 h-px bg-slate-200 my-2 shrink-0" />

        {/* Bottom: User Avatar & Actions */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          {onOpenSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onOpenSettings}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative cursor-pointer">
                <Avatar className="w-8 h-8 rounded-full border border-slate-200 shadow-2xs">
                  {(currentUser?.image || currentUser?.uploadedImage) && (
                    <AvatarImage
                      src={currentUser.image || currentUser.uploadedImage || ""}
                      alt={currentUser.name || "User"}
                    />
                  )}
                  <AvatarFallback className="bg-slate-900 text-white text-xs font-semibold">
                    {(currentUser?.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#9ef01a] border-2 border-white shadow-2xs" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {currentUser?.name || "My Account"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* New Conversation Dialog */}
        <NewConversationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentUserId={currentUserId}
          onSelectUser={handleStartChatWithUser}
        />
      </aside>
    );
  }

  // Expanded Sidebar Mode
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-[#e2e8f0] select-none text-slate-900",
        className
      )}
    >
      {/* Top Header: User Identity, Title & Actions */}
      <div className="h-16 px-4 border-b border-[#e2e8f0] flex items-center justify-between gap-2 shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative cursor-pointer shrink-0">
            <Avatar className="w-9 h-9 border border-slate-200 shadow-2xs">
              {(currentUser?.image || currentUser?.uploadedImage) && (
                <AvatarImage
                  src={currentUser.image || currentUser.uploadedImage || ""}
                  alt={currentUser.name || "User"}
                />
              )}
              <AvatarFallback className="bg-slate-900 text-white font-bold text-xs">
                {(currentUser?.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#9ef01a] border-2 border-white shadow-2xs" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-slate-900 truncate leading-tight">
                {currentUser?.name || "Messages"}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5 leading-tight">
              {currentUser?.email || project?.name || "Workspace"}
            </p>
          </div>
        </div>

        {/* Actions Header */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="h-8.5 w-8.5 rounded-xl bg-[#9ef01a] hover:bg-[#8ee015] active:scale-95 text-[#1a1a1a] transition-all shadow-2xs cursor-pointer"
                aria-label="New chat"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New conversation</TooltipContent>
          </Tooltip>

          {onOpenSettings && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onOpenSettings}
              className="h-8.5 w-8.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}

          {/* Sidebar Close / Collapse Button */}
          {(onToggleCollapse || onCloseSidebar) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onToggleCollapse || onCloseSidebar}
                  className="hidden md:flex h-8.5 w-8.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="px-4 py-2.5 border-b border-[#e2e8f0] bg-white">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDownSearch}
            placeholder="Search by name or email (e.g. gmail)..."
            className="pl-9 pr-8 h-9 text-xs bg-slate-50 text-slate-900 border border-[#e2e8f0] rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9ef01a]/40 focus-visible:border-slate-800 transition-all"
            aria-label="Search conversations or users"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips with Requests tab */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide pb-0.5">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "direct", label: "Direct" },
            { id: "groups", label: "Groups" },
            {
              id: "requests",
              label: "Requests",
              badge: pendingRequestsCount,
            },
          ].map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id as FilterCategory)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-[#9ef01a] text-[#1a1a1a] font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                )}
              >
                <span>{chip.label}</span>
                {chip.badge !== undefined && chip.badge > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold leading-none",
                      isActive
                        ? "bg-[#1a1a1a] text-[#9ef01a]"
                        : "bg-rose-500 text-white"
                    )}
                  >
                    {chip.badge > 99 ? "99+" : chip.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body: Dual Search Results OR Requests Tab OR Regular Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y-0">
        {/* CASE 1: SEARCH ACTIVE -> Show Live Dual Search (Chats + Global Users by Name/Email) */}
        {searchQuery.trim() ? (
          <div className="p-3 space-y-4">
            {/* Section A: Matching Conversations */}
            {filteredConversations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Existing Chats ({filteredConversations.length})</span>
                </div>
                <div className="space-y-0.5">
                  {filteredConversations.map((conv) => {
                    const otherParticipantObj = conv.participants.find(
                      (p) => (typeof p === "string" ? p : p.userId) !== currentUserId
                    );
                    const otherId =
                      typeof otherParticipantObj === "string"
                        ? otherParticipantObj
                        : otherParticipantObj?.userId;
                    const presence = otherId ? presenceMap[otherId] : undefined;

                    return (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        currentUserId={currentUserId}
                        presence={presence}
                        onClick={() => onSelectConversation(conv.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section B: Global Users Found in Backend (by Name or Email) */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  <span>People & Contacts {isSearchingUsers ? "..." : `(${globalUsers.length})`}</span>
                </div>
              </div>

              {isSearchingUsers ? (
                <div className="space-y-2 p-1">
                  <Skeleton className="h-13 w-full rounded-xl bg-slate-100" />
                  <Skeleton className="h-13 w-full rounded-xl bg-slate-100" />
                </div>
              ) : globalUsers.length === 0 && filteredConversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2.5 text-slate-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">No user or chat found</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                    We searched both name and email for &quot;{searchQuery}&quot;. Please verify the spelling or full Gmail.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {globalUsers.map((user) => {
                    const rel = messageRequests?.getUserRequestStatus(user.id, user.externalId);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/80 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <Avatar className="w-9 h-9 border border-slate-200">
                              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                              <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                {(user.name || "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#9ef01a] border-2 border-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {user.name}
                            </p>
                            {user.email && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons based on Message Request relationship */}
                        <div className="shrink-0">
                          {rel?.status === "connected" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (rel.conversationId) {
                                  onSelectConversation(rel.conversationId);
                                } else {
                                  handleStartChatWithUser(user);
                                }
                              }}
                              className="h-7 px-2.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg cursor-pointer"
                            >
                              Chat
                            </Button>
                          ) : rel?.status === "pending_sent" ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                Pending
                              </span>
                              {rel.requestId && (
                                <button
                                  type="button"
                                  onClick={() => messageRequests?.cancelRequest(rel.requestId!)}
                                  title="Cancel Request"
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : rel?.status === "pending_received" ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const req = messageRequests?.incomingRequests.find(
                                    (r) => r.id === rel.requestId
                                  );
                                  if (req) messageRequests?.acceptRequest(req);
                                }}
                                className="h-7 px-2.5 text-xs font-bold bg-[#9ef01a] text-[#1a1a1a] hover:bg-[#8ee015] rounded-lg shadow-2xs cursor-pointer"
                              >
                                Accept
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  const req = messageRequests?.incomingRequests.find(
                                    (r) => r.id === rel.requestId
                                  );
                                  if (req) messageRequests?.rejectRequest(req);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : rel?.status === "rejected" ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">
                                Rejected
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => messageRequests?.sendRequest(user)}
                                className="h-6 px-2 text-[10px] font-medium border-slate-200 text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                              >
                                Re-send
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => messageRequests?.sendRequest(user)}
                              className="h-7 px-2.5 text-xs font-bold bg-[#9ef01a] text-[#1a1a1a] hover:bg-[#8ee015] rounded-lg shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Send Request
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeFilter === "requests" ? (
          /* CASE 2: REQUESTS TAB ACTIVE -> Show Incoming & Sent Message Requests */
          <div className="flex flex-col h-full">
            {/* Sub-tab switcher: Incoming vs Sent */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setRequestsSubTab("incoming")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  requestsSubTab === "incoming"
                    ? "bg-[#9ef01a] text-[#1a1a1a] shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                )}
              >
                <span>Incoming</span>
                {messageRequests && messageRequests.incomingRequests.length > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                      requestsSubTab === "incoming"
                        ? "bg-[#1a1a1a] text-[#9ef01a]"
                        : "bg-rose-500 text-white"
                    )}
                  >
                    {messageRequests.incomingRequests.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRequestsSubTab("outgoing")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  requestsSubTab === "outgoing"
                    ? "bg-[#9ef01a] text-[#1a1a1a] shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                )}
              >
                <span>Sent</span>
                {messageRequests && messageRequests.outgoingRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-extrabold">
                    {messageRequests.outgoingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Requests Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {requestsSubTab === "incoming" ? (
                !messageRequests || messageRequests.incomingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2.5 text-slate-500">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">No incoming message requests</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[230px] mx-auto leading-relaxed">
                      When someone searches your name or email and sends a message request, it will appear here.
                    </p>
                  </div>
                ) : (
                  messageRequests.incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-10 h-10 border border-slate-200 shrink-0">
                          {req.sender?.avatar && <AvatarImage src={req.sender.avatar} alt={req.sender.name} />}
                          <AvatarFallback className="bg-slate-900 text-white font-bold text-xs">
                            {(req.sender?.name || "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {req.sender?.name || "User"}
                          </h4>
                          {req.sender?.email && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                              {req.sender.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {req.message && (
                        <div className="text-xs bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-100 text-left italic">
                          &quot;{req.message}&quot;
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          size="sm"
                          onClick={() => messageRequests.acceptRequest(req)}
                          className="flex-1 h-8 text-xs font-bold bg-[#9ef01a] text-[#1a1a1a] hover:bg-[#8ee015] rounded-xl shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => messageRequests.rejectRequest(req)}
                          className="flex-1 h-8 text-xs font-semibold border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                !messageRequests || messageRequests.outgoingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2.5 text-slate-500">
                      <Send className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">No sent requests</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[230px] mx-auto leading-relaxed">
                      Search for users by name or email in the search bar above to connect with teammates.
                    </p>
                  </div>
                ) : (
                  messageRequests.outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Avatar className="w-9 h-9 border border-slate-200 shrink-0">
                            {req.receiver?.avatar && <AvatarImage src={req.receiver.avatar} alt={req.receiver.name} />}
                            <AvatarFallback className="bg-slate-200 text-slate-700 font-bold text-xs">
                              {(req.receiver?.name || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {req.receiver?.name || "User"}
                            </h4>
                            {req.receiver?.email && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                                {req.receiver.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {req.status === "PENDING" && (
                            <>
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                Pending
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => messageRequests.cancelRequest(req.id)}
                                className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Cancel Request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {req.status === "REJECTED" && (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">
                                Rejected
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => messageRequests.cancelRequest(req.id)}
                                className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                                title="Dismiss"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                          {req.status === "ACCEPTED" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              Accepted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        ) : (
          /* CASE 3: NORMAL CONVERSATIONS LIST */
          isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-11 h-11 rounded-full shrink-0 bg-slate-200" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/3 bg-slate-200" />
                      <Skeleton className="h-3 w-10 bg-slate-200" />
                    </div>
                    <Skeleton className="h-3 w-3/4 bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-600 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-slate-900 mb-1">
                Failed to load conversations
              </p>
              <p className="text-xs max-w-[220px] mb-4 text-slate-500 leading-relaxed">
                Unable to connect to the communication service.
              </p>
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="text-xs h-8.5 px-4 font-medium rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              )}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-700">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-slate-900 mb-1">
                No conversations yet
              </p>
              <p className="text-xs max-w-[220px] mb-4 text-slate-500 leading-relaxed">
                Search for a teammate above or start a new direct chat.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[190px]">
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="w-full text-xs h-8.5 font-semibold bg-[#9ef01a] hover:bg-[#8ee015] text-[#1a1a1a] rounded-xl shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                  Start a Chat
                </Button>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherParticipantObj = conv.participants.find(
                (p) => (typeof p === "string" ? p : p.userId) !== currentUserId
              );
              const otherId =
                typeof otherParticipantObj === "string"
                  ? otherParticipantObj
                  : otherParticipantObj?.userId;

              const presence = otherId
                ? presenceMap[otherId] ||
                  (typeof otherParticipantObj !== "string" && otherParticipantObj?.user
                    ? {
                        userId: otherId,
                        isOnline: Boolean(otherParticipantObj.user.isOnline),
                        lastSeenAt: otherParticipantObj.user.lastSeenAt || null,
                      }
                    : undefined)
                : undefined;

              const isTyping = isConversationTyping
                ? isConversationTyping(conv.id)
                : false;

              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  currentUserId={currentUserId}
                  presence={presence}
                  isTyping={isTyping}
                  onClick={() => onSelectConversation(conv.id)}
                />
              );
            })
          )
        )}
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-[#e2e8f0] bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="w-8 h-8 rounded-full border border-slate-200 shrink-0">
            {(currentUser?.image || currentUser?.uploadedImage) && (
              <AvatarImage
                src={currentUser.image || currentUser.uploadedImage || ""}
                alt={currentUser.name || "User"}
              />
            )}
            <AvatarFallback className="bg-slate-900 text-white font-bold text-xs">
              {(currentUser?.name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
              {currentUser?.name || "User Account"}
            </p>
            <p className="text-[10px] text-slate-400 truncate leading-tight">
              {currentUser?.email || "Online"}
            </p>
          </div>
        </div>

        {onLogout && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onLogout}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Log Out</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={currentUserId}
        onSelectUser={handleStartChatWithUser}
        messageRequests={messageRequests}
      />
    </aside>
  );
}
