// src/features/communication/call/components/call-status.tsx
"use client";

import React, { useState, useEffect } from "react";
import { CallState, CallType, LiveKitConnectionState } from "../types/call.types";
import { cn } from "@/lib/utils";

interface CallStatusProps {
  state: CallState;
  callType?: CallType;
  startedAt?: string;
  statusMessage?: string | null;
  liveKitState?: LiveKitConnectionState;
  className?: string;
}

export function CallStatus({
  state,
  callType,
  startedAt,
  statusMessage,
  liveKitState,
  className,
}: CallStatusProps) {
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    if (state !== "ACCEPTED") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDurationSeconds(0);
      return;
    }

    const startTime = startedAt ? new Date(startedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDurationSeconds(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [state, startedAt]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const remainingSeconds = secs % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const renderStatus = () => {
    if (state === "ACCEPTED") {
      if (liveKitState === "RECONNECTING") {
        return (
          <span className="text-xs font-medium text-amber-400 animate-pulse">
            Reconnecting...
          </span>
        );
      }

      if (liveKitState === "CONNECTING") {
        return (
          <span className="text-xs font-medium text-emerald-400 animate-pulse">
            Connecting...
          </span>
        );
      }

      if (liveKitState === "DISCONNECTED") {
        return (
          <span className="text-xs font-medium text-rose-400">
            Disconnected
          </span>
        );
      }

      if (durationSeconds > 0) {
        return (
          <span className="font-mono tracking-wider text-sm font-medium text-[#9ef01a]">
            {formatTime(durationSeconds)}
          </span>
        );
      }

      return (
        <span className="text-xs font-medium text-[#9ef01a]">
          Connected • Ready
        </span>
      );
    }

    if (state === "RINGING_OUTGOING") {
      return (
        <span className="text-sm font-medium text-slate-300 animate-pulse">
          {statusMessage || "Calling..."}
        </span>
      );
    }

    if (state === "RINGING_INCOMING") {
      return (
        <span className="text-sm font-medium text-[#9ef01a]">
          Incoming {callType === "VIDEO" ? "video" : "audio"} call...
        </span>
      );
    }

    if (state === "BUSY") {
      return (
        <span className="text-sm font-medium text-amber-400">
          User is currently on another call
        </span>
      );
    }

    if (state === "ENDED") {
      return (
        <span className="text-sm font-medium text-slate-400">
          {statusMessage || "Call ended"}
        </span>
      );
    }

    if (state === "REJECTED") {
      return (
        <span className="text-sm font-medium text-rose-400">
          Call declined
        </span>
      );
    }

    if (state === "CANCELLED") {
      return (
        <span className="text-sm font-medium text-slate-400">
          Call cancelled
        </span>
      );
    }

    return (
      <span className="text-sm font-medium text-slate-400">
        {statusMessage || ""}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 select-none text-center",
        className
      )}
    >
      {renderStatus()}
    </div>
  );
}
