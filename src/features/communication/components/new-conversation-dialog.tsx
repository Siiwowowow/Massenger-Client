// src/features/communication/components/new-conversation-dialog.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@/features/user/hooks/useUser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceIndicator } from "./presence-indicator";
import { communicationService } from "../services/communication.service";
import { ICommunicationUser, IMessageRequest } from "../types/communication.types";
import { Search, Loader2, UserPlus, MessageSquare, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onSelectUser: (user: ICommunicationUser) => Promise<void>;
  messageRequests?: {
    incomingRequests: IMessageRequest[];
    outgoingRequests: IMessageRequest[];
    pendingIncomingCount: number;
    sendRequest: (targetUser: ICommunicationUser, message?: string) => Promise<void>;
    acceptRequest: (request: IMessageRequest) => Promise<void>;
    rejectRequest: (request: IMessageRequest) => Promise<void>;
    cancelRequest: (requestId: string) => Promise<void>;
    getUserRequestStatus: (targetUserId: string, targetExternalId?: string) => {
      status: "connected" | "pending_sent" | "pending_received" | "rejected" | "none";
      requestId?: string;
      conversationId?: string;
    };
  };
}

export function NewConversationDialog({
  open,
  onOpenChange,
  currentUserId,
  onSelectUser,
  messageRequests,
}: NewConversationDialogProps) {
  const { user: authUser } = useUser();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ICommunicationUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setUsers([]);
      setStartingUserId(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await communicationService.getCommunicationUsers({
          search: search.trim() || undefined,
          limit: 30,
        });

        if (isMounted) {
          // Exclude self completely from user selection by ID, externalId, and email
          const filtered = (res.data || []).filter((u) => {
            const isSelf =
              u.id === currentUserId ||
              u.externalId === currentUserId ||
              (authUser?.id && (u.externalId === authUser.id || u.id === authUser.id)) ||
              (authUser?.email && u.email?.toLowerCase() === authUser.email.toLowerCase());
            return !isSelf;
          });
          setUsers(filtered);
        }
      } catch (err: unknown) {
        console.warn("Failed to query communication users:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, search, currentUserId]);

  const handleClearSearch = () => {
    setSearch("");
    searchInputRef.current?.focus();
  };

  const handleStartChat = async (user: ICommunicationUser) => {
    if (startingUserId) return;
    try {
      setStartingUserId(user.id);
      await onSelectUser(user);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start direct conversation";
      toast.error(message);
    } finally {
      setStartingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 pb-2 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <UserPlus className="w-5 h-5 text-[#1a1a1a]" />
            Find Users & Teammates
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Search by full name or email (e.g. gmail) to send a message request or start chatting.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 pt-2">
          {/* Search Input with Clear Button */}
          <div className="relative mb-3 flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleClearSearch();
              }}
              placeholder="Search by name or email (e.g. alice@gmail.com)..."
              className="pl-9 pr-8 h-9 text-xs bg-slate-50 text-slate-900 border border-[#e2e8f0] rounded-xl focus-visible:bg-white"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Clear user search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User List */}
          <div className="max-h-[340px] overflow-y-auto space-y-1 pr-1">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-slate-200" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-1/3 bg-slate-200" />
                      <Skeleton className="h-3 w-1/2 bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  {search ? "No users found" : "No other users available"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-[220px] mx-auto">
                  {search
                    ? `No user matched "${search}". Check name or exact Gmail address.`
                    : "No other members are registered in this project yet."}
                </p>
                {search && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearSearch}
                    className="mt-3 text-xs h-7 rounded-lg"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              users.map((user) => {
                const initials = (user.name || "U")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const isStarting = startingUserId === user.id;
                const rel = messageRequests?.getUserRequestStatus(user.id, user.externalId);

                return (
                  <div
                    key={user.id}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 text-left transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 border border-slate-200">
                          {user.avatar && (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          )}
                          <AvatarFallback className="text-xs font-bold bg-slate-900 text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <PresenceIndicator
                            isOnline={Boolean(user.isOnline)}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {user.email || user.externalId}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {rel?.status === "connected" ? (
                        <Button
                          size="sm"
                          onClick={() => handleStartChat(user)}
                          disabled={isStarting || Boolean(startingUserId)}
                          className="h-7.5 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                        >
                          {isStarting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Chat"
                          )}
                        </Button>
                      ) : rel?.status === "pending_sent" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                            Pending
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => messageRequests?.cancelRequest(rel.requestId || user.id)}
                            className="h-7.5 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : rel?.status === "pending_received" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              const req = messageRequests?.incomingRequests.find((r) => r.id === rel.requestId);
                              if (req) {
                                messageRequests?.acceptRequest(req);
                                onOpenChange(false);
                              }
                            }}
                            className="h-7.5 px-3 text-xs font-bold bg-[#9ef01a] text-[#1a1a1a] hover:bg-[#8ee015] rounded-lg shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                            Accept
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const req = messageRequests?.incomingRequests.find((r) => r.id === rel.requestId);
                              if (req) messageRequests?.rejectRequest(req);
                            }}
                            className="h-7.5 w-7.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Decline"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : rel?.status === "rejected" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold">
                            Rejected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => messageRequests?.sendRequest(user)}
                            className="h-7.5 px-2.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Re-send
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (messageRequests) {
                              messageRequests.sendRequest(user);
                            } else {
                              handleStartChat(user);
                            }
                          }}
                          className="h-7.5 px-3 text-xs font-bold bg-[#9ef01a] text-[#1a1a1a] hover:bg-[#8ee015] rounded-lg shadow-2xs cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Send Request
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
