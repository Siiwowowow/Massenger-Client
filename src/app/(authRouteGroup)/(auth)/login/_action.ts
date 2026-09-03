/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  getRedirectAfterLogin,
  UserRole,
} from "@/lib/auth/authUtils";

import { httpClient } from "@/lib/axios/httpClient";
import { setTokenInCookies } from "@/lib/auth/tokenUtils";
import { ApiErrorResponse } from "@/types/api.types";
import { ILoginResponse } from "@/features/auth/types/auth.types";
import {
  ILoginPayload,
  loginZodSchema,
} from "@/features/auth/schemas/auth.schema";

import { redirect } from "next/navigation";

export const loginAction = async (
  payload: ILoginPayload,
  redirectPath?: string
): Promise<ILoginResponse | ApiErrorResponse> => {
  const parsedPayload = loginZodSchema.safeParse(payload);

  if (!parsedPayload.success) {
    const firstError =
      parsedPayload.error.issues[0]?.message || "Invalid input";

    return {
      success: false,
      message: firstError,
    };
  }

  try {
    const response = await httpClient.post<any>(
      "/auth/login",
      parsedPayload.data
    );

    const loginData = response?.data || response;
    const accessToken = loginData?.accessToken;
    const refreshToken = loginData?.refreshToken;
    const token = loginData?.token;
    const user = loginData?.user;

    if (!user || !accessToken) {
      return {
        success: false,
        message: loginData?.message || "Login failed - invalid credentials",
      };
    }

    const { role, needPasswordChange, email } = user;

    // ✅ set cookies - 7 days auto logout / continuous session
    const sevenDays = 7 * 24 * 60 * 60;
    const oneDay = 24 * 60 * 60;
    if (accessToken) await setTokenInCookies("accessToken", accessToken, oneDay, oneDay);
    if (refreshToken) await setTokenInCookies("refreshToken", refreshToken, sevenDays, sevenDays);
    if (token) {
      await setTokenInCookies(
        "better-auth.session_token",
        token,
        sevenDays,
        sevenDays
      );
    }

    // ✅ password change flow
    if (needPasswordChange) {
      redirect(`/reset-password?email=${email}`);
    }

    // ✅ Role অনুযায়ী redirect logic
    const finalRedirect = getRedirectAfterLogin(
      role as UserRole,
      redirectPath
    );

    console.log(`✅ User role: ${role}, redirecting to: ${finalRedirect}`);

    return {
      success: true,
      redirectUrl: finalRedirect,
      user
    } as any;
  } catch (error: any) {
    console.log(error, "login error");

    // ✅ handle email not verified
    if (
      error?.response?.data?.message === "Email not verified"
    ) {
      redirect(`/verify-email?email=${payload.email}`);
    }

    return {
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Login failed",
    };
  }
};