"use client";

import { useUser } from "@/features/user/hooks/useUser";
import { updateMyProfileService, removeProfilePhotoService } from "@/features/user/services/user.services";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const getInitials = (name?: string, email?: string) => {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "U";
};

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const initials = getInitials(user?.name, user?.email);

  // ✅ Photo upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
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
    setRemoving(true);
    const toastId = toast.loading("Removing photo...");
    const result = await removeProfilePhotoService();

    if (result.success) {
      toast.success("Photo removed!", { id: toastId });
      setUser({ ...user!, image: undefined });
      router.refresh();
    } else {
      toast.error(result.message || "Failed", { id: toastId });
    }
    setRemoving(false);
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
          <CardDescription>Manage your profile photo and information.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ✅ Avatar section */}
          <div className="flex flex-col items-center gap-4">
            {/* Avatar with upload overlay */}
            <div className="relative group">
              <Avatar size="lg" className="!size-28 text-2xl">
                <AvatarImage
                  src={user?.image || ""}
                  alt={user?.name || "User"}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              {/* Hover overlay — click to upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Change photo"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            {/* Upload / Remove buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Camera className="w-4 h-4 mr-2" /> {user?.image ? "Change photo" : "Upload photo"}</>
                )}
              </Button>

              {user?.image && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={removing}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {removing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" /> Remove</>
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              JPG, PNG or WebP. Max 5MB.
            </p>
          </div>

          {/* User info */}
          <div className="border-t pt-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{user?.name || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-1 rounded-md">
                {user?.role || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}