//src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getDefaultDashboardRoute, getRouteOwner, isAuthRoute, UserRole } from "@/lib/auth/authUtils";
import { jwtUtils } from "@/lib/auth/jwtUtils";

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const pathWithQuery = `${pathname}${request.nextUrl.search}`;
    let accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    let tokenVerification = accessToken
      ? jwtUtils.verifyToken(accessToken, process.env.JWT_ACCESS_SECRET || "accesssecret")
      : null;
    let isValidAccessToken = !!tokenVerification?.success;
    let decodedAccessToken = tokenVerification?.data;

    let refreshedTokens: { accessToken: string; refreshToken: string; token?: string } | null = null;

    // ✅ If accessToken is missing or expired, but refreshToken exists -> silently refresh
    if (!isValidAccessToken && refreshToken) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
        const res = await fetch(`${baseUrl}/auth/refresh-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `refreshToken=${refreshToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.data?.accessToken) {
            refreshedTokens = {
              accessToken: json.data.accessToken,
              refreshToken: json.data.refreshToken || refreshToken,
              token: json.data.token,
            };
            accessToken = refreshedTokens.accessToken;
            tokenVerification = jwtUtils.verifyToken(
              refreshedTokens.accessToken,
              process.env.JWT_ACCESS_SECRET || "accesssecret"
            );
            if (tokenVerification?.success) {
              isValidAccessToken = true;
              decodedAccessToken = tokenVerification.data;
            }
          }
        }
      } catch (refreshErr) {
        console.error("Failed to refresh token in proxy:", refreshErr);
      }
    }

    let userRole: UserRole | null = null;
    if (decodedAccessToken?.role) {
      userRole = decodedAccessToken.role as UserRole;
    }

    const routeOwner = getRouteOwner(pathname);
    const isAuth = isAuthRoute(pathname);

    // Helper to attach newly refreshed cookies to outgoing responses
    const finalizeResponse = (res: NextResponse) => {
      if (refreshedTokens) {
        const isProduction = process.env.NODE_ENV === "production";
        const oneDay = 24 * 60 * 60;
        const sevenDays = 7 * 24 * 60 * 60;

        res.cookies.set("accessToken", refreshedTokens.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
          maxAge: oneDay,
        });

        if (refreshedTokens.refreshToken) {
          res.cookies.set("refreshToken", refreshedTokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: sevenDays,
          });
        }

        if (refreshedTokens.token) {
          res.cookies.set("better-auth.session_token", refreshedTokens.token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: sevenDays,
          });
        }
      }
      return res;
    };

    // Helper to create next() response while forwarding refreshed cookies to downstream Server Components
    const createNextResponse = () => {
      if (refreshedTokens) {
        request.cookies.set("accessToken", refreshedTokens.accessToken);
        if (refreshedTokens.refreshToken) {
          request.cookies.set("refreshToken", refreshedTokens.refreshToken);
        }
        if (refreshedTokens.token) {
          request.cookies.set("better-auth.session_token", refreshedTokens.token);
        }
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("cookie", request.cookies.toString());
        const res = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        return finalizeResponse(res);
      }
      return NextResponse.next();
    };

    // ✅ Rule 1: Logged-in users should not access auth pages
    if (isAuth && isValidAccessToken && pathname !== "/verify-email" && pathname !== "/reset-password") {
      return finalizeResponse(
        NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as UserRole), request.url))
      );
    }

    // ✅ Rule 2: Reset password page
    if (pathname === "/reset-password") {
      const email = request.nextUrl.searchParams.get("email");
      if (email || isValidAccessToken) {
        return createNextResponse();
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathWithQuery);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Rule 3: Public route -> allow
    if (routeOwner === null) {
      return createNextResponse();
    }

    // ✅ Rule 4: Not logged in but trying to access protected route -> redirect to login
    if (!isValidAccessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathWithQuery);
      const res = NextResponse.redirect(loginUrl);
      if (refreshToken) {
        res.cookies.delete("accessToken");
        res.cookies.delete("refreshToken");
        res.cookies.delete("better-auth.session_token");
      }
      return res;
    }

    // ✅ Rule 5: Common protected route -> allow (Profile, Change Password etc.)
    if (routeOwner === "COMMON") {
      return createNextResponse();
    }

    // ✅ Rule 6: Role based access control for ADMIN and USER
    if (routeOwner === "ADMIN") {
      // SUPER_ADMIN and ADMIN both can access admin routes
      if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
        return finalizeResponse(
          NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as UserRole), request.url))
        );
      }
    }

    if (routeOwner === "USER") {
      if (userRole !== "USER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        return finalizeResponse(
          NextResponse.redirect(new URL(getDefaultDashboardRoute(userRole as unknown as UserRole), request.url))
        );
      }
    }

    return createNextResponse();
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