/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(authRouteGroup)/(auth)/forgot-password/_action.ts
"use server";

import { forgotPasswordZodSchema } from "@/features/auth/schemas/auth.schema";


const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function forgotPasswordAction(payload: { email: string }) {
  try {
    // Validate payload
    const validated = forgotPasswordZodSchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0].message,
      };
    }

    const res = await fetch(`${BASE_API_URL}/auth/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: payload.email }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.message || "Failed to send reset code",
      };
    }

    return {
      success: true,
      message: "Password reset code has been sent to your email",
      data: { email: payload.email },
    };
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
}