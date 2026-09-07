// src/lib/auth/authUtils.ts

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export const isAuthRoute = (pathname: string): boolean => {
  return authRoutes.some((route) => route === pathname);
};

export type RouteConfig = {
  exact: string[];
  pattern: RegExp[];
};

// User Protected Routes
export const userRoutes: RouteConfig = {
  exact: ["/dashboard", "/profile", "/user/dashboard"],
  pattern: [/^\/user\/.*/, /^\/profile\/.*/],
};

// Admin Routes
export const adminRoutes: RouteConfig = {
  exact: ["/admin/dashboard", "/admin/users"],
  pattern: [/^\/admin\/.*/],
};

// Common Protected Routes
export const commonProtectedRoutes: RouteConfig = {
  exact: ["/change-password"],
  pattern: [],
};

export const isRouteMatches = (pathname: string, routes: RouteConfig): boolean => {
  if (routes.exact.includes(pathname)) return true;
  return routes.pattern.some((pattern) => pattern.test(pathname));
};

export const getRouteOwner = (
  pathname: string
): "ADMIN" | "USER" | "COMMON" | null => {
  if (isRouteMatches(pathname, adminRoutes)) return "ADMIN";
  if (isRouteMatches(pathname, userRoutes)) return "USER";
  if (isRouteMatches(pathname, commonProtectedRoutes)) return "COMMON";
  return null;
};

// ✅ Role অনুযায়ী Dashboard Route
export const getDefaultDashboardRoute = (role: UserRole): string => {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/";
    case "USER":
      return "/";
    default:
      return "/";
  }
};

export const isValidRedirectForRole = (redirectPath: string, role: UserRole): boolean => {
  const sanitizedRedirectPath = redirectPath.split("?")[0] || redirectPath;
  const routeOwner = getRouteOwner(sanitizedRedirectPath);

  if (routeOwner === null || routeOwner === "COMMON") return true;

  // SUPER_ADMIN can access admin routes
  if (routeOwner === "ADMIN" && (role === "SUPER_ADMIN" || role === "ADMIN")) return true;
  if (routeOwner === role) return true;

  return false;
};

// ✅ লগইন বা রেজিস্ট্রেশনের পর রিডাইরেক্ট
export const getRedirectAfterLogin = (role: UserRole, redirectPath?: string): string => {
  if (redirectPath && isValidRedirectForRole(redirectPath, role)) {
    return redirectPath;
  }
  return getDefaultDashboardRoute(role);
};
