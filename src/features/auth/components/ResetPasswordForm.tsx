/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/auth/components/ResetPasswordForm.tsx
"use client";

import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resetPasswordZodSchema } from "@/features/auth/schemas/auth.schema";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendResetOtpAction, resetPasswordAction } from "@/app/(authRouteGroup)/(auth)/reset-password/_action";
import AppField from "@/components/shared/form/AppField";
import { cn } from "@/lib/utils";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  
  const [serverError, setServerError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailFromUrl) {
      router.push("/forgot-password");
    }
  }, [emailFromUrl, router]);

  const { mutateAsync: resetPassword, isPending: isResetting } = useMutation({
    mutationFn: (payload: any) => resetPasswordAction(payload),
  });

  const { mutateAsync: resendOtp, isPending: isResending } = useMutation({
    mutationFn: (email: string) => resendResetOtpAction(email),
  });

  const form = useForm({
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setOtpError(null);
      
      if (!emailFromUrl) {
        setServerError("Email is required");
        return;
      }

      // Validate OTP
      if (!value.otp || value.otp.length !== 6) {
        setOtpError("Verification code must be 6 digits");
        return;
      }

      try {
        const result = await resetPassword({
          email: emailFromUrl,
          otp: value.otp,
          newPassword: value.newPassword,
          confirmPassword: value.confirmPassword,
        }) as any;

        if (!result.success) {
          const errorMessage = result.message || "Failed to reset password";
          setServerError(errorMessage);
          toast.error(errorMessage);
          return;
        }

        toast.success(result.message);
        router.push("/login");
      } catch (error: any) {
        const errorMessage = `Failed to reset password: ${error.message}`;
        setServerError(errorMessage);
        toast.error(errorMessage);
      }
    },
  });

  const handleResendOtp = async () => {
    if (countdown > 0 || !emailFromUrl) return;

    try {
      const result = await resendOtp(emailFromUrl) as any;

      if (result.success) {
        toast.success(result.message);
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(result.message || "Failed to resend code");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setOtpValue(value);
    form.setFieldValue("otp", value);
    
    // Clear error when user types
    if (otpError) {
      setOtpError(null);
    }
  };

  if (!emailFromUrl) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter the code sent to{" "}
          <span className="font-medium">{emailFromUrl}</span> and your new password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          method="POST"
          action="#"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* OTP Input - Manual handling for errors */}
          <div className="space-y-2">
            <Label htmlFor="otp" className={cn(otpError && "text-destructive")}>
              Verification Code
            </Label>
            <div className="relative">
              <Input
                id="otp"
                name="otp"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otpValue}
                onChange={handleOtpChange}
                className={cn(
                  "text-center text-2xl tracking-[0.5em] font-mono",
                  otpError && "border-destructive focus-visible:ring-destructive/20"
                )}
                autoComplete="one-time-code"
                aria-invalid={!!otpError}
                aria-describedby={otpError ? "otp-error" : undefined}
              />
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {otpError && (
              <p id="otp-error" role="alert" className="text-sm text-destructive">
                {otpError}
              </p>
            )}
          </div>

          {/* New Password */}
          <form.Field
            name="newPassword"
            validators={{ 
              onChange: ({ value }) => {
                const result = resetPasswordZodSchema.shape.newPassword.safeParse(value);
                return result.success ? undefined : result.error.issues[0].message;
              }
            }}
          >
            {(field) => (
              <AppField
                field={field}
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                prepend={<Lock className="h-4 w-4 text-gray-400" />}
                append={
                  <Button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                }
              />
            )}
          </form.Field>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-gray-700">Password must contain:</p>
            <ul className="space-y-0.5 text-gray-600">
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                At least 6 characters
              </li>
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                One uppercase letter
              </li>
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                One lowercase letter
              </li>
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                One number
              </li>
            </ul>
          </div>

          {/* Confirm Password */}
          <form.Field
            name="confirmPassword"
            validators={{
              onChange: ({ value, fieldApi }) => {
                const newPassword = fieldApi.form.getFieldValue("newPassword");
                if (value !== newPassword) {
                  return "Passwords do not match";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <AppField
                field={field}
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                prepend={<Lock className="h-4 w-4 text-gray-400" />}
                append={
                  <Button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                }
              />
            )}
          </form.Field>

          {/* Resend Code Button */}
          <div className="text-right">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleResendOtp}
              disabled={isResending || countdown > 0}
              className="text-sm h-auto p-0"
            >
              {isResending
                ? "Sending..."
                : countdown > 0
                ? `Resend code in ${countdown}s`
                : "Didn't receive the code? Resend"}
            </Button>
          </div>

          {serverError && (
            <Alert variant={"destructive"}>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <AppSubmitButton
                isPending={isSubmitting || isResetting}
                pendingLabel="Resetting Password..."
                disabled={!canSubmit || !emailFromUrl}
              >
                Reset Password
              </AppSubmitButton>
            )}
          </form.Subscribe>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t pt-4">
        <Button variant="link" asChild className="text-sm">
          <Link href="/login">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ResetPasswordForm;
