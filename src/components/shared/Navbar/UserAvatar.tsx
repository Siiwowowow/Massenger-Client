"use client";

import { useUser } from "@/features/user/hooks/useUser";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera, Trash2, LogOut, User } from "lucide-react";
import Link from "next/link";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "@/components/ui/avatar";
import { removeProfilePhotoService, updateMyProfileService } from "@/features/user/services/user.services";

const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "U";
};

export default function UserAvatar() {
  const { user, setUser, logout } = useUser();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initials = getInitials(user?.name, user?.email);

  // ✅ Outside click এ dropdown বন্ধ
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ✅ Photo upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setOpen(false);
    const toastId = toast.loading("Uploading photo...");

    const formData = new FormData();
    formData.append("profilePhoto", file);

    const result = await updateMyProfileService(formData);

    if (result.success) {
      toast.success("Profile photo updated!", { id: toastId });
      setUser({ ...user!, image: result.data?.image });
      router.refresh();
    } else {
      toast.error(result.message || "Upload failed", { id: toastId });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ Photo remove
  const handleRemovePhoto = async () => {
    setOpen(false);
    const toastId = toast.loading("Removing photo...");
    const result = await removeProfilePhotoService();

    if (result.success) {
      toast.success("Photo removed!", { id: toastId });
      setUser({ ...user!, image: undefined });
      router.refresh();
    } else {
      toast.error(result.message || "Failed to remove photo", { id: toastId });
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    setOpen(false);
    toast.loading("Logging out...", { id: "logout" });
    await logout();
    toast.success("Logged out successfully!", { id: "logout" });
  };

  return (
    <div ref={dropdownRef} className="relative">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ✅ Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus:outline-none"
        aria-label="Open user menu"
      >
        <Avatar size="lg" className="cursor-pointer hover:opacity-90 transition-opacity">
          {uploading ? (
            <AvatarFallback>
              <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
            </AvatarFallback>
          ) : (
            <>
              {/* ✅ image থাকলেই render করুন — empty string দেবেন না */}
              {user?.image && (
                <AvatarImage
                  src={user.image}
                  alt={user?.name || "User"}
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </>
          )}
          <AvatarBadge>
            <Camera strokeWidth={2.5} />
          </AvatarBadge>
        </Avatar>
      </button>

      {/* ✅ Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">

          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <Avatar>
              {/* ✅ image থাকলেই render করুন */}
              {user?.image && (
                <AvatarImage
                  src={user.image}
                  alt={user?.name || "User"}
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback className="bg-gray-200 text-gray-700">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* ✅ Profile page link */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              My profile
            </Link>
          </div>

          {/* Photo options */}
          <div className="border-t border-gray-100 dark:border-gray-800 py-1">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Camera className="w-4 h-4 flex-shrink-0" />
              {user?.image ? "Change photo" : "Upload photo"}
            </button>

            {/* image থাকলেই Remove দেখাবে */}
            {user?.image && (
              <button
                onClick={handleRemovePhoto}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4 flex-shrink-0" />
                Remove photo
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 dark:border-gray-800 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}