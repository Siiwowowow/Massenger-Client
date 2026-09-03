"use server";

import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

export const setCookie = async (
    name : string,
    value : string,
    maxAgeInSeconds : number,
) => {
    try {
        const cookieStore = await cookies();

        cookieStore.set(name, value, {
            httpOnly : true,
            secure : isProduction,
            sameSite : "lax",
            path : "/",
            maxAge : maxAgeInSeconds,
        });
    } catch {
        // Next.js throws if cookies().set is called in Server Component render context
    }
}

export const getCookie = async (name : string) => {
    try {
        const cookieStore = await cookies();
        return cookieStore.get(name)?.value;
    } catch {
        return undefined;
    }
}

export const deleteCookie = async (name : string) => {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(name);
    } catch {
        // Ignore if unable to delete in current context
    }
}
