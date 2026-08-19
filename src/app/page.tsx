"use client";

import React, { Suspense } from "react";
import { GoogleLoginSuccess } from "@/components/GoogleLoginSuccess";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <GoogleLoginSuccess />
      </Suspense>
      <div className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-center">
        {/* Clean Canvas for your content */}
      </div>
    </>
  );
}
