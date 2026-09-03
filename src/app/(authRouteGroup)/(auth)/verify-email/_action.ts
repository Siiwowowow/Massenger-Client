/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(authRouteGroup)/(auth)/verify-email/_action.ts
"use server";

import { verifyEmailZodSchema } from "@/features/auth/schemas/auth.schema";
import { safeJsonParseText } from "@/lib/utils";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function verifyEmailAction(payload: { email: string; otp: string }) {
  try {
    const validated = verifyEmailZodSchema.safeParse({ otp: payload.otp });
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0].message,
      };
    }

    // Use URLSearchParams for form data format
    const formData = new URLSearchParams();
    formData.append('email', payload.email);
    formData.append('otp', payload.otp);

    const res = await fetch(`${BASE_API_URL}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Email verification failed",
      };
    }

    return {
      success: true,
      message: "Email verified successfully",
      data: data.data,
    };
  } catch (error: any) {
    console.error("Email verification error:", error);
    return {
      success: false,
      message: error.message || "An error occurred during email verification",
    };
  }
}

export async function resendOtpAction(email: string) {
  try {
    const formData = new URLSearchParams();
    formData.append('email', email);

    const res = await fetch(`${BASE_API_URL}/auth/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Failed to resend OTP",
      };
    }

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return {
      success: false,
      message: error.message || "An error occurred while resending OTP",
    };
  }
}