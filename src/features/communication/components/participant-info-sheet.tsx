// src/features/communication/components/participant-info-sheet.tsx
"use client";

import React, { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PresenceIndicator, formatLastSeen } from "./presence-indicator";
import {
  IConversation,
  IPresence,
} from "../types/communication.types";
import {
  Users,
  Mail,
  User as UserIcon,
  Calendar,
  Shield,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";

interface ParticipantInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: IConversation;
  currentUserId?: string;
  presence?: IPresence;
}

export function ParticipantInfoSheet({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  presence,
}: ParticipantInfoSheetProps) {
  const isDirect = conversation.type === "DIRECT";

  const otherParticipant = useMemo(() => {
    if (!isDirect) return null;
    return conversation.participants.find((p) => p.userId !== currentUserId)?.user;
  }, [isDirect, conversation.participants, currentUserId]);

  const displayName = isDirect
    ? otherParticipant?.name || "Direct Message"
    : conversation.title || "Group Chat";

  const avatarUrl = isDirect
    ? otherParticipant?.avatar || undefined
    : conversation.avatar || undefined;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isUserOnline = Boolean(presence?.isOnline ?? otherParticipant?.isOnline);
  const lastSeenAt = presence?.lastSeenAt ?? otherParticipant?.lastSeenAt;

  const formattedCreatedDate = useMemo(() => {
    if (!conversation.createdAt) return null;
    try {
      const date = new Date(conversation.createdAt);
      return isNaN(date.getTime()) ? null : format(date, "MMMM d, yyyy");
    } catch {
      return null;
    }
  }, [conversation.createdAt]);

  const formattedLastSeen = useMemo(() => {
    return formatLastSeen(lastSeenAt);
  }, [lastSeenAt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-border/60 overflow-hidden"
      >
        <SheetHeader className="p-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-base font-semibold">
            {isDirect ? "Participant Details" : "Group Information"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isDirect
              ? "View profile details and communication status"
              : `Conversation details with ${conversation.participants.length} participants`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Profile Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-border/50">
            <div className="relative mb-3">
              <Avatar className="w-20 h-20 border-2 border-background shadow-sm">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isDirect && (
                <div className="absolute bottom-0 right-0">
                  <PresenceIndicator isOnline={isUserOnline} size="md" />
                </div>
              )}
            </div>

            <h3 className="font-semibold text-base text-foreground mb-1 truncate max-w-full">
              {displayName}
            </h3>

            {isDirect ? (
              <Badge
                variant={isUserOnline ? "default" : "secondary"}
                className="text-[11px] font-medium gap-1 px-2 py-0.5"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isUserOnline ? "bg-emerald-400" : "bg-slate-400"
                  }`}
                />
                {isUserOnline ? "Online" : formattedLastSeen}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] gap-1 px-2.5 py-0.5">
                <Users className="w-3 h-3" />
                <span>{conversation.participants.length} Participants</span>
              </Badge>
            )}
          </div>

          {/* Details Section */}
          {isDirect && otherParticipant ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Details
              </h4>
              <div className="space-y-2 rounded-xl border border-border/50 p-3 bg-white dark:bg-slate-900/40 text-xs">
                {otherParticipant.email && (
                  <div className="flex items-center gap-3 py-1.5">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground truncate select-all">
                        {otherParticipant.email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 py-1.5 border-t border-border/40">
                  <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">External ID</p>
                    <p className="font-medium text-foreground truncate select-all font-mono">
                      {otherParticipant.externalId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-1.5 border-t border-border/40">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">Member Role</p>
                    <p className="font-medium text-foreground">Communication Member</p>
                  </div>
                </div>

                {formattedCreatedDate && (
                  <div className="flex items-center gap-3 py-1.5 border-t border-border/40">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Conversation Started</p>
                      <p className="font-medium text-foreground">{formattedCreatedDate}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Group Participants Section */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Participants ({conversation.participants.length})
                </h4>
              </div>

              <div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-white dark:bg-slate-900/40 overflow-hidden">
                {conversation.participants.map((participant) => {
                  const pUser = participant.user;
                  const pInitials = (pUser?.name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isCurrentUser = participant.userId === currentUserId;
                  const isAdminRole = participant.role === "ADMIN";

                  return (
                    <div
                      key={participant.id || participant.userId}
                      className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="w-8 h-8 border border-border/40">
                            {pUser?.avatar && (
                              <AvatarImage src={pUser.avatar} alt={pUser.name} />
                            )}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {pInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator
                              isOnline={Boolean(pUser?.isOnline)}
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate flex items-center gap-1.5">
                            <span>{pUser?.name || "Member"}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {pUser?.email || pUser?.externalId}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAdminRole ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 gap-1 font-semibold text-primary"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Member
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation Metadata Card */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversation Info
            </h4>
            <div className="rounded-xl border border-border/50 p-3 bg-white dark:bg-slate-900/40 text-xs space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Type
                </span>
                <span className="font-medium text-foreground">{conversation.type}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground border-t border-border/30 pt-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Last Active
                </span>
                <span className="font-medium text-foreground">
                  {conversation.lastMessageAt
                    ? format(new Date(conversation.lastMessageAt), "MMM d, h:mm a")
                    : "No messages"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
