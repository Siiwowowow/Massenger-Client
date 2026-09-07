// src/app/(authRouteGroup)/(auth)/forgot-password/page.tsx
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-full w-full flex items-center justify-center p-4 sm:p-6 my-auto">
      <ForgotPasswordForm />
    </div>
  );
}