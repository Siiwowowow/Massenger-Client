// src/features/communication/components/chat-header.tsx
"use client";

import React, { useState } from "react";
import { IConversation, IPresence } from "../types/communication.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "./presence-indicator";
import { ParticipantInfoSheet } from "./participant-info-sheet";
import {
  ArrowLeft,
  Users,
  Info,
  Phone,
  Video,
  Search,
  X,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversation: IConversation;
  currentUserId?: string;
  presence?: IPresence;
  isTyping?: boolean;
  typingUserName?: string;
  onBackMobile?: () => void;
  onSearchInChat?: (query: string) => void;
  onStartCall?: (type: "AUDIO" | "VIDEO") => void;
  isCallActive?: boolean;
  className?: string;
}

export function ChatHeader({
  conversation,
  currentUserId,
  presence,
  isTyping,
  typingUserName,
  onBackMobile,
  onSearchInChat,
  onStartCall,
  isCallActive = false,
  className,
}: ChatHeaderProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isDirect = conversation.type === "DIRECT";

  const otherParticipant = React.useMemo(() => {
    if (!isDirect) return null;
    const participantObj = conversation.participants.find((p) => {
      if (typeof p === "string") return p !== currentUserId;
      return p.userId !== currentUserId;
    });
    if (!participantObj || typeof participantObj === "string") return null;
    return participantObj.user;
  }, [isDirect, conversation.participants, currentUserId]);

  const displayName = isDirect
    ? otherParticipant?.name || "Direct Message"
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

  const participantCount = conversation.participants.length;

  const handleStartCall = (type: "AUDIO" | "VIDEO") => {
    if (isCallActive) {
      toast.warning("A call is already active or in progress.", { duration: 2500 });
      return;
    }
    if (onStartCall) {
      onStartCall(type);
    } else {
      toast.info(
        `${type === "VIDEO" ? "Video" : "Voice"} calling is not available right now.`,
        { duration: 2500 }
      );
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onSearchInChat?.(val);
  };

  return (
    <>
      <header
        className={cn(
          "h-16 px-2.5 sm:px-4 border-b border-[#e2e8f0] bg-white text-slate-900 flex flex-col justify-center shrink-0 z-10 select-none",
          className
        )}
      >
{showSearch ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    handleSearchChange("");
                  }
                }}
                placeholder="Search messages in this conversation..."
                className="pl-9 pr-8 h-9 text-xs bg-slate-100/90 text-slate-900 border-0 rounded-full placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9ef01a]/40 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Clear chat search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSearch(false);
                handleSearchChange("");
              }}
              className="h-8.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Mobile Back Button */}
            {onBackMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackMobile}
                className="md:hidden -ml-1 h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full shrink-0"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}


            {/* Clickable Header Info Trigger */}
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-2 sm:gap-3 min-w-0 text-left hover:opacity-85 transition-opacity focus-visible:outline-hidden rounded-lg p-0.5 -m-0.5"
              aria-label="View conversation details"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-[#e2e8f0]">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-slate-200 text-slate-800 font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Identity & Presence Status */}
              <div className="flex flex-col min-w-0">
                <h1 className="font-semibold text-sm text-slate-950 truncate leading-tight">
                  {displayName}
                </h1>

                <div className="flex items-center gap-1.5 min-h-4">
                  {isTyping ? (
                    <span className="text-xs text-[#16a34a] font-medium inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                      <span>{typingUserName ? `${typingUserName} is typing...` : "Typing..."}</span>
                      <span className="inline-flex gap-0.5 items-center pt-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#16a34a] animate-bounce [animation-delay:-0.32s]" />
                        <span className="w-1 h-1 rounded-full bg-[#16a34a] animate-bounce [animation-delay:-0.16s]" />
                        <span className="w-1 h-1 rounded-full bg-[#16a34a] animate-bounce" />
                      </span>
                    </span>
                  ) : isDirect ? (
                    <PresenceIndicator
                      isOnline={Boolean(presence?.isOnline ?? otherParticipant?.isOnline)}
                      lastSeenAt={presence?.lastSeenAt ?? otherParticipant?.lastSeenAt}
                      showText={true}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {participantCount} participants
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Right side Action Buttons: Search, Phone, Video, More (Real Lucide line-icons, non-dominant, visual-only calls) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* 1. Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                "h-9 w-9 rounded-full transition-colors",
                showSearch
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              )}
              aria-label="Search messages"
              title="Search in conversation"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* 2. Phone Icon (Voice Call) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStartCall("AUDIO")}
              disabled={isCallActive}
              className="h-9 w-9 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
              aria-label="Start voice call"
              title="Start voice call"
            >
              <Phone className="w-4 h-4" />
            </Button>

            {/* 3. Video Icon (Video Call) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStartCall("VIDEO")}
              disabled={isCallActive}
              className="h-9 w-9 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
              aria-label="Start video call"
              title="Start video call"
            >
              <Video className="w-4 h-4" />
            </Button>

            {/* 4. More Options Icon */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                  aria-label="More options"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-white border border-[#e2e8f0] text-slate-900 shadow-xl rounded-xl p-1"
              >
                <DropdownMenuItem
                  onClick={() => setInfoOpen(true)}
                  className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
                >
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>Conversation Info</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowSearch(true)}
                  className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Search in conversation</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        )}
      </header>

      {/* Participant Information Sheet */}
      <ParticipantInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        conversation={conversation}
        currentUserId={currentUserId}
        presence={presence}
      />
    </>
  );
}
