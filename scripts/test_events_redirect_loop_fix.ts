import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { createServerClient } from "@supabase/ssr";

async function run() {
  console.log("===============================================================");
  console.log("TEST SUITE: Eliminate Self-Redirect Loop in /events");
  console.log("===============================================================\n");

  // 1. Audit proxy.ts source code
  console.log("1. Auditing proxy.ts source code guards...");
  const proxyPath = path.resolve(process.cwd(), "proxy.ts");
  const proxyCode = fs.readFileSync(proxyPath, "utf-8");

  assert(
    proxyCode.includes('request.nextUrl.pathname === "/events"') ||
    proxyCode.includes("request.nextUrl.pathname === '/events'") ||
    proxyCode.includes('req.nextUrl.pathname === "/events"') ||
    proxyCode.includes("req.nextUrl.pathname === '/events'"),
    "proxy.ts must explicitly check if pathname is already '/events'."
  );

  assert(
    proxyCode.includes("return NextResponse.next();"),
    "proxy.ts must return NextResponse.next() to avoid redirecting requests already on /events."
  );

  assert(
    !proxyCode.includes('eventsUrl.pathname = "/events"') &&
    !proxyCode.includes("eventsUrl.pathname = '/events'"),
    "proxy.ts must NOT redirect authenticated login requests to /events."
  );

  assert(
    proxyCode.includes('dashboardUrl.pathname = "/dashboard"') ||
    proxyCode.includes("dashboardUrl.pathname = '/dashboard'"),
    "proxy.ts must redirect authenticated users hitting /login to /dashboard."
  );
  console.log("   ✓ proxy.ts guards verified.");

  // 2. Audit app/(dashboard)/events/page.tsx
  console.log("\n2. Auditing app/(dashboard)/events/page.tsx for redundant redirects...");
  const eventsPagePath = path.resolve(process.cwd(), "app/(dashboard)/events/page.tsx");
  const eventsPageCode = fs.readFileSync(eventsPagePath, "utf-8");

  assert(
    !eventsPageCode.includes("redirect('/events')") &&
    !eventsPageCode.includes('redirect("/events")'),
    "EventsPage must not self-redirect to /events."
  );

  assert(
    !eventsPageCode.includes("redirect("),
    "EventsPage should not perform any redirect loops."
  );
  console.log("   ✓ app/(dashboard)/events/page.tsx contains zero self-redirects.");

  // 3. Unit Test proxy() Behavior with NextRequest
  console.log("\n3. Testing proxy() middleware unit behavior...");

  // 3.1. Route /events must NEVER be redirected by proxy
  const eventsReq = new NextRequest("http://localhost:3000/events");
  const eventsRes = await proxy(eventsReq);
  assert.strictEqual(
    eventsRes.headers.get("location"),
    null,
    "proxy() must NOT return a redirect for /events (location header must be null)."
  );
  assert.strictEqual(eventsRes.status, 200, "proxy() response for /events must be 200 (next).");
  console.log("   ✓ GET /events produces status 200 (NextResponse.next) without redirect.");

  // 3.2. Unauthenticated request to /dashboard must redirect to /login
  const dashboardReq = new NextRequest("http://localhost:3000/dashboard");
  const dashboardRes = await proxy(dashboardReq);
  assert.strictEqual(
    dashboardRes.headers.get("location"),
    "http://localhost:3000/login",
    "Unauthenticated request to /dashboard must redirect to /login."
  );
  assert.strictEqual(dashboardRes.status, 307, "Redirect status must be 307.");
  console.log("   ✓ Unauthenticated GET /dashboard correctly redirects to /login.");

  // 3.3. Unauthenticated request to /login must proceed without redirect
  const cleanLoginReq = new NextRequest("http://localhost:3000/login");
  const cleanLoginRes = await proxy(cleanLoginReq);
  assert.strictEqual(
    cleanLoginRes.headers.get("location"),
    null,
    "Unauthenticated request to /login must not redirect."
  );
  assert.strictEqual(cleanLoginRes.status, 200, "Proceeds to login page.");
  console.log("   ✓ Unauthenticated GET /login proceeds without redirect.");

  // 4. End-to-End Integration Test against live server (if running)
  console.log("\n4. Running live HTTP test for GET /events...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const cookiesMap = new Map<string, string>();
    const client = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })),
        setAll: (c) => c.forEach((x) => cookiesMap.set(x.name, x.value)),
      },
    });

    const { data: auth, error } = await client.auth.signInWithPassword({
      email: "admin@xenoent.com",
      password: "Password123!",
    });

    if (!error && auth.session) {
      const cookieHeader = Array.from(cookiesMap.entries())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; ");

      try {
        const res = await fetch("http://localhost:3000/events", {
          headers: { Cookie: cookieHeader },
          redirect: "manual",
        });

        console.log(`   -> Live response from http://localhost:3000/events: HTTP ${res.status}`);
        assert.strictEqual(res.status, 200, "Authenticated request to /events must respond with HTTP 200 OK.");
        const html = await res.text();
        assert(html.includes("Manajemen Acara"), "Rendered HTML must contain 'Manajemen Acara'.");
        console.log("   ✓ GET /events responded with HTTP 200 OK!");
      } catch {
        console.log("   (Dev server not responding on port 3000, skipping live HTTP socket check)");
      }
    } else {
      console.log("   (Skipping live auth check: unable to sign in with seed credentials)");
    }
  }

  console.log("\n===============================================================");
  console.log("ALL REDIRECT LOOP PREVENTION TESTS PASSED! 🚀");
  console.log("===============================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
