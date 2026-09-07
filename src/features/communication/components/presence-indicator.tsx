// src/features/communication/components/presence-indicator.tsx
"use client";

import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function formatLastSeen(lastSeenAt?: string | Date | null): string {
  if (!lastSeenAt) return "Offline";

  const date = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  if (isNaN(date.getTime())) return "Offline";

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return "Last seen just now";
  }

  if (diffMinutes < 60) {
    return `Last seen ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last seen ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Last seen yesterday";
  }

  if (diffDays < 7) {
    return `Last seen ${diffDays}d ago`;
  }

  return `Last seen ${format(date, "MMM d")}`;
}

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PresenceIndicator({
  isOnline,
  lastSeenAt,
  showText = false,
  className,
  size = "md",
}: PresenceIndicatorProps) {
  const dotSizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  const statusText = React.useMemo(() => {
    if (isOnline) return "Online";
    return formatLastSeen(lastSeenAt);
  }, [isOnline, lastSeenAt]);

  // If used only as an avatar dot badge and user is offline, do not render a distracting dot
  if (!showText && !isOnline) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {isOnline && (
        <span
          className={cn(
            "rounded-full shrink-0 transition-colors duration-200 ring-2 ring-white bg-[#9ef01a] border border-[#1a1a1a]/15 shadow-2xs",
            dotSizeClasses[size]
          )}
          aria-hidden="true"
        />
      )}
      {showText && (
        <span
          className={cn(
            "text-xs select-none",
            isOnline ? "text-slate-800 font-medium" : "text-slate-400"
          )}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}
