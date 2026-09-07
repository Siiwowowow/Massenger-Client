// src/features/communication/components/message-list.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import { IMessage } from "../types/communication.types";
import { MessageItem } from "./message-item";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: IMessage[];
  conversationId?: string | null;
  currentUserId?: string;
  isGroup?: boolean;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onEditMessage?: (message: IMessage) => void;
  onDeleteMessage?: (messageId: string) => void;
  isPartnerTyping?: boolean;
  typingUserName?: string;
  otherAvatarUrl?: string;
  className?: string;
}

export function MessageList({
  messages,
  conversationId,
  currentUserId,
  isGroup = false,
  isLoading,
  isError,
  onRetry,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  isPartnerTyping,
  typingUserName,
  otherAvatarUrl,
  className,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  const prevMessagesLengthRef = useRef<number>(0);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef<boolean>(false);

  const [isNearBottom, setIsNearBottom] = useState<boolean>(true);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);

  // Check if user is currently scrolled close to the bottom
  const checkIfNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const threshold = 140; // px from bottom
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom <= threshold;
  }, []);

  // Handle scroll events to track position
  const handleScroll = useCallback(() => {
    const near = checkIfNearBottom();
    setIsNearBottom(near);
    if (near && messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1]?.id || null);
    }
  }, [checkIfNearBottom, messages]);

  // Scroll to bottom helper (pure DOM operation)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Click handler for floating scroll-to-bottom button
  const handleScrollToBottomClick = () => {
    if (messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1]?.id || null);
    }
    setIsNearBottom(true);
    scrollToBottom("smooth");
  };

  // Derive unread new message count purely from state
  const unreadNewCount = useMemo(() => {
    if (isNearBottom || !lastSeenMessageId) return 0;
    const lastIndex = messages.findIndex(
      (m) =>
        m.id === lastSeenMessageId ||
        (m.clientMessageId && m.clientMessageId === lastSeenMessageId)
    );
    if (lastIndex === -1) return 0;
    return Math.max(0, messages.length - 1 - lastIndex);
  }, [messages, isNearBottom, lastSeenMessageId]);

  // Preserve scroll position when loading older messages (prepending to top)
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (isPrependingRef.current) {
      const newScrollHeight = el.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
      if (heightDiff > 0) {
        el.scrollTop += heightDiff;
      }
      isPrependingRef.current = false;
    }
  }, [messages]);

  // Trigger loading older messages with scroll height capture
  const handleLoadOlder = () => {
    const el = scrollContainerRef.current;
    if (el) {
      prevScrollHeightRef.current = el.scrollHeight;
      isPrependingRef.current = true;
    }
    onLoadMore();
  };

  const initialScrolledRef = useRef<string | null>(null);

  // Initial scroll to bottom on conversation load or switch
  useEffect(() => {
    if (!conversationId) return;
    if (initialScrolledRef.current !== conversationId && !isLoading && messages.length > 0) {
      scrollToBottom("auto");
      initialScrolledRef.current = conversationId;
      prevMessagesLengthRef.current = messages.length;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsNearBottom(true);
    }
  }, [conversationId, isLoading, messages.length, scrollToBottom]);

  // Handle incoming messages: if user is near bottom, smoothly scroll to bottom; if prepending older messages, skip
  useEffect(() => {
    if (isPrependingRef.current) return;
    if (messages.length > prevMessagesLengthRef.current) {
      const near = checkIfNearBottom();
      if (near) {
        scrollToBottom("smooth");
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, checkIfNearBottom, scrollToBottom]);

  // Smooth scroll when partner starts typing if already near bottom
  useEffect(() => {
    if (isPartnerTyping && checkIfNearBottom()) {
      scrollToBottom("smooth");
    }
  }, [isPartnerTyping, checkIfNearBottom, scrollToBottom]);

  // Adjust scroll when mobile virtual keyboard opens/closes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportResize = () => {
      if (checkIfNearBottom()) {
        scrollToBottom("auto");
      }
    };

    window.visualViewport?.addEventListener("resize", handleViewportResize);
    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("resize", handleViewportResize);
    };
  }, [checkIfNearBottom, scrollToBottom]);

  // Date divider formatter
  const formatDateDivider = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      if (isToday(date)) return "Today";
      if (isYesterday(date)) return "Yesterday";
      return format(date, "MMMM d, yyyy");
    } catch {
      return "";
    }
  };

  return (
    <div className="relative flex-1 flex flex-col h-full min-h-0 bg-transparent overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-2.5 sm:py-3.5 select-none relative scroll-smooth",
          className
        )}
      >
        {/* Infinite Scroll Previous Messages Trigger */}
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadOlder}
              disabled={isFetchingNextPage}
              className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 h-7 px-3 rounded-full"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Loading older messages...</span>
                </>
              ) : (
                <span>Load earlier messages</span>
              )}
            </Button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full gap-2 text-slate-500 select-none">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
            <span className="text-xs font-medium">Loading conversation...</span>
          </div>
        ) : isError ? (
          /* Error State with Retry Button */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-600 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-slate-900 mb-1">
              Failed to load messages
            </p>
            <p className="text-xs max-w-xs mb-4 text-slate-500 leading-relaxed">
              Could not retrieve message history for this conversation.
            </p>
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs h-8.5 px-4 font-medium rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            )}
          </div>
        ) : messages.length === 0 ? (
          /* Empty Conversation Message */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center mb-3 text-slate-700 shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-slate-900 mb-1">No messages yet</p>
            <p className="text-xs max-w-xs text-slate-500 leading-relaxed">
              Send a message below to start chatting.
            </p>
          </div>
        ) : (
          /* Grouped Messages with Date Dividers & Rhythm */
          messages.map((message, index) => {
            const isSelf = message.senderId === currentUserId;

            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            // Date divider check
            const showDateDivider =
              !prevMessage ||
              new Date(prevMessage.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();

            // Check if consecutive with previous message (same sender, same date, within 5 mins)
            const isConsecutiveWithPrev =
              !showDateDivider &&
              Boolean(prevMessage) &&
              prevMessage.senderId === message.senderId &&
              Math.abs(
                new Date(message.createdAt).getTime() -
                  new Date(prevMessage.createdAt).getTime()
              ) < 5 * 60 * 1000;

            // Check if consecutive with next message
            const nextIsSameDate =
              Boolean(nextMessage) &&
              new Date(nextMessage.createdAt).toDateString() ===
                new Date(message.createdAt).toDateString();
            const isConsecutiveWithNext =
              nextIsSameDate &&
              Boolean(nextMessage) &&
              nextMessage.senderId === message.senderId &&
              Math.abs(
                new Date(nextMessage.createdAt).getTime() -
                  new Date(message.createdAt).getTime()
              ) < 5 * 60 * 1000;

            const isFirstInGroup = !isConsecutiveWithPrev;
            const isLastInGroup = !isConsecutiveWithNext;

            return (
              <React.Fragment key={message.clientMessageId || message.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4 select-none">
                    <span className="px-3.5 py-0.5 text-[11px] font-medium text-slate-500 bg-white/90 rounded-full shadow-2xs border border-slate-200/80 backdrop-blur-xs">
                      {formatDateDivider(message.createdAt)}
                    </span>
                  </div>
                )}

                <MessageItem
                  message={message}
                  isSelf={isSelf}
                  showAvatar={isLastInGroup}
                  showSenderName={isGroup && !isSelf && isFirstInGroup}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Live Typing Indicator Bubble */}
        {isPartnerTyping && (
          <div className="flex items-end gap-2 my-2 animate-in fade-in duration-200">
            <div className="w-8 shrink-0 mb-0.5">
              <Avatar className="w-8 h-8 border border-[#e2e8f0] shadow-2xs">
                {otherAvatarUrl && <AvatarImage src={otherAvatarUrl} alt={typingUserName || "User"} />}
                <AvatarFallback className="text-[10px] font-bold bg-slate-200 text-slate-800">
                  {(typingUserName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="bg-white text-slate-800 px-3.5 py-2.5 rounded-2xl rounded-bl-xs border border-[#e2e8f0]/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.32s] [animation-duration:1.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.16s] [animation-duration:1.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-duration:1.2s]" />
            </div>
          </div>
        )}

        {/* Bottom Anchor */}
        <div ref={bottomAnchorRef} className="h-2" />
      </div>

      {/* Floating "New Messages" Pill */}
      {!isNearBottom && unreadNewCount > 0 && (
        <div className="absolute bottom-4 right-6 z-20 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Button
            size="sm"
            onClick={handleScrollToBottomClick}
            className="h-8 rounded-full shadow-md bg-[#9ef01a] hover:bg-[#8ee015] text-[#1a1a1a] text-xs px-3.5 gap-1.5 font-semibold border-0"
            aria-label="Scroll to newest messages"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>
              {unreadNewCount === 1 ? "1 new message" : `${unreadNewCount} new messages`}
            </span>
          </Button>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      {!isNearBottom && unreadNewCount === 0 && (
        <div className="absolute bottom-4 right-6 z-20 animate-in fade-in duration-200">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleScrollToBottomClick}
            className="h-8 w-8 rounded-full shadow-md bg-white border border-[#e2e8f0] hover:bg-slate-50 text-slate-700"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
