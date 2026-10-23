import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { updateSession } from "../lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

async function run() {
  console.log("===============================================================");
  console.log("TEST SUITE: Stale Auth Cookie Handling & Loop Prevention");
  console.log("===============================================================\n");

  // 1. Audit proxy.ts source code
  console.log("1. Auditing proxy.ts token failure handling & auto-clear guards...");
  const proxyPath = path.resolve(process.cwd(), "proxy.ts");
  const proxyCode = fs.readFileSync(proxyPath, "utf-8");

  assert(
    proxyCode.includes("refresh_token_not_found"),
    "proxy.ts must explicitly inspect 'refresh_token_not_found' error code."
  );
  assert(
    proxyCode.includes("error?.status === 400") || proxyCode.includes("error.status === 400"),
    "proxy.ts must handle 400 bad auth status."
  );
  assert(
    proxyCode.includes("maxAge: 0"),
    "proxy.ts must clear stale cookies with maxAge: 0."
  );
  assert(
    proxyCode.includes("from(\"profiles\")") || proxyCode.includes("from('profiles')"),
    "proxy.ts must verify profile resolution before redirecting to /dashboard."
  );
  console.log("   ✓ proxy.ts guards verified.");

  // 2. Audit lib/supabase/middleware.ts source code
  console.log("\n2. Auditing lib/supabase/middleware.ts auto-clear logic...");
  const middlewarePath = path.resolve(process.cwd(), "lib/supabase/middleware.ts");
  const middlewareCode = fs.readFileSync(middlewarePath, "utf-8");

  assert(
    middlewareCode.includes("error?.code === \"refresh_token_not_found\"") ||
    middlewareCode.includes("error?.code === 'refresh_token_not_found'"),
    "middleware.ts must check error?.code === 'refresh_token_not_found'."
  );
  assert(
    middlewareCode.includes("error?.status === 400") || middlewareCode.includes("error.status === 400"),
    "middleware.ts must check error?.status === 400."
  );
  assert(
    middlewareCode.includes("maxAge: 0"),
    "middleware.ts must set maxAge: 0 when wiping corrupted auth cookies."
  );
  console.log("   ✓ lib/supabase/middleware.ts verified.");

  // 3. Unit Test: Request to /login with NO cookies
  console.log("\n3. Testing /login with NO cookies...");
  const cleanLoginReq = new NextRequest("http://localhost:3000/login");
  const cleanLoginRes = await proxy(cleanLoginReq);
  assert.strictEqual(
    cleanLoginRes.headers.get("location"),
    null,
    "Request with no cookies must not redirect away from /login."
  );
  assert.strictEqual(cleanLoginRes.status, 200, "Should proceed to /login with HTTP 200.");
  console.log("   ✓ Proceeded to /login without redirect.");

  // 4. Unit Test: Request to /login with corrupted/stale auth cookie
  console.log("\n4. Testing /login with invalid/corrupted auth cookie...");
  const staleCookieName = "sb-yblhtchviuslhfwiwyuo-auth-token";
  const staleLoginReq = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: `${staleCookieName}=corrupted-or-expired-invalid-token;`,
    },
  });

  const staleLoginRes = await proxy(staleLoginReq);

  // Must NOT redirect to /dashboard
  assert.strictEqual(
    staleLoginRes.headers.get("location"),
    null,
    "Corrupted cookie must NOT redirect to /dashboard (breaks the ping-pong loop!)."
  );

  // Must have Set-Cookie header clearing the cookie with maxAge: 0
  const setCookie = staleLoginRes.headers.get("set-cookie") || "";
  assert(
    setCookie.includes(staleCookieName),
    "Response must include Set-Cookie header for the corrupted cookie."
  );
  assert(
    setCookie.includes("Max-Age=0") || setCookie.includes("max-age=0") || setCookie.includes("Expires="),
    "Set-Cookie header must invalidate the cookie (Max-Age=0)."
  );
  console.log("   ✓ Stale cookie caught: prevented redirect to /dashboard and auto-cleared cookie via Set-Cookie Max-Age=0.");

  // 5. Unit Test: updateSession in middleware.ts with corrupted token
  console.log("\n5. Testing updateSession auto-clear on corrupted token...");
  const updateSessionReq = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: `${staleCookieName}=corrupted-token-400;`,
    },
  });
  const updateSessionRes = await updateSession(updateSessionReq);
  const mwSetCookie = updateSessionRes.headers.get("set-cookie") || "";
  assert(
    mwSetCookie.includes(staleCookieName) && (mwSetCookie.includes("Max-Age=0") || mwSetCookie.includes("max-age=0")),
    "updateSession must clear corrupted Supabase cookie when auth returns 400 / refresh_token_not_found."
  );
  console.log("   ✓ updateSession successfully cleared corrupted auth cookie.");

  // 6. Integration Test: Live Request to /login with valid session
  console.log("\n6. Testing /login with verified active user session...");
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

      const validLoginReq = new NextRequest("http://localhost:3000/login", {
        headers: {
          cookie: cookieHeader,
        },
      });

      const validLoginRes = await proxy(validLoginReq);
      assert.strictEqual(
        validLoginRes.headers.get("location"),
        "http://localhost:3000/dashboard",
        "Valid session with resolved profile MUST redirect to /dashboard."
      );
      assert.strictEqual(validLoginRes.status, 307, "Redirect status must be 307.");
      console.log("   ✓ Verified session correctly redirected to /dashboard.");
    }
  }

  console.log("\n===============================================================");
  console.log("ALL STALE COOKIE & LOOP PREVENTION TESTS PASSED! 🚀");
  console.log("===============================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
