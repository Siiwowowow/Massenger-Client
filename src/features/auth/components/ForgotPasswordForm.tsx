/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/auth/components/ForgotPasswordForm.tsx
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
import { forgotPasswordZodSchema } from "@/features/auth/schemas/auth.schema";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import AppField from "@/components/shared/form/AppField";
import { forgotPasswordAction } from "@/app/(authRouteGroup)/(auth)/forgot-password/_action";

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: { email: string }) => forgotPasswordAction(payload),
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },

    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const result = await mutateAsync(value) as any;

        if (!result.success) {
          const errorMessage = result.message || "Failed to send reset code";
          setServerError(errorMessage);
          toast.error(errorMessage);
          return;
        }

        setSubmittedEmail(value.email);
        setIsSubmitted(true);
        toast.success(result.message);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(value.email)}`);
        }, 3000);
      } catch (error: any) {
        const errorMessage = `Failed to send reset code: ${error.message}`;
        setServerError(errorMessage);
        toast.error(errorMessage);
      }
    },
  });

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We&rsquo;ve sent a password reset code to{" "}
            <span className="font-medium">{submittedEmail}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Copy the 6-digit verification code</li>
              <li>Enter the code on the next page</li>
              <li>Create your new password</li>
            </ol>
          </div>

          <Button
            className="w-full"
            onClick={() =>
              router.push(`/reset-password?email=${encodeURIComponent(submittedEmail)}`)
            }
          >
            Continue to Reset Password
          </Button>

          <p className="text-sm text-gray-500 text-center">
            Redirecting automatically in a few seconds...
          </p>
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
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
        <CardDescription>
          No worries! Enter your email and we&lsquo;ll send you a code to reset your password.
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
            name="email"
            validators={{ onChange: forgotPasswordZodSchema.shape.email }}
          >
            {(field) => (
              <AppField
                field={field}
                label="Email Address"
                type="email"
                placeholder="Enter your registered email"
                prepend={<Mail className="h-4 w-4 text-gray-400" />}
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
                isPending={isSubmitting || isPending}
                pendingLabel="Sending Code..."
                disabled={!canSubmit}
              >
                Send Reset Code
              </AppSubmitButton>
            )}
          </form.Subscribe>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default ForgotPasswordForm;
