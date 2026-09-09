// src/features/user/types/user.types.ts
export interface ICurrentUser {
  id: string;
  email: string;
  name?: string;

  image?: string | null; // Google / OAuth image

  // ✅ ADD THIS
  uploadedImage?: string | null;

  role?: string;
  status?: string;
  accessToken?: string;
}
