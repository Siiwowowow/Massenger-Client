// src/features/communication/call/components/call-controls.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallType } from "../types/call.types";

interface CallControlsProps {
  mode: "incoming" | "outgoing" | "in-call";
  callType?: CallType;
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onEnd?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CallControls({
  mode,
  callType,
  isMicEnabled = true,
  isCameraEnabled = true,
  onAccept,
  onReject,
  onCancel,
  onEnd,
  onToggleMic,
  onToggleCamera,
  disabled = false,
  className,
}: CallControlsProps) {
  if (mode === "incoming") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-8 sm:gap-12 w-full pt-4",
          className
        )}
      >
        {/* Decline / Reject Button */}
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={onReject}
            disabled={disabled}
            aria-label="Decline incoming call"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </Button>
          <span className="text-xs font-medium text-slate-400 select-none">
            Decline
          </span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            size="icon"
            onClick={onAccept}
            disabled={disabled}
            aria-label="Accept incoming call"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#9ef01a] hover:bg-[#8ee015] text-[#1a1a1a] shadow-lg shadow-[#9ef01a]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Phone className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.4]" />
          </Button>
          <span className="text-xs text-[#9ef01a] select-none font-semibold">
            Accept
          </span>
        </div>
      </div>
    );
  }

  if (mode === "outgoing") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 w-full pt-4",
          className
        )}
      >
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onCancel}
          disabled={disabled}
          aria-label="Cancel outgoing call"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
        </Button>
        <span className="text-xs font-medium text-slate-400 select-none">
          Cancel
        </span>
      </div>
    );
  }

  // mode === "in-call" (accepted active call overlay controls)
  const isVideoCall = callType === "VIDEO";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 sm:gap-6 py-3 px-6 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl",
        className
      )}
    >
      {/* Real Mic Toggle */}
      <button
        type="button"
        onClick={onToggleMic}
        disabled={disabled}
        aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
        title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]",
          isMicEnabled
            ? "bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white"
            : "bg-rose-500/25 hover:bg-rose-500/35 text-rose-400 border border-rose-500/40"
        )}
      >
        {isMicEnabled ? (
          <Mic className="w-5 h-5 stroke-2" />
        ) : (
          <MicOff className="w-5 h-5 stroke-[2.2]" />
        )}
      </button>

      {/* Real Video Toggle - Only displayed for VIDEO calls */}
      {isVideoCall && (
        <button
          type="button"
          onClick={onToggleCamera}
          disabled={disabled}
          aria-label={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
          title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]",
            isCameraEnabled
              ? "bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white"
              : "bg-rose-500/25 hover:bg-rose-500/35 text-rose-400 border border-rose-500/40"
          )}
        >
          {isCameraEnabled ? (
            <Video className="w-5 h-5 stroke-2" />
          ) : (
            <VideoOff className="w-5 h-5 stroke-[2.2]" />
          )}
        </button>
      )}

      {/* End Call Button */}
      <button
        type="button"
        onClick={onEnd}
        disabled={disabled}
        aria-label="End call"
        title="End call"
        className="w-13 h-13 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
      >
        <PhoneOff className="w-6 h-6 stroke-[2.2]" />
      </button>
    </div>
  );
}

