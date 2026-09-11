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
        className="max-w-sm sm:max-w-md w-[92vw] bg-[#111b21] text-white border-[#222e35] p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogTitle className="sr-only">
          Incoming {isVideo ? "Video" : "Audio"} Call from {callerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Incoming {isVideo ? "video" : "audio"} call ringing from {callerName}
        </DialogDescription>

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#9ef01a] tracking-wide mb-6">
          {isVideo ? (
            <Video className="w-3.5 h-3.5" />
          ) : (
            <Phone className="w-3.5 h-3.5" />
          )}
          <span>INCOMING {isVideo ? "VIDEO" : "AUDIO"} CALL</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="my-2">
          <CallAvatar
            name={callerName}
            avatarUrl={callerAvatar}
            size="xl"
            isPulsing={true}
          />
        </div>

        {/* Caller Information */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-4">
          {callerName}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Pulse Messenger {isVideo ? "video" : "audio"} call...
        </p>

        {/* Action Controls */}
        <div className="w-full mt-6 sm:mt-8">
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
