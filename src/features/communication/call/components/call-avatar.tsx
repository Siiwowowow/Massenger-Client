// src/features/communication/call/components/call-avatar.tsx
"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CallAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isPulsing?: boolean;
  className?: string;
}

export function CallAvatar({
  name,
  avatarUrl,
  size = "lg",
  isPulsing = false,
  className,
}: CallAvatarProps) {
  const initials = (name || "User")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-16 h-16 text-lg",
    lg: "w-24 h-24 text-2xl",
    xl: "w-32 h-32 text-3xl",
  }[size];

  const ringSizeClasses = {
    sm: "-inset-2",
    md: "-inset-3",
    lg: "-inset-4",
    xl: "-inset-6",
  }[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none", className)}>
      {isPulsing && (
        <>
          <div
            className={cn(
              "absolute rounded-full bg-[#9ef01a]/20 animate-ping duration-1000",
              ringSizeClasses
            )}
          />
          <div
            className={cn(
              "absolute rounded-full bg-[#9ef01a]/10 animate-pulse duration-1500",
              ringSizeClasses
            )}
          />
        </>
      )}

      <Avatar
        className={cn(
          "rounded-full border-2 border-white/20 shadow-xl bg-slate-800 relative z-10 transition-transform",
          sizeClasses
        )}
      >
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={name}
            className="object-cover w-full h-full"
          />
        )}
        <AvatarFallback className="bg-slate-800 text-[#9ef01a] font-bold font-sans">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
