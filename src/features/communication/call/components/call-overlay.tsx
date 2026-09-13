// src/features/communication/call/components/call-overlay.tsx
"use client";

import React, { useEffect, useState } from "react";
import "@livekit/components-styles";
import { Dialog,
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
  Volume2,
  Mic,
  MicOff,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Room, RoomEvent, Track } from "livekit-client";
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  useRoomContext,
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
  isSpeakerEnabled?: boolean;
  mediaErrorMessage?: string | null;
  isAudioPlaybackBlocked?: boolean;
  isLocalSpeaking?: boolean;
  isRemoteSpeaking?: boolean;
  onStartAudio?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleSpeaker?: () => void;
  onSwitchCamera?: () => void;
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
  const [isLocalMain, setIsLocalMain] = useState(false);
  const [, refreshTracks] = useState(0);
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const refresh = () => refreshTracks((value) => value + 1);
    room.on(RoomEvent.TrackSubscribed, refresh);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);

    return () => {
      room.off(RoomEvent.TrackSubscribed, refresh);
      room.off(RoomEvent.TrackUnsubscribed, refresh);
      room.off(RoomEvent.LocalTrackPublished, refresh);
      room.off(RoomEvent.LocalTrackUnpublished, refresh);
    };
  }, [room]);

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localTrack = tracks.find((t) => t.participant.isLocal);
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);

  const isRemoteVideoActive = Boolean(
    remoteTrack &&
    remoteTrack.publication &&
    !remoteTrack.publication.isMuted
  );

  const isLocalVideoActive = Boolean(
    isCameraEnabled &&
    localTrack &&
    localTrack.publication &&
    !localTrack.publication.isMuted
  );

  const canSwapVideos = isLocalVideoActive && isRemoteVideoActive;

  const getContainerClasses = (isMain: boolean) =>
    isMain
      ? "absolute inset-0 w-full h-full z-0 transition-all duration-500 ease-in-out bg-[#0c1317]"
      : cn(
          "absolute right-4 bottom-32 sm:bottom-36 w-28 sm:w-48 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-20 bg-slate-900/90 backdrop-blur-md flex items-center justify-center transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]",
          canSwapVideos ? "cursor-pointer hover:border-[#9ef01a] hover:scale-105 hover:shadow-[#9ef01a]/20" : "cursor-default opacity-90",
          (!isLocalMain ? !isLocalVideoActive : !isRemoteVideoActive) && "border-dashed"
        );

  const handlePipClick = (isMain: boolean) => {
    if (!isMain && canSwapVideos) {
      setIsLocalMain((current) => !current);
    }
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-[#0c1317] overflow-hidden">
      
      {/* Remote Video Container */}
      <div 
        className={getContainerClasses(!isLocalMain)}
        onClick={() => handlePipClick(!isLocalMain)}
      >
        {remoteTrack && (
          <VideoTrack 
            trackRef={remoteTrack} 
            className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-300", !isRemoteVideoActive && "opacity-0")} 
          />
        )}
        
        {!isRemoteVideoActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0c1317]">
            {!isLocalMain ? (
              // Remote PiP Fallback
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <CallAvatar name={participantName} size="sm" />
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Remote off</span>
                </div>
              </div>
            ) : (
              // Remote Main Fallback
              <>
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
                  <span>Waiting for participant&apos;s video...</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Local Video Container */}
      <div 
        className={getContainerClasses(isLocalMain)}
        onClick={() => handlePipClick(isLocalMain)}
      >
        {localTrack && (
          <VideoTrack 
            trackRef={localTrack} 
            className={cn("absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-300", !isLocalVideoActive && "opacity-0")} 
          />
        )}

        {!isLocalVideoActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0c1317]">
            {isLocalMain ? (
              // Local Main Fallback
              <>
                <div className="relative mb-4">
                  <CallAvatar name="You" size="lg" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  You
                </h3>
                <div className="mt-4 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <VideoOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Your camera is turned off</span>
                </div>
              </>
            ) : (
              // Local PiP Fallback
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <CallAvatar name="You" size="sm" />
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Camera off</span>
                </div>
              </div>
            )}
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
  isLocalSpeaking,
  isRemoteSpeaking,
  isMicEnabled,
}: {
  participantName: string;
  participantAvatar?: string | null;
  callState: CallState;
  statusMessage?: string | null;
  liveKitState?: LiveKitConnectionState;
  isLocalSpeaking?: boolean;
  isRemoteSpeaking?: boolean;
  isMicEnabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="my-2 relative">
        <CallAvatar
          name={participantName}
          avatarUrl={participantAvatar}
          size="xl"
          isPulsing={callState === "ACCEPTED" && (isRemoteSpeaking || !liveKitState || liveKitState === "CONNECTING")}
        />
        {isRemoteSpeaking && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
        )}
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
        <div className="mt-3 flex flex-col items-center gap-2">
          {/* Active Speaking / Real-time voice indication */}
          {isRemoteSpeaking ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs animate-pulse">
              <span className="flex gap-0.5 items-center">
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </span>
              <span className="font-semibold text-[12px]">{participantName} is speaking...</span>
            </div>
          ) : isLocalSpeaking ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs">
              <Mic className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="font-semibold text-[12px]">You are speaking...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-white/10 text-xs text-slate-300">
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

          {isMicEnabled === false && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[11px]">
              <MicOff className="w-3 h-3" />
              <span>Your microphone is muted</span>
            </div>
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
  isSpeakerEnabled = false,
  mediaErrorMessage,
  isAudioPlaybackBlocked,
  isLocalSpeaking,
  isRemoteSpeaking = false,
  onStartAudio,
  onToggleMic,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchCamera,
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

  // Minimized floating PIP mode on bottom right
  const minimizedWidget = isMinimized ? (
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
  ) : null;

  return (
    <>
      {minimizedWidget}
      <Dialog open={open && !isMinimized} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "bg-[#0c1317] text-white p-0 shadow-2xl overflow-hidden flex flex-col justify-between select-none animate-in fade-in zoom-in-95 duration-200",
          isVideo 
            ? "w-screen h-dvh max-w-none rounded-none border-none" 
            : "w-[96vw] max-w-lg sm:max-w-2xl rounded-3xl border-[#222e35] h-110 sm:h-120"
        )}
      >
        <DialogTitle className="sr-only">
          Active Call with {participantName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Active {isVideo ? "video" : "audio"} call session with {participantName}
        </DialogDescription>

        {/* Top Header Bar */}
        <div className={cn(
          "flex items-center justify-between p-4 sm:p-5 z-20 transition-all",
          isVideo 
            ? "absolute top-0 inset-x-0 bg-linear-to-b from-black/60 to-transparent pointer-events-none" 
            : "border-b border-white/10 bg-slate-900/40"
        )}>
          <div className={cn("flex items-center gap-3", isVideo && "pointer-events-auto")}>
            {isVideo && (
              <button onClick={() => setIsMinimized(true)} className="p-2 text-white hover:bg-white/10 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            
            {!isVideo && (
              <span className="p-1.5 rounded-xl bg-white/10 text-[#9ef01a]">
                <Phone className="w-4 h-4" />
              </span>
            )}
            
            {isVideo ? (
              <div className="flex items-center gap-3">
                <CallAvatar name={participantName} avatarUrl={participantAvatar} size="sm" />
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white tracking-wide">
                    {participantName}
                  </span>
                  <span className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#9ef01a]"></span>
                    {callState === "ACCEPTED" ? "Connected" : "Calling"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white tracking-wide">
                  ENCRYPTED AUDIO CALL
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#9ef01a]" /> End-to-end encrypted
                </span>
              </div>
            )}
          </div>

          <div className={cn("flex items-center gap-2", isVideo && "pointer-events-auto")}>
            {isVideo ? (
               <button className="p-2 rounded-full bg-slate-900/40 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]">
                 <MoreVertical className="w-5 h-5" />
               </button>
            ) : (
               <button
                 type="button"
                 onClick={() => setIsMinimized(true)}
                 className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef01a]"
                 aria-label="Minimize call"
                 title="Minimize call"
               >
                 <Minimize2 className="w-5 h-5" />
               </button>
            )}
          </div>
        </div>

        {/* Browser Autoplay Blocked Banner */}
        {callState === "ACCEPTED" && !isVideo && (
          <div
            onClick={onStartAudio}
            className="px-4 py-2.5 bg-amber-500/25 hover:bg-amber-500/35 cursor-pointer border-b border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-2 z-20 transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
              <span>
                {isAudioPlaybackBlocked
                  ? <>Audio is paused by browser policy. <strong>Tap here to enable sound.</strong></>
                  : <><strong>Tap here to enable call sound.</strong></>}
              </span>
            </div>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-900 font-semibold text-[11px] shrink-0 shadow"
            >
              Unmute
            </button>
          </div>
        )}

        {/* Permission / Notice Warning Banner */}
        {mediaErrorMessage && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 z-10">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{mediaErrorMessage}</span>
          </div>
        )}

        {/* Center Stage: Bound to LiveKit Room */}
        <div className={cn(
          "flex flex-col items-center justify-center text-center relative overflow-hidden",
          isVideo ? "absolute inset-0 z-0" : "flex-1 p-4 sm:p-6"
        )}>
          {room ? (
            <LiveKitRoom room={room} serverUrl="" token="" connect={false} className="w-full h-full">
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
                  isLocalSpeaking={isLocalSpeaking}
                  isRemoteSpeaking={isRemoteSpeaking}
                  isMicEnabled={isMicEnabled}
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
        <div className={cn(
          "flex items-center justify-center z-20 pointer-events-auto transition-all",
          isVideo 
            ? "absolute bottom-8 sm:bottom-10 inset-x-0" 
            : "p-4 sm:p-6 border-t border-white/10 bg-slate-900/40"
        )}>
          <CallControls
            mode="in-call"
            callType={activeCall.callType}
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            isSpeakerEnabled={isSpeakerEnabled}
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            onToggleSpeaker={onToggleSpeaker}
            onSwitchCamera={onSwitchCamera}
            onEnd={handleEnd}
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
