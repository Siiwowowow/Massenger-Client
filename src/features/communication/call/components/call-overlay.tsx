// src/features/communication/call/components/call-overlay.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallAvatar } from "./call-avatar";
import { CallStatus } from "./call-status";
import { CallControls } from "./call-controls";
import {
  ActiveCallSession,
  CallState,
  LiveKitConnectionState,
} from "../types/call.types";
import {
  Maximize2,
  Minimize2,
  Phone,
  Video,
  VideoOff,
  ShieldCheck,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Room, Track } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";

interface CallOverlayProps {
  open: boolean;
  activeCall: ActiveCallSession | null;
  callState: CallState;
  statusMessage?: string | null;
  liveKitState?: LiveKitConnectionState;
  room?: Room | null;
  isMicEnabled?: boolean;
  isCameraEnabled?: boolean;
  mediaErrorMessage?: string | null;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onEndCall: (callId?: string) => void;
}

/**
 * VideoStageContent Component
 *
 * Runs inside LiveKitRoom context to bind real tracks for video calls:
 * - Remote video: large full stage
 * - Local video: small floating PIP in top-right corner (mirrored)
 * - Waiting state if remote video is not yet published
 * - Fallback avatar if remote or local camera is off
 */
function VideoStageContent({
  participantName,
  participantAvatar,
  callState,
  statusMessage,
  liveKitState,
  isCameraEnabled,
}: {
  participantName: string;
  participantAvatar?: string | null;
  callState: CallState;
  statusMessage?: string | null;
  liveKitState?: LiveKitConnectionState;
  isCameraEnabled: boolean;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localTrack = tracks.find((t) => t.participant.isLocal);
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);

  const isRemoteVideoActive = Boolean(
    remoteTrack &&
    remoteTrack.publication &&
    !remoteTrack.publication.isMuted &&
    remoteTrack.publication.track
  );

  const isLocalVideoActive = Boolean(
    isCameraEnabled &&
    localTrack &&
    localTrack.publication &&
    !localTrack.publication.isMuted &&
    localTrack.publication.track
  );

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-950 overflow-hidden rounded-2xl border border-white/10 shadow-inner">
      {/* Remote Video Track or Clear Waiting / Avatar State */}
      {isRemoteVideoActive && remoteTrack ? (
        <VideoTrack
          trackRef={remoteTrack}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="relative mb-4">
            <CallAvatar
              name={participantName}
              avatarUrl={participantAvatar}
              size="lg"
              isPulsing={callState === "ACCEPTED"}
            />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {participantName}
          </h3>

          <div className="mt-2">
            <CallStatus
              state={callState}
              callType="VIDEO"
              statusMessage={statusMessage}
              liveKitState={liveKitState}
            />
          </div>

          <div className="mt-4 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-2">
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {remoteTrack
                ? "Remote camera is turned off"
                : "Waiting for participant's video..."}
            </span>
          </div>
        </div>
      )}

      {/* Floating Local PIP Preview (Top-Right, Mirrored) */}
      <div className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center transition-all">
        {isLocalVideoActive && localTrack ? (
          <VideoTrack
            trackRef={localTrack}
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <CallAvatar name="You" size="sm" />
            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              <VideoOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Camera off</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AudioStageContent Component
 *
 * Runs inside LiveKitRoom context for audio calls:
 * - HD voice badge
 * - Pulsing participant avatar
 * - Remote audio handled via RoomAudioRenderer
 * - No camera elements
 */
function AudioStageContent({
  participantName,
  participantAvatar,
  callState,
  statusMessage,
  liveKitState,
}: {
  participantName: string;
  participantAvatar?: string | null;
  callState: CallState;
  statusMessage?: string | null;
  liveKitState?: LiveKitConnectionState;
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="my-2">
        <CallAvatar
          name={participantName}
          avatarUrl={participantAvatar}
          size="xl"
          isPulsing={callState === "ACCEPTED"}
        />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-4">
        {participantName}
      </h3>

      <div className="mt-2">
        <CallStatus
          state={callState}
          callType="AUDIO"
          statusMessage={statusMessage}
          liveKitState={liveKitState}
        />
      </div>

      {callState === "ACCEPTED" && (
        <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-white/10 text-xs text-slate-300">
          {liveKitState === "CONNECTING" && (
            <>
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-[11px]">Connecting LiveKit audio...</span>
            </>
          )}
          {liveKitState === "RECONNECTING" && (
            <>
              <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-amber-300 text-[11px]">Reconnecting LiveKit audio...</span>
            </>
          )}
          {liveKitState === "CONNECTED" && (
            <>
              <Wifi className="w-3 h-3 text-[#9ef01a]" />
              <span className="text-white text-[11px]">HD Voice Connected • Ready</span>
            </>
          )}
          {(!liveKitState || liveKitState === "DISCONNECTED") && (
            <>
              <Radio className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400 text-[11px]">Audio Room Initializing</span>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-2">
        Pulse Messenger High Definition Voice
      </p>
    </div>
  );
}

export function CallOverlay({
  open,
  activeCall,
  callState,
  statusMessage,
  liveKitState,
  room,
  isMicEnabled = true,
  isCameraEnabled = true,
  mediaErrorMessage,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}: CallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!activeCall) return null;

  // Participant name is either callee or caller
  const participantName =
    activeCall.receiver?.name || activeCall.caller?.name || "Participant";
  const participantAvatar =
    activeCall.receiver?.avatar || activeCall.caller?.avatar;
  const isVideo = activeCall.callType === "VIDEO";

  const handleEnd = () => {
    onEndCall(activeCall.callId || undefined);
  };

  // Minimized floating PIP mode on bottom right (allowing uninterrupted chat while seeing call status)
  if (isMinimized) {
    return (
      <>
        {/* Keep LiveKit media room and audio playback active while minimized */}
        {room && (
          <LiveKitRoom room={room} connect={false} serverUrl={undefined} token={undefined}>
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
        <div className="fixed bottom-5 right-5 z-50 bg-[#111b21]/95 backdrop-blur-md text-white border border-[#222e35] p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 select-none">
          <div className="relative">
            <CallAvatar
              name={participantName}
              avatarUrl={participantAvatar}
              size="sm"
              isPulsing={callState === "ACCEPTED"}
            />
            <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#111b21] text-[#9ef01a]">
              {isVideo ? (
                <Video className="w-2.5 h-2.5 stroke-2" />
              ) : (
                <Phone className="w-2.5 h-2.5 stroke-2" />
              )}
            </span>
          </div>

          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-semibold text-white truncate max-w-30">
              {participantName}
            </span>
            <CallStatus
              state={callState}
              callType={activeCall.callType}
              startedAt={activeCall.startedAt}
              statusMessage={statusMessage}
              liveKitState={liveKitState}
              className="text-[11px] items-start"
            />
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-white/10">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]"
              aria-label="Expand call"
              title="Expand call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              aria-label="End call"
              title="End call"
            >
              <Phone className="w-3.5 h-3.5 rotate-135" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-[96vw] max-w-lg sm:max-w-2xl bg-[#0c1317] text-white border-[#222e35] p-0 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between select-none animate-in fade-in zoom-in-95 duration-200",
          isVideo ? "h-[80vh] sm:h-[82vh] max-h-180" : "h-110 sm:h-120"
        )}
      >
        <DialogTitle className="sr-only">
          Active Call with {participantName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Active {isVideo ? "video" : "audio"} call session with {participantName}
        </DialogDescription>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/40 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10 text-[#9ef01a]">
              {isVideo ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-wide">
                {isVideo ? "HD VIDEO CALL" : "ENCRYPTED AUDIO CALL"}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#9ef01a]" /> End-to-end encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Minimize call window"
              title="Minimize to floating window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission / Notice Warning Banner */}
        {mediaErrorMessage && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 z-10">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{mediaErrorMessage}</span>
          </div>
        )}

        {/* Center Stage: Bound to LiveKit Room */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center relative overflow-hidden">
          {room ? (
            <LiveKitRoom room={room} connect={false} className="w-full h-full flex items-center justify-center" serverUrl={undefined} token={undefined}>
              <RoomAudioRenderer />
              {isVideo ? (
                <VideoStageContent
                  participantName={participantName}
                  participantAvatar={participantAvatar}
                  callState={callState}
                  statusMessage={statusMessage}
                  liveKitState={liveKitState}
                  isCameraEnabled={isCameraEnabled}
                />
              ) : (
                <AudioStageContent
                  participantName={participantName}
                  participantAvatar={participantAvatar}
                  callState={callState}
                  statusMessage={statusMessage}
                  liveKitState={liveKitState}
                />
              )}
            </LiveKitRoom>
          ) : (
            /* Pre-connection fallback */
            <div className="flex flex-col items-center justify-center p-6">
              <CallAvatar
                name={participantName}
                avatarUrl={participantAvatar}
                size="xl"
                isPulsing={callState === "ACCEPTED"}
              />
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-4">
                {participantName}
              </h3>
              <div className="mt-2">
                <CallStatus
                  state={callState}
                  callType={activeCall.callType}
                  startedAt={activeCall.startedAt}
                  statusMessage={statusMessage}
                  liveKitState={liveKitState}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 sm:p-6 flex items-center justify-center border-t border-white/10 bg-slate-900/40 z-10">
          <CallControls
            mode="in-call"
            callType={activeCall.callType}
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            onEnd={handleEnd}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

