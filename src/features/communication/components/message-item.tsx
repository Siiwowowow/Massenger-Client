// src/features/communication/components/message-item.tsx
"use client";

import React, { useState } from "react";
import { IMessage } from "../types/communication.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  Ban,
  Play,
  Pause,
  Copy,
  PhoneMissed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessageItemProps {
  message: IMessage;
  isSelf: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onEdit?: (message: IMessage) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageItem({
  message,
  isSelf,
  showAvatar = true,
  showSenderName = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  onEdit,
  onDelete,
}: MessageItemProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const isDeleted = Boolean(message.deletedAt);
  const isEdited =
    !isDeleted &&
    Boolean(message.updatedAt && message.updatedAt > message.createdAt);

  const formattedTime = React.useMemo(() => {
    try {
      const date = new Date(message.createdAt);
      if (isNaN(date.getTime())) return "";
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  }, [message.createdAt]);

  // Resolve message status for outgoing (self) messages
  const receiptStatus = React.useMemo(() => {
    if (!isSelf || isDeleted) return null;
    if (message.isSending) return "sending";
    if (message.sendFailed) return "failed";

    const receipts = message.receipts || [];
    const isRead = receipts.some((r) => Boolean(r.readAt)) || message.status === "READ";
    if (isRead) return "read";

    const isDelivered = receipts.some((r) => Boolean(r.deliveredAt)) || message.status === "DELIVERED";
    if (isDelivered) return "delivered";

    return "sent";
  }, [isSelf, isDeleted, message.isSending, message.sendFailed, message.receipts, message.status]);

  const senderName = message.sender?.name || "Member";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAudioMessage = message.type === "AUDIO" || message.content?.startsWith("🎤 [Voice Note]");

  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-medium text-rose-700 shadow-2xs">
          <PhoneMissed className="h-3.5 w-3.5" />
          <span>{message.content}</span>
          <span className="text-[10px] text-rose-400">{formattedTime}</span>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || "");
    toast.success("Message copied to clipboard");
  };

  return (
    <div
      className={cn(
        "group flex items-end gap-2 relative transition-all duration-150 ease-out",
        isFirstInGroup ? "mt-2.5 sm:mt-3" : "mt-0.5",
        isLastInGroup ? "mb-1" : "mb-0",
        isSelf
          ? "justify-end animate-in fade-in slide-in-from-bottom-1"
          : "justify-start animate-in fade-in slide-in-from-left-1"
      )}
    >
      {/* Other Sender Avatar */}
      {!isSelf && (
        <div className="w-8 shrink-0 mb-0.5">
          {showAvatar ? (
            <Avatar className="w-8 h-8 border border-[#e2e8f0] shadow-2xs">
              {message.sender?.avatar && (
                <AvatarImage src={message.sender.avatar} alt={senderName} />
              )}
              <AvatarFallback className="text-[10px] font-bold bg-slate-200 text-slate-800">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Context Menu (Desktop hover / Mobile touch-friendly button) */}
      {!isDeleted && !message.isSending && (
        <div
          className={cn(
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 self-center flex items-center gap-0.5",
            isSelf ? "order-first mr-1" : "order-last ml-1"
          )}
        >
          {/* Options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-7 sm:w-7 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 active:bg-slate-300/80 transition-colors"
                aria-label="Message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isSelf ? "end" : "start"}
              className="text-xs min-w-[130px] bg-white border border-[#e2e8f0] text-slate-900 shadow-lg rounded-xl p-1"
            >
              <DropdownMenuItem
                onClick={handleCopy}
                className="gap-2.5 cursor-pointer hover:bg-slate-50 py-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy text</span>
              </DropdownMenuItem>
              {isSelf && onEdit && message.type === "TEXT" && (
                <DropdownMenuItem
                  onClick={() => onEdit(message)}
                  className="gap-2.5 cursor-pointer hover:bg-slate-50 py-1.5"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit message</span>
                </DropdownMenuItem>
              )}
              {isSelf && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="gap-2.5 text-rose-600 focus:text-rose-600 cursor-pointer hover:bg-rose-50 py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete message</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col relative",
          isSelf ? "items-end" : "items-start"
        )}
      >
        {/* Sender Name in Group Chat */}
        {!isSelf && showSenderName && (
          <span className="text-[11px] font-semibold text-slate-600 px-1 mb-0.5 select-none">
            {senderName}
          </span>
        )}

        {/* Bubble styling: adaptive corner radii based on sender grouping */}
        <div
          className={cn(
            "relative px-3.5 py-2 text-sm leading-relaxed break-words transition-colors",
            isSelf
              ? cn(
                  "bg-[#9ef01a] text-[#1a1a1a] shadow-2xs font-normal",
                  isFirstInGroup && isLastInGroup && "rounded-2xl rounded-br-xs",
                  isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-br-md",
                  !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-r-md",
                  !isFirstInGroup && isLastInGroup && "rounded-2xl rounded-tr-md rounded-br-xs"
                )
              : cn(
                  "bg-white text-[#1a1a1a] border border-[#e2e8f0]/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] font-normal",
                  isFirstInGroup && isLastInGroup && "rounded-2xl rounded-bl-xs",
                  isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-bl-md",
                  !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-l-md",
                  !isFirstInGroup && isLastInGroup && "rounded-2xl rounded-tl-md rounded-bl-xs"
                ),
            isDeleted && "italic text-slate-400 bg-slate-100 border-dashed border-slate-300",
            message.sendFailed && "border-rose-400 bg-rose-50 text-rose-800"
          )}
        >
          {isDeleted ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 select-none py-0.5">
              <Ban className="w-3.5 h-3.5 opacity-60" />
              <span>This message was deleted</span>
            </div>
          ) : isAudioMessage ? (
            /* Voice Note Player Widget */
            <div className="flex items-center gap-3 py-1 pr-1 min-w-[200px]">
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-xs",
                  isSelf ? "bg-[#1a1a1a] text-[#9ef01a]" : "bg-[#9ef01a] text-[#1a1a1a]"
                )}
              >
                {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-1 h-4">
                  <span className="w-1 h-3 rounded-full bg-current opacity-70" />
                  <span className="w-1 h-4 rounded-full bg-current opacity-90" />
                  <span className="w-1 h-2 rounded-full bg-current opacity-60" />
                  <span className="w-1 h-4 rounded-full bg-current opacity-90" />
                  <span className="w-1 h-3 rounded-full bg-current opacity-70" />
                </div>
                <span className="text-[10px] opacity-75">Voice Note</span>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap select-text pr-2">{message.content}</p>
          )}

          {/* Inline Bottom-Right Meta: Time, Edited indicator & Ticks */}
          <div
            className={cn(
              "flex items-center gap-1 justify-end select-none text-[10px] -mb-0.5 mt-0.5 ml-auto float-right pl-2",
              isSelf ? "text-[#1a1a1a]/70 font-medium" : "text-slate-400"
            )}
          >
            {isEdited && <span className="text-[9px] opacity-80">(edited)</span>}
            <span>{formattedTime}</span>

            {/* Receipt Status Indicator for Self Messages */}
            {isSelf && (
              <span className="inline-flex items-center ml-0.5" aria-label={`Status: ${receiptStatus}`}>
                {receiptStatus === "sending" && (
                  <Clock className="w-3 h-3 animate-pulse opacity-70" />
                )}
                {receiptStatus === "failed" && (
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                )}
                {receiptStatus === "sent" && (
                  <Check className="w-3.5 h-3.5 text-[#1a1a1a]/70" />
                )}
                {receiptStatus === "delivered" && (
                  <CheckCheck className="w-3.5 h-3.5 text-[#1a1a1a]/70" />
                )}
                {receiptStatus === "read" && (
                  <CheckCheck className="w-3.5 h-3.5 text-[#0066cc] stroke-[2.5]" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
