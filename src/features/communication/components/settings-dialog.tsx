// src/features/communication/components/settings-dialog.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Settings, ShieldCheck, Moon, Sun, Monitor } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-slate-900 border border-[#e2e8f0] shadow-xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9ef01a] text-[#1a1a1a] flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-950">Settings & Preferences</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Customize your messenger appearance and experience.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Theme Selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-slate-700">Theme Appearance</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTheme("light")}
                className={`h-9 text-xs justify-center gap-2 rounded-xl transition-all ${
                  theme === "light"
                    ? "bg-[#9ef01a] text-[#1a1a1a] font-semibold border-[#9ef01a] shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-[#e2e8f0] hover:bg-slate-100"
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTheme("dark")}
                className={`h-9 text-xs justify-center gap-2 rounded-xl transition-all ${
                  theme === "dark"
                    ? "bg-[#9ef01a] text-[#1a1a1a] font-semibold border-[#9ef01a] shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-[#e2e8f0] hover:bg-slate-100"
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTheme("system")}
                className={`h-9 text-xs justify-center gap-2 rounded-xl transition-all ${
                  theme === "system"
                    ? "bg-[#9ef01a] text-[#1a1a1a] font-semibold border-[#9ef01a] shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-[#e2e8f0] hover:bg-slate-100"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> System
              </Button>
            </div>
          </div>

          {/* Privacy & Security note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-slate-700 shrink-0" />
            <p className="text-xs text-slate-600 leading-tight">
              Pulse Messenger messages and real-time communication are end-to-end synchronized.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
