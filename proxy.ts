import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/p/");

  // Light-weight cookie-based session verification without remote Supabase roundtrips (<1ms)
  const allCookies = request.cookies.getAll();
  const authCookies = allCookies.filter(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value.trim().length > 0
  );
  const hasAuthCookie = authCookies.length > 0;

  // Route Guard: Ensure unauthenticated users are redirected to /login for all protected routes and root /
  if (!hasAuthCookie && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Safely Handle Token Failures when intercepting /login:
  // Do NOT assume a user is authenticated simply because an auth cookie exists.
  if (hasAuthCookie && pathname.startsWith("/login")) {
    try {
      let authResponse = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              authResponse = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                authResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { data, error } = await supabase.auth.getUser();

      const isInvalidRefreshToken =
        Boolean(error) &&
        (error?.code === "refresh_token_not_found" ||
          error?.status === 400 ||
          (error?.message && error.message.toLowerCase().includes("refresh token")));

      if (isInvalidRefreshToken || error || !data?.user) {
        // Clear corrupted Supabase cookies and let the request proceed to /login
        authCookies.forEach(({ name }) => {
          authResponse.cookies.set(name, "", { maxAge: 0, path: "/" });
        });
        return authResponse;
      }

      // Break Circular Fallbacks: Only redirect to /dashboard if user profile can be successfully resolved
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        // Profile cannot be resolved; clear cookies and stay on /login to prevent infinite bounce
        authCookies.forEach(({ name }) => {
          authResponse.cookies.set(name, "", { maxAge: 0, path: "/" });
        });
        return authResponse;
      }

      // Session verified and user profile resolved: Redirect to /dashboard
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    } catch {
      // In case of any unexpected failure, clear cookies and let user view login
      const errorResponse = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
      authCookies.forEach(({ name }) => {
        errorResponse.cookies.set(name, "", { maxAge: 0, path: "/" });
      });
      return errorResponse;
    }
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
