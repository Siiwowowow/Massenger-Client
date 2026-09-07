// src/features/communication/components/call-modal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "audio" | "video";
  participantName: string;
  participantAvatar?: string;
}

export function CallModal({
  open,
  onOpenChange,
  type,
  participantName,
  participantAvatar,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === "audio");
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Transition call status: connecting -> ringing -> connected
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallStatus("connecting");
      setCallDuration(0);
      return;
    }

    const timer1 = setTimeout(() => {
      setCallStatus("ringing");
    }, 1500);

    const timer2 = setTimeout(() => {
      setCallStatus("connected");
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [open]);

  // Call duration counter once connected
  useEffect(() => {
    if (callStatus !== "connected") return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-[#111b21] text-white border-[#222e35] p-0 overflow-hidden rounded-3xl shadow-2xl">
        {type === "video" && !isVideoOff ? (
          /* Video Call View */
          <div className="relative h-96 w-full bg-slate-900 flex flex-col justify-between p-4 overflow-hidden">
            {/* Background simulated remote camera feed */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center">
              <Avatar className="w-24 h-24 border-2 border-emerald-500 shadow-xl mb-3">
                <AvatarImage src={participantAvatar} alt={participantName} />
                <AvatarFallback className="bg-emerald-700 text-white font-bold text-2xl">
                  {participantName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-bold text-white">{participantName}</h3>
              <p className="text-xs text-emerald-400 mt-1">
                {callStatus === "connected" ? formatDuration(callDuration) : callStatus.toUpperCase() + "..."}
              </p>
            </div>

            {/* Local Picture-in-Picture window */}
            <div className="absolute top-4 right-4 w-28 h-36 bg-[#202c33] rounded-2xl border-2 border-[#2a3942] shadow-xl overflow-hidden flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-300 mt-2">You</span>
            </div>

            {/* Top header status */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-medium text-emerald-400 border border-white/10">
                HD Video Call • End-to-end encrypted
              </span>
            </div>

            {/* Bottom Controls */}
            <div className="relative z-10 flex items-center justify-center gap-4 py-2 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? "bg-rose-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff ? "bg-rose-600 text-white" : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          /* Audio Call View */
          <div className="py-10 px-6 flex flex-col items-center text-center">
            {/* Pulsing Avatar with animated sound waves */}
            <div className="relative my-4">
              {callStatus === "connected" && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/10 animate-ping" />
                  <div className="absolute -inset-8 rounded-full bg-emerald-500/5 animate-pulse" />
                </>
              )}
              <Avatar className="w-28 h-28 border-4 border-emerald-500 shadow-2xl relative z-10">
                <AvatarImage src={participantAvatar} alt={participantName} />
                <AvatarFallback className="bg-emerald-700 text-white font-bold text-3xl">
                  {participantName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <h3 className="text-xl font-bold text-white mt-2">{participantName}</h3>
            <p className="text-sm font-medium text-emerald-400 mt-1 capitalize">
              {callStatus === "connected" ? (
                <span className="font-mono text-base text-white">{formatDuration(callDuration)}</span>
              ) : (
                callStatus + "..."
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">Pulse Messenger End-to-End Encrypted Call</p>

            {/* Audio Controls */}
            <div className="flex items-center justify-center gap-5 mt-8">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? "bg-rose-600 text-white" : "bg-[#202c33] hover:bg-[#2a3942] text-white"
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerMuted ? "bg-rose-600 text-white" : "bg-[#202c33] hover:bg-[#2a3942] text-white"
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
