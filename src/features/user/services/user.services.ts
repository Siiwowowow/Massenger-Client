// src/features/user/services/user.services.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { cookies } from "next/headers";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function safeJsonParse(res: Response) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ✅ Profile photo upload / name update
export async function updateMyProfileService(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${BASE_API_URL}/users/update-my-profile`, {
      method: "PATCH",
      headers: {
        Cookie: allCookies,
        // ✅ Content-Type দেবেন না — browser নিজে multipart/form-data set করে
      },
      body: formData,
    });

    const data = await safeJsonParse(res);

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Update failed",
      };
    }

    return {
      success: true,
      data: data?.data,
    };
  } catch (error: any) {
    console.error("Profile update error:", error);
    return {
      success: false,
      message: error.message || "Update failed",
    };
  }
}

// ✅ Profile photo remove
export async function removeProfilePhotoService() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${BASE_API_URL}/users/remove-profile-photo`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies,
      },
    });

    const data = await safeJsonParse(res);

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Failed to remove photo",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Remove photo error:", error);
    return {
      success: false,
      message: error.message || "Failed to remove photo",
    };
  }
}

