// src/features/auth/services/auth.services.ts
"use server";

import { setTokenInCookies } from "@/lib/auth/tokenUtils";
import { jwtUtils } from "@/lib/auth/jwtUtils";
import { cookies } from "next/headers";
import { cache } from "react";


const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export interface IRefreshTokenData {
    accessToken: string;
    refreshToken: string;
    token: string;
}

async function safeJsonParse(res: Response) {
    try {
        const text = await res.text();
        if (!text || !text.trim()) return null;
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export async function getNewTokensWithRefreshToken(refreshToken: string): Promise<IRefreshTokenData | null> {
    try {
        const res = await fetch(`${BASE_API_URL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: `refreshToken=${refreshToken}`
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!res.ok) {
            return null;
        }

        const body = await safeJsonParse(res);
        if (!body?.data) return null;

        const { accessToken, refreshToken: newRefreshToken, token } = body.data;

        // Still persist to cookies for the next server-side request (non-middleware)
        try {
            if (accessToken) await setTokenInCookies("accessToken", accessToken, 24 * 60 * 60, 24 * 60 * 60);
            if (newRefreshToken) await setTokenInCookies("refreshToken", newRefreshToken, 7 * 24 * 60 * 60, 7 * 24 * 60 * 60);
            if (token) await setTokenInCookies("better-auth.session_token", token, 7 * 24 * 60 * 60, 7 * 24 * 60 * 60);
        } catch {
            // Ignored if called during RSC rendering
        }

        return { accessToken, refreshToken: newRefreshToken, token };
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
}


/**
 * Refreshes tokens AND returns the NEW token values directly.
 *
 * WHY: Next.js `cookies()` is request-scoped. When you call
 * `cookieStore.set(...)` inside a server action, the new value is sent
 * as a Set-Cookie response header but the in-memory `cookieStore` object
 * still reflects the ORIGINAL request cookies. Calling `cookieStore.get()`
 * again after a set` returns the old value, not the new one.
 *
 * Solution: return the token strings we just received from the API
 * and use them directly, bypassing the stale cookie store.
 */
async function refreshAndGetTokens(
    refreshToken: string
): Promise<{ accessToken: string; sessionToken: string } | null> {
    try {
        const res = await fetch(`${BASE_API_URL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: `refreshToken=${refreshToken}`
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!res.ok) return null;

        const body = await safeJsonParse(res);
        if (!body?.data) return null;

        const { accessToken, refreshToken: newRefreshToken, token } = body.data;

        if (!accessToken) return null;

        // Persist to cookies if allowed in current context
        try {
            await setTokenInCookies("accessToken", accessToken, 24 * 60 * 60, 24 * 60 * 60);
            if (newRefreshToken) await setTokenInCookies("refreshToken", newRefreshToken, 7 * 24 * 60 * 60, 7 * 24 * 60 * 60);
            if (token) await setTokenInCookies("better-auth.session_token", token, 7 * 24 * 60 * 60, 7 * 24 * 60 * 60);
        } catch {
            // Ignored in RSC render
        }

        return { accessToken, sessionToken: token ?? "" };
    } catch (error) {
        console.error("Error in refreshAndGetTokens:", error);
        return null;
    }
}

export const getUserInfo = cache(async () => {
    try {
        let cookieStore;
        try {
            cookieStore = await cookies();
        } catch {
            return null;
        }

        let accessToken = cookieStore.get("accessToken")?.value;
        const refreshToken = cookieStore.get("refreshToken")?.value;

        // Check if accessToken is missing or expired
        let isTokenValid = false;
        if (accessToken) {
            const verification = jwtUtils.verifyToken(accessToken, process.env.JWT_ACCESS_SECRET || "accesssecret");
            isTokenValid = !!verification?.success;
        }

        // If no valid accessToken but we have a refreshToken, get new tokens
        if (!isTokenValid && refreshToken) {
            const newTokens = await refreshAndGetTokens(refreshToken);
            if (newTokens?.accessToken) {
                accessToken = newTokens.accessToken;
            }
        }

        if (!BASE_API_URL || !accessToken) {
            return null;
        }

        // Send accessToken in both Cookie and Authorization header
        let res = await fetch(`${BASE_API_URL}/auth/me`, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Cookie: `accessToken=${accessToken}`,
                Authorization: `Bearer ${accessToken}`
            }
        });

        // 401 fallback: accessToken might be expired, try refreshing
        if (res.status === 401 && refreshToken) {
            const newTokens = await refreshAndGetTokens(refreshToken);
            if (newTokens) {
                res = await fetch(`${BASE_API_URL}/auth/me`, {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `accessToken=${newTokens.accessToken}`,
                        Authorization: `Bearer ${newTokens.accessToken}`
                    }
                });
            }
        }

        if (!res.ok) {
            return null;
        }

        const body = await safeJsonParse(res);
        const data = body?.data ?? body ?? null;
        if (data && typeof data === "object" && accessToken) {
            data.accessToken = accessToken;
        }
        return data;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
});

export async function logoutUser() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("better-auth.session_token");
        return true;
    } catch (error) {
        console.error("Logout failed", error);
        return false;
    }
}

