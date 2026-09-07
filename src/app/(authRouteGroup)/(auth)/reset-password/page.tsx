// src/app/(authRouteGroup)/(auth)/reset-password/page.tsx
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Create a new password",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-full w-full flex items-center justify-center p-4 sm:p-6 my-auto">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}