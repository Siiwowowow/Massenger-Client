//src/lib/auth/tokenUtils.ts
"use server"

import jwt, { JwtPayload } from "jsonwebtoken";
import { setCookie } from "@/lib/cookies/cookieUtils";


const getTokenSecondsRemaining =  (token: string): number => {
    if(!token) return 0;
    try {
        const tokenPayload= jwt.decode(token) as JwtPayload;

        if (tokenPayload && !tokenPayload.exp){
            return 0;
        }

        const remainingSeconds = tokenPayload.exp as number - Math.floor(Date.now() / 1000)

        return remainingSeconds > 0 ? remainingSeconds : 0;

    } catch (error) {
        console.error("Error decoding token:", error);
        return 0;
    }
} 

export const setTokenInCookies = async (
    name : string,
    token : string,
    fallbackMaxAgeInSeconds = 60 * 60 * 24, // 1 day
    overrideMaxAge ?: number
) => {
    let maxAgeInSeconds: number;

    if (overrideMaxAge) {
        maxAgeInSeconds = overrideMaxAge;
    } else if (name !== "better-auth.session_token") {
        const remaining = getTokenSecondsRemaining(token);
        maxAgeInSeconds = remaining > 0 ? remaining : fallbackMaxAgeInSeconds;
    } else {
        maxAgeInSeconds = fallbackMaxAgeInSeconds;
    }

    await setCookie(name, token, maxAgeInSeconds);
}


export async function isTokenExpiringSoon(token: string, thresholdInSeconds = 300) : Promise<boolean> {
    const remainingSeconds = getTokenSecondsRemaining(token);
    return remainingSeconds > 0 && remainingSeconds <= thresholdInSeconds;
}

export async function isTokenExpired(token: string) : Promise<boolean> {
    const remainingSeconds = getTokenSecondsRemaining(token);
    return remainingSeconds === 0;
}
