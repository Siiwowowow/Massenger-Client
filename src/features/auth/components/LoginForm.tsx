/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/(authRouteGroup)/(auth)/login/_action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ILoginPayload, loginZodSchema } from "@/features/auth/schemas/auth.schema";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  MessageSquare,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/features/user/hooks/useUser";
import { toast } from "sonner";

interface LoginFormProps {
  redirectPath?: string;
  defaultEmail?: string;
}

export default function LoginForm({ redirectPath, defaultEmail = "" }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser } = useUser();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: ILoginPayload) => loginAction(payload, redirectPath),
  });

  const form = useForm({
    defaultValues: {
      email: defaultEmail,
      password: "",
    },

    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const result = (await mutateAsync(value)) as any;

        if (!result.success) {
          setServerError(result.message || "Login failed - please check your credentials");
          return;
        }

        toast.success("Welcome back!");
        if (result.accessToken && typeof window !== "undefined") {
          localStorage.setItem("pulse_access_token", result.accessToken);
        }
        if (result.user?.id && typeof window !== "undefined") {
          localStorage.setItem("pulse_user_id", result.user.id);
          localStorage.setItem("pulse_external_id", result.user.id);
        }
        setUser({ ...result.user, accessToken: result.accessToken });

        router.refresh();

        if (result.redirectUrl) {
          router.push(result.redirectUrl);
        } else {
          router.push("/");
        }
      } catch (error: any) {
        console.log(`Login failed: ${error.message}`);
        setServerError(`Login failed: ${error.message}`);
      }
    },
  });

  return (
    <div
      className="w-full max-w-[420px] mx-auto rounded-[24px] bg-white/95 backdrop-blur-md border border-[#e2e8f0] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-7 animate-fade-slide-in"
      style={{ colorScheme: "light" }}
    >
      {/* Top Brand Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#9ef01a] text-[#1a1a1a] flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
              Pulse Messenger
            </h1>
            <p className="text-[10px] font-medium text-slate-500 leading-tight">Real-Time Workspace</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-[#e2e8f0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9ef01a]" />
          Sign In
        </span>
      </div>

      {/* Title & Description */}
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sign in with your credentials to access your workspace.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <Alert variant="destructive" className="mb-4 py-2.5 px-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form
        method="POST"
        action="#"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Email Address Field */}
        <form.Field
          name="email"
          validators={{ onChange: loginZodSchema.shape.email }}
        >
          {(field) => {
            const error = field.state.meta.isTouched && field.state.meta.errors[0];
            return (
              <div className="space-y-1">
                <label
                  htmlFor={field.name}
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
                  <div className="pl-3.5 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="alex@example.com"
                    className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {String(error)}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        {/* Password Field */}
        <form.Field
          name="password"
          validators={{ onChange: loginZodSchema.shape.password }}
        >
          {(field) => {
            const error = field.state.meta.isTouched && field.state.meta.errors[0];
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={field.name}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-slate-900 hover:underline underline-offset-4 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
                  <div className="pl-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id={field.name}
                    name={field.name}
                    type={showPassword ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
                    style={{ colorScheme: "light" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {String(error)}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        {/* Primary Sign In Button: #9ef01a with dark text */}
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting || isPending}
              className="w-full h-10 mt-1 rounded-xl bg-[#9ef01a] hover:bg-[#8ee015] active:scale-[0.99] text-[#1a1a1a] font-semibold text-sm transition-all shadow-xs border-0 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting || isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1a1a1a]" />
                  <span>Signing in...</span>
                </span>
              ) : (
                <span>Sign In</span>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {/* Bottom Registration Link */}
      <div className="mt-4 pt-3 border-t border-[#e2e8f0] text-center">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-slate-950 font-semibold hover:underline underline-offset-4 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
