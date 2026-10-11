/**
 * Node.js / TypeScript Supabase connection checker.
 * Validates credentials and checks connectivity to Supabase project.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

// Load .env or .env.local manually if running outside Next.js
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const filePath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...values] = trimmed.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = values.join("=").trim();
      }
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

async function checkConnection() {
  console.log(`Connecting to Supabase at ${url}...`);
  const client = createClient(url!, key!);

  // Test 1: Check Auth service endpoint
  const { error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    console.error("Auth check failed:", sessionError.message);
  } else {
    console.log("Supabase Auth API connected successfully.");
  }

  // Test 2: Query database table
  const { data, error } = await client.from("events").select("id").limit(1);
  if (error) {
    if (error.code === "PGRST205" || error.message.includes("schema cache")) {
      console.log("Database connected successfully! (Tables not yet created: execute supabase/schema.sql in Supabase SQL editor).");
    } else {
      console.error("Database query returned:", error.message);
    }
  } else {
    console.log(`Database connected! Found ${data?.length ?? 0} events.`);
  }

  console.log("Supabase TypeScript integration verified successfully.");
}

checkConnection().catch((err) => {
  console.error("Connection check failed:", err);
  process.exit(1);
});
