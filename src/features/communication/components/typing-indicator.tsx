// src/features/communication/components/typing-indicator.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ userName, className }: TypingIndicatorProps) {
  const displayName = userName ? `${userName} is typing` : "Typing";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in duration-200",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span>{displayName}</span>
      <span className="inline-flex items-center gap-0.5 pt-0.5" aria-hidden="true">
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
      </span>
    </div>
  );
}
