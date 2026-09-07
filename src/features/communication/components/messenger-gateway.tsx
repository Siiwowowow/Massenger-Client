// src/features/communication/components/messenger-gateway.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Sparkles,
  QrCode,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
} from "lucide-react";

interface MessengerGatewayProps {
  onEnterDemoMode?: () => void;
}

export function MessengerGateway({ onEnterDemoMode }: MessengerGatewayProps) {
  const { theme, setTheme } = useTheme();
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1317] dark:bg-[#0c1317] text-slate-100 flex flex-col justify-between select-none relative overflow-y-auto">
      {/* Top Banner with WhatsApp green accent line */}
      <div className="h-32 w-full bg-[#00a884] absolute top-0 left-0 -z-0 opacity-90" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-5xl w-full mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-[#00a884] flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PULSE MESSENGER <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">WEB</span>
            </h1>
            <p className="text-xs text-white/80">Real-time messaging platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <Sun className="w-4 h-4 hidden dark:block" />
            <Moon className="w-4 h-4 block dark:hidden" />
          </button>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 my-auto py-6">
        <div className="bg-[#111b21] dark:bg-[#111b21] rounded-3xl border border-[#222e35] shadow-2xl shadow-black/60 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Instructions or Quick Login */}
          <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#222e35]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4">
                <Laptop className="w-3.5 h-3.5" /> Web Application
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Use Pulse Messenger on your computer
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Fast, secure, and synchronized across your desktop and mobile devices.
              </p>

              {!showDirectLogin ? (
                <ol className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#202c33] text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Open Pulse Messenger on your phone or device</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#202c33] text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap <strong className="text-white">Menu</strong> or <strong className="text-white">Settings</strong> and select <strong className="text-white">Linked Devices</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#202c33] text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Point your camera to this screen to capture the QR code</span>
                  </li>
                </ol>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = `/login?redirectPath=/`;
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label className="text-xs text-slate-300">Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="bg-[#202c33] border-[#2a3942] text-white text-xs h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-[#202c33] border-[#2a3942] text-white text-xs h-10 mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#00a884] hover:bg-[#02906f] text-white font-semibold h-10 mt-2"
                  >
                    Continue to Sign In
                  </Button>
                </form>
              )}
            </div>

            {/* Quick Actions & Demo Mode Trigger */}
            <div className="mt-8 pt-6 border-t border-[#222e35] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowDirectLogin(!showDirectLogin)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                >
                  {showDirectLogin ? "← Back to QR Code linking" : "Link with email & password instead"}
                </button>
                <Link href="/register" className="text-xs text-slate-400 hover:text-slate-200">
                  Create account
                </Link>
              </div>

              {/* ⚡ One-Click Interactive Demo Mode */}
              <div className="mt-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Instant Preview</p>
                    <p className="text-[11px] text-slate-400">Experience full UI/UX without credentials</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={onEnterDemoMode}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 px-3 rounded-xl shadow-xs"
                >
                  Try Demo Mode <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: High-Tech QR Code Mockup */}
          <div className="md:col-span-5 p-8 flex flex-col items-center justify-center bg-[#0c1317] text-center">
            {/* QR Code Container with animated laser line */}
            <div className="relative p-4 bg-white rounded-2xl shadow-xl shadow-black/40 overflow-hidden group">
              <div className="w-48 h-48 flex items-center justify-center relative">
                {/* SVG QR Pattern */}
                <QrCode className="w-44 h-44 text-slate-900" />
                {/* Center messenger emblem */}
                <div className="absolute w-10 h-10 rounded-xl bg-[#00a884] text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              {/* Glowing animated laser scan line */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-laser-scan pointer-events-none" />
            </div>

            <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> End-to-end encrypted
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stay signed in on this computer</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        <span>Your personal messages are end-to-end encrypted</span>
      </footer>
    </div>
  );
}
