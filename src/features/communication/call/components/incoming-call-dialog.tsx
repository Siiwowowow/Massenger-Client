// src/features/communication/call/components/incoming-call-dialog.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CallAvatar } from "./call-avatar";
import { CallControls } from "./call-controls";
import { ActiveCallSession } from "../types/call.types";
import { Phone, Video } from "lucide-react";

interface IncomingCallDialogProps {
  open: boolean;
  activeCall: ActiveCallSession | null;
  onAccept: (callId: string) => void;
  onReject: (callId: string) => void;
}

export function IncomingCallDialog({
  open,
  activeCall,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  if (!activeCall) return null;

  const callerName = activeCall.caller?.name || "Caller";
  const callerAvatar = activeCall.caller?.avatar;
  const isVideo = activeCall.callType === "VIDEO";

  const handleAccept = () => {
    if (activeCall.callId) {
            onAccept(activeCall.callId);
    }
  };

  const handleReject = () => {
    if (activeCall.callId) {
      onReject(activeCall.callId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm sm:max-w-md w-[92vw] bg-linear-to-b from-[#1a2328] to-[#111b21] text-white border border-[#2a363d]/50 p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-[#9ef01a]/10 via-transparent to-transparent pointer-events-none" />
        <DialogTitle className="sr-only">
          Incoming {isVideo ? "Video" : "Audio"} Call from {callerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Incoming {isVideo ? "video" : "audio"} call ringing from {callerName}
        </DialogDescription>

        {/* Top Header Badge */}
        <div className="z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#9ef01a] tracking-wide mb-6 shadow-sm backdrop-blur-md">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <Phone className="w-3.5 h-3.5 animate-pulse" />
          )}
          <span>INCOMING {isVideo ? "VIDEO" : "AUDIO"} CALL</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="z-10 my-4 relative">
          <div className="absolute inset-0 rounded-full animate-ping bg-[#9ef01a]/20 scale-150" />
          <div className="absolute inset-0 rounded-full animate-pulse bg-[#9ef01a]/30 scale-125" />
          <CallAvatar
            name={callerName}
            avatarUrl={callerAvatar}
            size="xl"
            isPulsing={true}
          />
        </div>

        {/* Caller Information */}
        <h2 className="z-10 text-2xl sm:text-3xl font-bold text-white tracking-tight mt-6">
          {callerName}
        </h2>
        <p className="z-10 text-sm sm:text-base text-slate-400 mt-2 font-medium">
          {callerName} is calling you
        </p>

        {/* Action Controls */}
        <div className="z-10 w-full mt-8 sm:mt-10">
          <CallControls
            mode="incoming"
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
