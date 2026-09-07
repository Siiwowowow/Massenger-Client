// src/app/messages/page.tsx
"use client";

import React, { Suspense } from "react";
import { CommunicationLayout } from "@/features/communication/components/communication-layout";
import LoginForm from "@/features/auth/components/LoginForm";
import { useUser } from "@/features/user/hooks/useUser";
import { Loader2 } from "lucide-react";

function MessagesLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
        <span className="text-xs font-medium tracking-wide">Loading Pulse Messenger...</span>
      </div>
    </div>
  );
}

function MessagesContent() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <LoginForm redirectPath="/messages" />
      </div>
    );
  }

  return <CommunicationLayout />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoadingFallback />}>
      <MessagesContent />
    </Suspense>
  );
}
