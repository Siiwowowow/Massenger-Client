/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppField from "@/components/shared/form/AppField";
import { useForm } from "@tanstack/react-form";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerAction } from "@/app/(authRouteGroup)/(auth)/register/_action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, X, Eye, EyeOff, User, Mail, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialLogin from "@/components/shared/socialLogin/socialLogin";

const RegisterForm = () => {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phoneNumber: "",
    },

    onSubmit: async ({ value }) => {
      setServerError(null);
      setIsLoading(true);

      if (!value.name || !value.email || !value.password) {
        setServerError("Name, email and password are required");
        setIsLoading(false);
        return;
      }

      if (value.password.length < 6) {
        setServerError("Password must be at least 6 characters");
        setIsLoading(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("name", value.name);
        formData.append("email", value.email);
        formData.append("password", value.password);
        formData.append("role", "USER");

        if (imageFile) {
          formData.append("profilePhoto", imageFile);
        }

        if (value.phoneNumber) {
          formData.append("phoneNumber", value.phoneNumber);
        }

        const result = await registerAction(formData) as any;

        if (!result.success) {
          setServerError(result.message);
          toast.error(result.message);
          setIsLoading(false);
          return;
        }

        toast.success("Registration successful! Please check your email.");
        router.push(`/verify-email?email=${encodeURIComponent(value.email)}`);
      } catch (err: any) {
        setServerError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 bg-gradient-to-br from-blue-50/30 via-white to-blue-50/20">
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600" />
        
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <User className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create Account
          </CardTitle>
          <CardDescription className="text-gray-500">
            Join BetterAuth and manage your secure account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8">
          {/* Avatar Upload Section */}
          <div className="flex justify-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full border-2 border-dashed border-blue-600/40 hover:border-blue-600 transition-all duration-200 flex items-center justify-center overflow-hidden bg-blue-50/30 hover:bg-blue-50/50"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-blue-600">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Upload photo</span>
                  </div>
                )}
              </button>
              {imagePreview && (
                <button
                  onClick={removeImage}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md z-10"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="name">
              {(field) => (
                <AppField
                  field={field}
                  label="Full Name"
                  placeholder="Enter your full name"
                  prepend={<User className="w-4 h-4 text-gray-400" />}
                  required
                />
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <AppField
                  field={field}
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  prepend={<Mail className="w-4 h-4 text-gray-400" />}
                  required
                />
              )}
            </form.Field>

            {/* Password Field */}
            <form.Field name="password">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                      placeholder="Create a password"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-10">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>
            <p className="text-xs text-gray-400 -mt-2">Minimum 6 characters</p>

            <form.Field name="phoneNumber">
              {(field) => (
                <AppField
                  field={field}
                  label="Phone Number"
                  placeholder="+880 1XXX XXXXXX"
                  prepend={<Phone className="w-4 h-4 text-gray-400" />}
                />
              )}
            </form.Field>

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm text-center">{serverError}</p>
              </div>
            )}

            <AppSubmitButton
              isPending={isLoading}
              pendingLabel="Creating account..."
              className="w-full"
            >
              Create Account
            </AppSubmitButton>
            <SocialLogin/>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;
