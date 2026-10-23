import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  let error: { code?: string; status?: number; message?: string } | null = null;

  try {
    const { data, error: authError } = await supabase.auth.getUser();
    user = data?.user ?? null;
    error = authError;
  } catch (err: unknown) {
    error = err as { code?: string; status?: number; message?: string };
  }

  // Auto-Clear Invalid Cookies on 400 Auth Errors or refresh_token_not_found
  if (error?.code === "refresh_token_not_found" || error?.status === 400) {
    const allCookies = request.cookies.getAll();
    const cookiesToClear = allCookies
      .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))
      .map((c) => c.name);

    // Clear corrupted Supabase cookies
    cookiesToClear.forEach((cookieName) => {
      supabaseResponse.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
    });
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Redirect unauthenticated user away from protected routes to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user away from login page to dashboard
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

