/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(authRouteGroup)/(auth)/reset-password/_action.ts
"use server";

import { resetPasswordZodSchema } from "@/features/auth/schemas/auth.schema";
import { safeJsonParseText } from "@/lib/utils";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function resetPasswordAction(payload: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  try {
    // Validate payload
    const validated = resetPasswordZodSchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0].message,
      };
    }

    const res = await fetch(`${BASE_API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        otp: payload.otp,
        newPassword: payload.newPassword,
      }),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Failed to reset password",
      };
    }

    return {
      success: true,
      message: "Password has been reset successfully. You can now login.",
    };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
}

export async function resendResetOtpAction(email: string) {
  try {
    const res = await fetch(`${BASE_API_URL}/auth/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Failed to resend code",
      };
    }

    return {
      success: true,
      message: "A new code has been sent to your email",
    };
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
}