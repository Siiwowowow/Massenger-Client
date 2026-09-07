// src/features/communication/components/conversation-item.tsx
"use client";

import React from "react";
import { IConversation, IPresence } from "../types/communication.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceIndicator } from "./presence-indicator";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Check, CheckCheck, Clock } from "lucide-react";

interface ConversationItemProps {
  conversation: IConversation;
  isActive: boolean;
  currentUserId?: string;
  presence?: IPresence;
  isTyping?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  presence,
  isTyping = false,
  onClick,
}: ConversationItemProps) {
  const isDirect = conversation.type === "DIRECT";

  const otherParticipant = React.useMemo(() => {
    if (!isDirect) return null;
    const participantObj = conversation.participants.find((p) => {
      if (typeof p === "string") return p !== currentUserId;
      return p.userId !== currentUserId;
    });
    if (!participantObj) return null;
    if (typeof participantObj === "string") return null;
    return participantObj.user;
  }, [isDirect, conversation.participants, currentUserId]);

  const displayName = isDirect
    ? otherParticipant?.name ||
      (typeof conversation.participants[1] === "string"
        ? "Contact"
        : "Direct Message")
    : conversation.title || "Group Chat";

  const avatarUrl = isDirect
    ? otherParticipant?.avatar || undefined
    : conversation.avatar || undefined;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Formatted timestamp for last message
  const formattedTime = React.useMemo(() => {
    const timestampStr = conversation.lastMessageAt || conversation.updatedAt;
    if (!timestampStr) return "";
    try {
      const date = new Date(timestampStr);
      if (isNaN(date.getTime())) return "";
      if (isToday(date)) return format(date, "h:mm a");
      if (isYesterday(date)) return "Yesterday";
      return format(date, "MM/dd/yy");
    } catch {
      return "";
    }
  }, [conversation.lastMessageAt, conversation.updatedAt]);

  const unreadCount = conversation.unreadCount || 0;
  const isOnline = Boolean(presence?.isOnline ?? otherParticipant?.isOnline);

  // Status for self-sent last message
  const isLastMessageSelf =
    Boolean(currentUserId) && conversation.lastMessageSenderId === currentUserId;
  const lastMessageStatus = conversation.lastMessageStatus;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 relative select-none border-b border-[#f1f5f9] last:border-b-0 cursor-pointer",
        "focus-visible:outline-hidden",
        isActive
          ? "bg-slate-100/90 text-slate-950"
          : "hover:bg-slate-50/80 text-slate-700"
      )}
      data-active={isActive}
    >
      {/* Active Left Indicator Notch */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#9ef01a] rounded-r-full" />
      )}

      {/* Avatar with Presence Indicator */}
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11 border border-[#e2e8f0] shadow-2xs">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-slate-100 text-slate-800 font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        {isDirect && (
          <div className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
            <PresenceIndicator isOnline={isOnline} size="sm" showText={false} />
          </div>
        )}
      </div>

      {/* Details (Name, Time, Preview, Unread Badge) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "font-medium text-sm truncate",
              unreadCount > 0 ? "font-bold text-slate-950" : "text-slate-800",
              isActive && "font-semibold text-slate-950"
            )}
          >
            {displayName}
          </span>
          {formattedTime && (
            <span
              className={cn(
                "text-[11px] shrink-0",
                unreadCount > 0 ? "text-slate-900 font-bold" : "text-slate-400"
              )}
            >
              {formattedTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isTyping ? (
              <span className="text-xs text-[#16a34a] font-semibold italic animate-pulse">
                Typing...
              </span>
            ) : (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {/* Outgoing Status Tick if last message was sent by self */}
                {isLastMessageSelf && (
                  <span className="inline-flex items-center shrink-0">
                    {lastMessageStatus === "sending" && (
                      <Clock className="w-3 h-3 text-slate-400 animate-pulse" />
                    )}
                    {(lastMessageStatus === "sent" || !lastMessageStatus) && (
                      <Check className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {lastMessageStatus === "delivered" && (
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {lastMessageStatus === "read" && (
                      <CheckCheck className="w-3.5 h-3.5 text-[#0066cc] stroke-[2.5]" />
                    )}
                  </span>
                )}
                <p
                  className={cn(
                    "text-xs truncate max-w-[200px] sm:max-w-[240px]",
                    unreadCount > 0
                      ? "text-slate-950 font-semibold"
                      : "text-slate-500"
                  )}
                >
                  {conversation.lastMessagePreview || "No messages yet"}
                </p>
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <span className="min-w-[20px] h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-[#9ef01a] text-[#1a1a1a] flex items-center justify-center shrink-0 shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
