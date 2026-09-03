/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { safeJsonParseText } from "@/lib/utils";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ✅ IRegisterPayload বাদ — এখন সরাসরি FormData নেবে
export async function registerAction(formData: FormData) {
  try {
    const res = await fetch(`${BASE_API_URL}/auth/register`, {
      method: "POST",
      // ✅ Content-Type header দেবেন না — browser নিজে multipart/form-data set করবে
      body: formData,
      credentials: "include",
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Registration failed",
      };
    }

    return {
      success: true,
      message: data.message || "Registration successful. Please check your email for verification code.",
      data: data.data,
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: error.message || "An error occurred during registration",
    };
  }
}