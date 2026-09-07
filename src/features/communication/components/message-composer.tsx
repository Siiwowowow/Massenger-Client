// src/features/communication/components/message-composer.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  X,
  Check,
  Loader2,
  Pencil,
  Smile,
  Paperclip,
  Mic,
  Image as ImageIcon,
  FileText,
  Camera,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  editingMessage?: { id: string; conversationId: string; content: string } | null;
  onCancelEdit?: () => void;
  onTyping?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩"] },
  { name: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "👊", "👏", "🙌", "👐", "🤝", "🙏", "💪", "❤️", "🔥", "✨", "🎉", "💯"] },
  { name: "Reactions", emojis: ["🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤯", "🥳", "🥺", "😱", "😭"] },
];

export function MessageComposer({
  onSendMessage,
  onEditMessage,
  editingMessage,
  onCancelEdit,
  onTyping,
  disabled = false,
  className,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    } else {
      setContent("");
    }
  }, [editingMessage]);

  // Auto-resize textarea based on content scrollHeight
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 38), 130)}px`;
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    onTyping?.(value);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    if (editingMessage && onEditMessage) {
      try {
        setIsSending(true);
        await onEditMessage(editingMessage.id, trimmed);
        onCancelEdit?.();
      } finally {
        setIsSending(false);
        textareaRef.current?.focus();
      }
    } else {
      const textToSend = trimmed;
      // Instant clear & height reset for zero-latency messenger feel
      setContent("");
      onTyping?.("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "38px";
      }
      textareaRef.current?.focus();

      // Send in background - optimistic message is already rendered in the timeline
      try {
        await onSendMessage(textToSend);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && editingMessage) {
      e.preventDefault();
      onCancelEdit?.();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const isEditing = Boolean(editingMessage);
  const canSubmit = Boolean(content.trim()) && !isSending && !disabled;

  return (
    <footer
      className={cn(
        "px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-[#e2e8f0] shrink-0 select-none z-10",
        className
      )}
    >
      {/* Edit Mode Notification Banner */}
      {isEditing && (
        <div className="flex items-center justify-between pb-2 text-xs text-slate-700 animate-in fade-in duration-150 px-1">
          <div className="flex items-center gap-2 truncate">
            <Pencil className="w-3.5 h-3.5 text-slate-800 shrink-0" />
            <span className="font-semibold text-slate-900">Editing message:</span>
            <span className="italic truncate max-w-xs sm:max-w-md text-slate-600">
              &ldquo;{editingMessage?.content}&rdquo;
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900 rounded-md"
            aria-label="Cancel editing"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>Cancel</span>
          </Button>
        </div>
      )}

      {/* Modern Composer Input Bar */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Emoji Picker Popover */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
              aria-label="Emojis"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="w-72 p-3 bg-white border border-[#e2e8f0] text-slate-900 shadow-xl rounded-2xl"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Emoji Picker</p>
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <span className="text-[10px] text-slate-400 font-medium">{cat.name}</span>
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className="hover:bg-slate-100 rounded-lg p-1 text-base transition-transform hover:scale-115 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attachment Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-48 bg-white border border-[#e2e8f0] text-slate-900 shadow-xl rounded-xl p-1"
          >
            <DropdownMenuItem
              onClick={() => toast.info("Photos & Videos sharing ready in next phase")}
              className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
            >
              <ImageIcon className="w-4 h-4 text-purple-500" />
              <span>Photos & Videos</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Document sharing ready in next phase")}
              className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
            >
              <FileText className="w-4 h-4 text-sky-500" />
              <span>Document</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Camera capture ready in next phase")}
              className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
            >
              <Camera className="w-4 h-4 text-rose-500" />
              <span>Camera</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Contact sharing ready in next phase")}
              className="gap-2.5 text-xs cursor-pointer hover:bg-slate-50"
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>Contact</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Signature White Input Field with visible subtle border and soft #9ef01a focus glow */}
        <div className="flex-1 flex items-end bg-white rounded-2xl px-3 sm:px-3.5 py-1 border border-[#d7dbe3] focus-within:border-[#9ef01a] focus-within:ring-2 focus-within:ring-[#9ef01a]/30 transition-all duration-150 shadow-2xs">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            disabled={disabled || isSending}
            className="flex-1 max-h-[130px] min-h-[36px] bg-transparent resize-none py-1.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden disabled:opacity-50 leading-relaxed font-sans"
            aria-label="Write a message"
          />
        </div>

        {/* Right Action: Voice Message (UI only) morphing smoothly into Send Button */}
        <div className="shrink-0 flex items-center justify-center">
          {canSubmit || isEditing ? (
            <Button
              type="button"
              size="icon"
              onClick={handleSubmit}
              disabled={isSending || disabled}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#9ef01a] hover:bg-[#8ee015] text-[#1a1a1a] active:scale-95 transition-all duration-200 shadow-xs cursor-pointer border-0 animate-in zoom-in-90"
              aria-label={isEditing ? "Save message" : "Send message"}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1a1a1a]" />
              ) : isEditing ? (
                <Check className="w-4 h-4 stroke-[2.5] text-[#1a1a1a]" />
              ) : (
                <Send className="w-4 h-4 stroke-[2.5] text-[#1a1a1a] ml-0.5" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => {
                toast.info("Voice messaging will be available in next phase");
              }}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-200 animate-in zoom-in-90"
              aria-label="Voice message (placeholder)"
              title="Voice Message"
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
