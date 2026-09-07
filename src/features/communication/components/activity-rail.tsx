// src/features/communication/components/activity-rail.tsx
"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@/features/user/hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Users,
  Phone,
  CircleDotDashed,
  Star,
  Settings,
  Sun,
  Moon,
  LogOut,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityTab = "chats" | "contacts" | "calls" | "status" | "starred";

interface ActivityRailProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  unreadCount?: number;
  onOpenSettings?: () => void;
}

export function ActivityRail({
  activeTab,
  onTabChange,
  unreadCount = 0,
  onOpenSettings,
}: ActivityRailProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useUser();
  const [muted, setMuted] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navItems: Array<{ id: ActivityTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: "chats", label: "Chats", icon: MessageSquare, badge: unreadCount },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "calls", label: "Calls", icon: Phone },
    { id: "status", label: "Status", icon: CircleDotDashed },
    { id: "starred", label: "Starred", icon: Star },
  ];

  return (
    <aside
      aria-label="Navigation Rail"
      className="hidden md:flex flex-col items-center justify-between w-16 shrink-0 py-3 bg-[#111b21] dark:bg-[#111b21] border-r border-[#222e35] dark:border-[#222e35] select-none z-30"
    >
      {/* Top: Brand Logo & Navigation Tabs */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Brand Icon with live pulse ring */}
        <div className="relative group cursor-pointer p-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#111b21] rounded-full" />
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col items-center gap-1 w-full mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Tooltip key={item.id} delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "relative w-12 h-11 rounded-xl flex items-center justify-center transition-all duration-150",
                      isActive
                        ? "bg-[#202c33] dark:bg-[#202c33] text-emerald-400 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#202c33]/60"
                    )}
                  >
                    {/* Active left indicator pill */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />
                    )}
                    <Icon className="w-5 h-5" />
                    {/* Unread badge */}
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#111b21]">
                        {item.badge! > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#202c33] text-white border-[#2a3942] text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Bottom: Theme, Sounds, Settings, Profile */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Sound toggle */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#202c33]/60 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#202c33] text-white border-[#2a3942] text-xs">
            {muted ? "Unmute Sounds" : "Mute Sounds"}
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-[#202c33]/60 transition-colors"
            >
              <Sun className="w-4 h-4 hidden dark:block" />
              <Moon className="w-4 h-4 block dark:hidden" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#202c33] text-white border-[#2a3942] text-xs">
            Toggle Light / Dark Mode
          </TooltipContent>
        </Tooltip>

        {/* Settings Dialog Trigger */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#202c33]/60 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#202c33] text-white border-[#2a3942] text-xs">
            Settings & Preferences
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-[1px] bg-[#222e35] my-1" />

        {/* User Profile Avatar with dropdown menu */}
        <DropdownMenu>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative p-0.5 rounded-full ring-2 ring-transparent hover:ring-emerald-500/50 transition-all focus:outline-none"
                >
                  <Avatar className="w-9 h-9 border border-[#222e35]">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-emerald-700 text-white font-semibold text-xs">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : "ME"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#111b21] rounded-full" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#202c33] text-white border-[#2a3942] text-xs">
              {user?.name || "Your Account"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent
            side="right"
            align="end"
            className="w-60 bg-[#202c33] text-slate-100 border-[#2a3942] shadow-xl p-2 rounded-xl"
          >
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-white leading-none">{user?.name || "Demo User"}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || "user@messenger.local"}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-1">
                  <Shield className="w-3 h-3" /> {user?.role || "USER"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#2a3942]" />
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="px-2 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#111b21] rounded-lg cursor-pointer flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings & Themes
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2a3942]" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="px-2 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
