// src/app/(authRouteGroup)/(auth)/verify-email/page.tsx
import VerifyEmailForm from "@/features/auth/components/VerifyEmailForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-full w-full flex items-center justify-center p-4 sm:p-6 my-auto">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}