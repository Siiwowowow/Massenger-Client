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

        {/* Local camera preview while the other participant is being notified */}
        {isVideo ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner my-2">
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
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                <CallAvatar name="You" size="lg" isPulsing={!previewError} />
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-300">
                  <VideoOff className="h-3.5 w-3.5 text-slate-400" />
                  <span>{previewError ? "Camera permission is required" : "Starting camera..."}</span>
                </div>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
              <div className="rounded-full bg-black/60 px-3 py-1.5 text-left text-xs text-white backdrop-blur-sm">
                <span className="font-medium">You</span>
                <span className="ml-2 text-slate-300">Camera preview</span>
              </div>
              <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-sm">
                Waiting for {calleeName}
              </div>
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
