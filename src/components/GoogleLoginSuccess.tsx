//src/components/GoogleLoginSuccess.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@/features/user/hooks/useUser";

export function GoogleLoginSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useUser();
  const shownRef = useRef(false);

  useEffect(() => {
    const loginStatus = searchParams.get("login");
    if (!loginStatus) return; // ✅ Do not run or replace route if no login query param

    if (shownRef.current) return;
    shownRef.current = true;

    const fetchUser = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) return;
        const text = await res.text();
        if (!text || !text.trim()) return;
        const data = JSON.parse(text);
        if (data?.data) {
          setUser(data.data);
        }
      } catch (err) {
        console.log(err);
      }
    };

    if (loginStatus === "success") {
      setTimeout(() => {
        toast.success("Logged in successfully! 🎉", {
          duration: 2500,
        });
      }, 100);

      fetchUser();
    }

    if (loginStatus === "error") {
      setTimeout(() => {
        toast.error("Login failed. Please try again.", {
          duration: 2500,
        });
      }, 100);
    }

    router.replace("/");
  }, [searchParams, router, setUser]);

  return null;
}