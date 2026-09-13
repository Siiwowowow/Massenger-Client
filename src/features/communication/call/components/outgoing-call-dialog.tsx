// src/features/communication/call/components/outgoing-call-dialog.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const isVideo = activeCall?.callType === "VIDEO";

  useEffect(() => {
    if (!open || !isVideo || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let isCancelled = false;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        previewStreamRef.current = stream;
        setPreviewStream(stream);
        setPreviewError(false);
        setIsPreviewReady(true);
      } catch {
        if (!isCancelled) {
          setIsPreviewReady(false);
          setPreviewError(true);
        }
      }
    };

    void startPreview();

    return () => {
      isCancelled = true;
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
      setPreviewStream(null);
      setIsPreviewReady(false);
    };
  }, [open, isVideo]);

  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement || !previewStream) return;

    previewElement.srcObject = previewStream;
    void previewElement.play().catch(() => undefined);

    return () => {
      previewElement.srcObject = null;
    };
  }, [previewStream]);

  if (!activeCall) return null;

  const calleeName = activeCall.receiver?.name || "User";
  const calleeAvatar = activeCall.receiver?.avatar;

  const handleCancel = () => {
    onCancel(activeCall.callId || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm sm:max-w-md w-[92vw] bg-linear-to-b from-[#1a2328] to-[#111b21] text-white border border-[#2a363d]/50 p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-[#9ef01a]/10 via-transparent to-transparent pointer-events-none" />
        <DialogTitle className="sr-only">
          Calling {calleeName} ({isVideo ? "Video" : "Audio"})
        </DialogTitle>
        <DialogDescription className="sr-only">
          Outgoing {isVideo ? "video" : "audio"} call ringing to {calleeName}
        </DialogDescription>

        {/* Top Call Type Badge */}
        <div className="z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 tracking-wide mb-6 shadow-sm backdrop-blur-md">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 text-[#9ef01a] animate-pulse" />
          ) : (
            <Phone className="w-3.5 h-3.5 text-[#9ef01a] animate-pulse" />
          )}
          <span>OUTGOING {isVideo ? "VIDEO" : "AUDIO"} CALL</span>
        </div>

        {/* Local camera preview while the other participant is being notified */}
        {isVideo ? (
          <div className="z-10 relative aspect-3/4 sm:aspect-square w-full sm:w-[85%] mx-auto overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-inner my-2">
            {isPreviewReady ? (
              <video
                ref={previewRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover -scale-x-100"
                aria-label="Your camera preview"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 bg-slate-900/50 backdrop-blur-sm">
                <CallAvatar name="You" size="lg" isPulsing={!previewError} />
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
                  <VideoOff className="h-4 w-4 text-slate-400" />
                  <span>{previewError ? "Camera permission is required" : "Starting camera..."}</span>
                </div>
              </div>
            )}

            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
              <div className="rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-left text-xs text-white backdrop-blur-md shadow-lg">
                <span className="font-medium text-[#9ef01a]">You</span>
              </div>
              <div className="rounded-full bg-black/50 border border-white/10 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#9ef01a] animate-pulse" />
                Waiting...
              </div>
            </div>
          </div>
        ) : (
          /* Audio Mode Pulsing Avatar */
          <div className="z-10 my-4 relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-[#9ef01a]/20 scale-150" />
            <div className="absolute inset-0 rounded-full animate-pulse bg-[#9ef01a]/30 scale-125" />
            <CallAvatar
              name={calleeName}
              avatarUrl={calleeAvatar}
              size="xl"
              isPulsing={true}
            />
          </div>
        )}

        {/* Callee Identity & Calling State */}
        <h2 className="z-10 text-2xl sm:text-3xl font-bold text-white tracking-tight mt-6">
          {calleeName}
        </h2>
        <p className="z-10 text-sm sm:text-base text-slate-400 mt-2 font-medium flex items-center gap-2">
          {activeCall.statusText || "Calling..."} {calleeName}
          <span className="flex gap-0.5"><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span><span className="animate-bounce delay-300">.</span></span>
        </p>

        {/* Cancel Action */}
        <div className="z-10 w-full mt-8 sm:mt-10">
          <CallControls mode="outgoing" onCancel={handleCancel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
