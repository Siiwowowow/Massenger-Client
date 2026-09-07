/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { registerAction } from "@/app/(authRouteGroup)/(auth)/register/_action";
import {
  User,
  Mail,
  Lock,
  Camera,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [serverError, setServerError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Password Strength Calculator (red -> yellow -> #9ef01a green)
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "bg-slate-200", width: "0%" };
    if (password.length < 6) {
      return { level: 1, label: "Weak", color: "bg-rose-500", width: "33%" };
    }
    const hasNumber = /\d/.test(password);
    const hasSpecialOrUpper = /[!@#$%^&*(),.?":{}|<>A-Z]/.test(password);

    if (password.length >= 8 && hasNumber && hasSpecialOrUpper) {
      return { level: 3, label: "Strong", color: "bg-[#9ef01a]", width: "100%" };
    }
    if (password.length >= 6 && (hasNumber || hasSpecialOrUpper)) {
      return { level: 2, label: "Medium", color: "bg-amber-400", width: "66%" };
    }
    return { level: 1, label: "Weak", color: "bg-rose-500", width: "33%" };
  }, [password]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!name.trim()) {
      setServerError("Please enter your full name");
      return;
    }
    if (!email.trim()) {
      setServerError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setServerError("Please create a password");
      return;
    }
    if (password.length < 6) {
      setServerError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setServerError("Passwords do not match");
      return;
    }
    if (!termsAccepted) {
      setServerError("Please accept the Terms of Service to continue");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("role", "USER");

      if (imageFile) {
        formData.append("profilePhoto", imageFile);
      }

      const result = (await registerAction(formData)) as any;

      if (!result.success) {
        setServerError(result.message || "Registration failed");
        toast.error(result.message || "Registration failed");
        return;
      }

      toast.success("Account created successfully!");
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred");
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-[420px] mx-auto rounded-[22px] bg-white/95 backdrop-blur-md border border-[#e2e8f0] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 sm:p-5 animate-fade-slide-in"
      style={{ colorScheme: "light" }}
    >
      {/* Top Brand Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#9ef01a] text-[#1a1a1a] flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-tight">
              Pulse Messenger
            </h1>
            <p className="text-[10px] font-medium text-slate-500 leading-tight">Real-Time Workspace</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-[#e2e8f0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9ef01a]" />
          Register
        </span>
      </div>

      {/* Title & Description */}
      <div className="mb-2.5">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
          Create your account
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Fill in your profile details to join your workspace.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <Alert variant="destructive" className="mb-2.5 py-1.5 px-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Profile Photo Upload */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 border border-[#eef1f5]">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-11 h-11 rounded-full border-2 border-dashed border-[#d7dbe3] hover:border-slate-700 transition-all duration-150 flex items-center justify-center overflow-hidden bg-white hover:bg-slate-50 group cursor-pointer"
              aria-label="Upload profile photo"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-700 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              )}
            </button>

            {imagePreview && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 shadow-xs cursor-pointer"
                aria-label="Remove photo"
              >
                <X size={9} />
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

          <div className="text-xs text-slate-600 min-w-0 flex-1">
            <p className="font-semibold text-slate-800 text-xs leading-tight">
              Profile photo <span className="text-slate-400 font-normal">(optional)</span>
            </p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">PNG, JPG or WEBP up to 5MB</p>
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
            <div className="pl-3.5 text-slate-400 pointer-events-none">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              required
              className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
              style={{ colorScheme: "light" }}
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
            <div className="pl-3.5 text-slate-400 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
              style={{ colorScheme: "light" }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
            <div className="pl-3.5 text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
              style={{ colorScheme: "light" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pr-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Dynamic Password Strength Meter */}
          {password.length > 0 && (
            <div className="pt-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                <span>
                  Strength: <strong className="text-slate-800 font-semibold">{passwordStrength.label}</strong>
                </span>
                <span>Min. 6 chars</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Confirm Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative input-human-focus rounded-xl border border-[#d7dbe3] bg-white flex items-center overflow-hidden">
            <div className="pl-3.5 text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              className="w-full bg-transparent px-3 py-2 text-sm text-black placeholder:text-slate-400 outline-none font-sans auth-input"
              style={{ colorScheme: "light" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="pr-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-rose-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Passwords do not match
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="pt-0.5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#d7dbe3] accent-[#9ef01a] cursor-pointer"
            />
            <span className="text-xs text-slate-500 leading-snug">
              I agree to the <span className="text-slate-800 underline">Terms of Service</span> and{" "}
              <span className="text-slate-800 underline">Privacy Policy</span>.
            </span>
          </label>
        </div>

        {/* Primary Create Account Button: #9ef01a */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-9.5 mt-1 rounded-xl bg-[#9ef01a] hover:bg-[#8ee015] active:scale-[0.99] text-[#1a1a1a] font-semibold text-sm transition-all shadow-xs border-0 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#1a1a1a]" />
              <span>Creating Account...</span>
            </span>
          ) : (
            <span>Create Account</span>
          )}
        </Button>
      </form>

      {/* Bottom Login Link */}
      <div className="mt-3.5 pt-2.5 border-t border-[#e2e8f0] text-center">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-slate-950 font-semibold hover:underline underline-offset-4 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
