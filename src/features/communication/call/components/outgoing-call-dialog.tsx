// src/features/communication/call/components/outgoing-call-dialog.tsx
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
import { Video, Phone, VideoOff } from "lucide-react";

interface OutgoingCallDialogProps {
  open: boolean;
  activeCall: ActiveCallSession | null;
  onCancel: (callId?: string) => void;
}

export function OutgoingCallDialog({
  open,
  activeCall,
  onCancel,
}: OutgoingCallDialogProps) {
  if (!activeCall) return null;

  const calleeName = activeCall.receiver?.name || "User";
  const calleeAvatar = activeCall.receiver?.avatar;
  const isVideo = activeCall.callType === "VIDEO";

  const handleCancel = () => {
    onCancel(activeCall.callId || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm sm:max-w-md w-[92vw] bg-[#111b21] text-white border-[#222e35] p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogTitle className="sr-only">
          Calling {calleeName} ({isVideo ? "Video" : "Audio"})
        </DialogTitle>
        <DialogDescription className="sr-only">
          Outgoing {isVideo ? "video" : "audio"} call ringing to {calleeName}
        </DialogDescription>

        {/* Top Call Type Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-slate-200 tracking-wide mb-5">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 text-[#9ef01a]" />
          ) : (
            <Phone className="w-3.5 h-3.5 text-[#9ef01a]" />
          )}
          <span>OUTGOING {isVideo ? "VIDEO" : "AUDIO"} CALL</span>
        </div>

        {/* Video Mode Placeholder Area (Phase 1 tasteful placeholder, no fake camera) */}
        {isVideo ? (
          <div className="w-full relative rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col items-center justify-center my-2 overflow-hidden shadow-inner">
            <div className="relative mb-3">
              <CallAvatar
                name={calleeName}
                avatarUrl={calleeAvatar}
                size="lg"
                isPulsing={true}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
              <VideoOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Camera connects after call is accepted</span>
            </div>
          </div>
        ) : (
          /* Audio Mode Pulsing Avatar */
          <div className="my-3">
            <CallAvatar
              name={calleeName}
              avatarUrl={calleeAvatar}
              size="xl"
              isPulsing={true}
            />
          </div>
        )}

        {/* Callee Identity & Calling State */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-3">
          {calleeName}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 animate-pulse">
          Calling...
        </p>

        {/* Cancel Action */}
        <div className="w-full mt-6">
          <CallControls mode="outgoing" onCancel={handleCancel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
