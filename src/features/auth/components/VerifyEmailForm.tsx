/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/auth/components/VerifyEmailForm.tsx
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
import { verifyEmailZodSchema } from "@/features/auth/schemas/auth.schema";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AppField from "@/components/shared/form/AppField";

import { safeJsonParseText } from "@/lib/utils";

// Define the functions inline since the imports might not be working
const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function verifyEmailAction(payload: { email: string; otp: string }) {
  try {
    const validated = verifyEmailZodSchema.safeParse({ otp: payload.otp });
    if (!validated.success) {
      return {
        success: false,
        message: validated.error.issues[0].message,
      };
    }

    const res = await fetch(`${BASE_API_URL}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        otp: payload.otp,
      }),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Email verification failed",
      };
    }

    return {
      success: true,
      message: "Email verified successfully",
      data: data.data,
    };
  } catch (error: any) {
    console.error("Email verification error:", error);
    return {
      success: false,
      message: error.message || "An error occurred during email verification",
    };
  }
}

async function resendOtpAction(email: string) {
  try {
    const res = await fetch(`${BASE_API_URL}/auth/resend-verification-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const text = await res.text();
    const data = safeJsonParseText(text, {});

    if (!res.ok) {
      return {
        success: false,
        message: data?.message || "Failed to resend OTP",
      };
    }

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return {
      success: false,
      message: error.message || "An error occurred while resending OTP",
    };
  }
}

const VerifyEmailForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!emailFromUrl) {
      router.push("/login");
    }
  }, [emailFromUrl, router]);

  const { mutateAsync: verifyEmail, isPending: isVerifying } = useMutation({
    mutationFn: (payload: { email: string; otp: string }) =>
      verifyEmailAction(payload),
  });

  const { mutateAsync: resendOtp, isPending: isResending } = useMutation({
    mutationFn: (email: string) => resendOtpAction(email),
  });

  const form = useForm({
    defaultValues: {
      otp: "",
    },

    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const result = await verifyEmail({
          email: emailFromUrl,
          otp: value.otp,
        }) as any;

        if (!result.success) {
          const errorMessage = result.message || "Verification failed";
          setServerError(errorMessage);
          toast.error(errorMessage);
          return;
        }

        toast.success("Email verified successfully! You can now login.");
        router.push("/login");
      } catch (error: any) {
        const errorMessage = `Verification failed: ${error.message}`;
        setServerError(errorMessage);
        toast.error(errorMessage);
      }
    },
  });

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    try {
      const result = await resendOtp(emailFromUrl) as any;
      
      if (result.success) {
        toast.success("A new verification code has been sent to your email.");
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
        toast.error(result.message || "Failed to send OTP. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP");
    }
  };

  if (!emailFromUrl) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        <CardDescription>
          We&lsquo;ve sent a verification code to{" "}
          <span className="font-medium">{emailFromUrl}</span>
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
          <form.Field
            name="otp"
            validators={{ onChange: verifyEmailZodSchema.shape.otp }}
          >
            {(field) => (
              <AppField
                field={field}
                label="Verification Code"
                type="text"
                placeholder="Enter 6-digit code"
                className="text-center text-2xl tracking-widest"
              />
            )}
          </form.Field>

          {serverError && (
            <Alert variant={"destructive"}>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <AppSubmitButton
                isPending={isSubmitting || isVerifying}
                pendingLabel="Verifying..."
                disabled={!canSubmit}
              >
                Verify Email
              </AppSubmitButton>
            )}
          </form.Subscribe>
        </form>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={handleResendOtp}
            disabled={isResending || countdown > 0}
            className="text-sm"
          >
            {isResending
              ? "Sending..."
              : countdown > 0
              ? `Resend code in ${countdown}s`
              : "Didn't receive the code? Resend"}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Back to Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default VerifyEmailForm;
