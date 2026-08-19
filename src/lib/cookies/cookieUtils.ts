"use server";

import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

export const setCookie = async (
    name : string,
    value : string,
    maxAgeInSeconds : number,
) => {
    const cookieStore = await cookies();

    cookieStore.set(name, value, {
        httpOnly : true,
        secure : isProduction,
        sameSite : "lax",
        path : "/",
        maxAge : maxAgeInSeconds,
    })
}

export const getCookie = async (name : string) => {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
}

export const deleteCookie = async (name : string) => {
    const cookieStore = await cookies();
    cookieStore.delete(name);
}
