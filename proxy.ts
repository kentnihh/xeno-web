import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/p/");

  // Light-weight cookie-based session verification without remote Supabase roundtrips (<1ms)
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value.trim().length > 0
  );

  // Route Guard: Ensure unauthenticated users are redirected to /login for all protected routes and root /
  if (!hasAuthCookie && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login to /events
  if (hasAuthCookie && pathname.startsWith("/login")) {
    const eventsUrl = request.nextUrl.clone();
    eventsUrl.pathname = "/events";
    return NextResponse.redirect(eventsUrl);
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
