// src/constants/routes.ts

export const ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    VERIFY_EMAIL: "/verify-email",
    PROFILE: "/profile",
  },
  DASHBOARD: {
    USER: "/user/dashboard",
    ADMIN: "/admin/dashboard",
  },
} as const;
