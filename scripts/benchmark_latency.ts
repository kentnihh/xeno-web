import { createServerClient } from "@supabase/ssr";
import assert from "node:assert";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

assert(url && key, "Missing Supabase env");

async function benchmark() {
  console.log("=== Benchmarking Route Latency ===");
  console.log("1. Authenticating as admin@xenoent.com via @supabase/ssr...");
  
  const cookiesMap = new Map<string, string>();
  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookiesMap.set(c.name, c.value);
        }
      },
    },
  });

  const { data: auth, error } = await client.auth.signInWithPassword({
    email: "admin@xenoent.com",
    password: "Password123!",
  });

  if (error || !auth.session) {
    console.error("Auth failed:", error?.message);
    process.exit(1);
  }

  console.log("   ✓ Authenticated:", auth.user?.email);

  const cookieHeader = Array.from(cookiesMap.entries())
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");

  async function testRoute(name: string, route: string, iterations = 3) {
    console.log(`\nTesting ${name} (${route}):`);
    const times: number[] = [];
    for (let i = 1; i <= iterations; i++) {
      const start = performance.now();
      const res = await fetch(`http://localhost:3000${route}`, {
        headers: {
          Cookie: cookieHeader,
        },
        redirect: "manual",
      });
      await res.text();
      const duration = performance.now() - start;
      times.push(duration);
      console.log(`  Run ${i}: ${duration.toFixed(1)}ms (HTTP ${res.status})`);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  -> Average Latency: ${avg.toFixed(1)}ms`);
    return avg;
  }

  await testRoute("/dashboard", "/dashboard");
  await testRoute("/settings/impersonate", "/settings/impersonate");
  await testRoute("/events", "/events");

  console.log("\n=== Benchmark Completed Successfully ===");
}

benchmark().catch(console.error);
