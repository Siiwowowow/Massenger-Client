//src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getDefaultDashboardRoute, getRouteOwner, isAuthRoute, UserRole } from "@/lib/auth/authUtils";
import { jwtUtils } from "@/lib/auth/jwtUtils";

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const pathWithQuery = `${pathname}${request.nextUrl.search}`;
    const accessToken = request.cookies.get("accessToken")?.value;

    const tokenVerification = accessToken ? jwtUtils.verifyToken(accessToken, process.env.JWT_ACCESS_SECRET || "accesssecret") : null;
    const decodedAccessToken = tokenVerification?.data;
    const isValidAccessToken = !!tokenVerification?.success;

    let userRole: UserRole | null = null;
    if (decodedAccessToken?.role) {
      userRole = decodedAccessToken.role as UserRole;
    }

    const routeOwner = getRouteOwner(pathname);
    const isAuth = isAuthRoute(pathname);

    // ✅ Rule 1: Logged-in users should not access auth pages
    if (isAuth && isValidAccessToken && pathname !== "/verify-email" && pathname !== "/reset-password") {
      return NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as UserRole), request.url));
    }

    // ✅ Rule 2: Reset password page
    if (pathname === "/reset-password") {
      const email = request.nextUrl.searchParams.get("email");
      if (email) {
        return NextResponse.next();
      }
      if (accessToken && isValidAccessToken) {
        return NextResponse.next();
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathWithQuery);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Rule 3: Public route -> allow
    if (routeOwner === null) {
      return NextResponse.next();
    }

    // ✅ Rule 4: Not logged in but trying to access protected route -> redirect to login
    if (!accessToken || !isValidAccessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathWithQuery);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Rule 5: Common protected route -> allow (Profile, Change Password etc.)
    if (routeOwner === "COMMON") {
      return NextResponse.next();
    }

    // ✅ Rule 6: Role based access control for ADMIN and USER
    if (routeOwner === "ADMIN") {
      // SUPER_ADMIN and ADMIN both can access admin routes
      if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as UserRole), request.url));
      }
    }

    if (routeOwner === "USER") {
      if (userRole !== "USER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as unknown as UserRole), request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Error in proxy middleware:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known).*)',
  ],
};