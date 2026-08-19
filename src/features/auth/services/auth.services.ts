// src/features/auth/services/auth.services.ts
"use server";

import { setTokenInCookies } from "@/lib/auth/tokenUtils";
import { cookies } from "next/headers";
import { cache } from "react";


const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export interface IRefreshTokenData {
    accessToken: string;
    refreshToken: string;
    token: string;
}

export async function getNewTokensWithRefreshToken(refreshToken: string): Promise<IRefreshTokenData | null> {
    try {
        const res = await fetch(`${BASE_API_URL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: `refreshToken=${refreshToken}`
            }
        });

        if (!res.ok) {
            return null;
        }

        const { data } = await res.json();
        const { accessToken, refreshToken: newRefreshToken, token } = data;

        // Still persist to cookies for the next server-side request (non-middleware)
        if (accessToken) await setTokenInCookies("accessToken", accessToken);
        if (newRefreshToken) await setTokenInCookies("refreshToken", newRefreshToken);
        if (token) await setTokenInCookies("better-auth.session_token", token, 24 * 60 * 60);

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
            }
        });

        if (!res.ok) return null;

        const { data } = await res.json();
        const { accessToken, refreshToken: newRefreshToken, token } = data;

        if (!accessToken) return null;

        // Persist to cookies so the NEXT request will have them
        await setTokenInCookies("accessToken", accessToken);
        if (newRefreshToken) await setTokenInCookies("refreshToken", newRefreshToken);
        if (token) await setTokenInCookies("better-auth.session_token", token, 24 * 60 * 60);

        return { accessToken, sessionToken: token ?? "" };
    } catch (error) {
        console.error("Error in refreshAndGetTokens:", error);
        return null;
    }
}

export const getUserInfo = cache(async () => {
    try {
        const cookieStore = await cookies();
        let accessToken = cookieStore.get("accessToken")?.value;
        const refreshToken = cookieStore.get("refreshToken")?.value;

        // If no accessToken but we have a refreshToken, get new tokens.
        // Use the RETURNED values directly — do NOT re-read cookieStore,
        // because cookieStore.get() still returns the old request cookies
        // after a set() call within the same request.
        if (!accessToken && refreshToken) {
            const newTokens = await refreshAndGetTokens(refreshToken);
            if (newTokens) {
                accessToken = newTokens.accessToken;
            }
        }

        if (!BASE_API_URL || !accessToken) {
            return null;
        }

        // Send ONLY the accessToken — this forces the backend checkAuth
        // middleware to use the JWT verification path, which is reliable.
        // Sending better-auth.session_token would trigger auth.api.getSession()
        // which can fail if the session has expired in the DB, causing 401
        // even when the JWT is perfectly valid.
        let res = await fetch(`${BASE_API_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Cookie: `accessToken=${accessToken}`
            }
        });

        // 401 fallback: accessToken might be expired, try refreshing
        if (res.status === 401 && refreshToken) {
            const newTokens = await refreshAndGetTokens(refreshToken);
            if (newTokens) {
                res = await fetch(`${BASE_API_URL}/auth/me`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `accessToken=${newTokens.accessToken}`
                    }
                });
            }
        }

        if (!res.ok) {
            console.error("Failed to fetch user info:", res.status, res.statusText);
            return null;
        }

        const { data } = await res.json();
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
