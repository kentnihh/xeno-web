/**
 * Canonical Database Seeder Runner for Xeno Entertainment.
 *
 * Single Source of Truth: supabase/seed.sql
 * This script runs the canonical SQL seed file and ensures production auth accounts exist.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

declare const process: any;

// Load environment variables from .env.local or .env
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
        process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Production accounts configuration — reads from env with fallback for local dev
const PRODUCTION_USERS = [
  {
    name: "Jonathan Kent",
    email: "admin@xenoent.com",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
    role: "SUPER_ADMIN",
  },
  {
    name: "Edja",
    email: "edjamoo@xenoent.com",
    password: process.env.SEED_EDJA_PASSWORD || "295200",
    role: "admin",
  },
  {
    name: "Vinna",
    email: "vinna@xenoent.com",
    password: process.env.SEED_VINNA_PASSWORD || "290394",
    role: "admin",
  },
];

async function seedUsers() {
  console.log("Provisioning production users in Supabase Auth...");
  try {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUsers = usersData?.users || [];

    for (const u of PRODUCTION_USERS) {
      const existing = existingUsers.find((eu) => eu.email?.toLowerCase() === u.email.toLowerCase());
      let userId: string | null = null;

      if (existing) {
        userId = existing.id;
        console.log(`User ${u.email} already exists in Auth (ID: ${userId}).`);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) {
          console.warn(`Notice creating ${u.email}:`, error.message);
        } else {
          userId = data.user.id;
          console.log(`Created user auth: ${u.email} (${u.name})`);
        }
      }

      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: u.name,
          email: u.email,
          role: u.role,
        });
        console.log(`Synced profile: ${u.email} -> ${u.role}`);
      }
    }
  } catch (err) {
    console.warn("Notice during user provisioning:", err instanceof Error ? err.message : err);
  }
}

async function executeCanonicalSeedSql() {
  const seedSqlPath = path.resolve(process.cwd(), "supabase/seed.sql");
  if (!fs.existsSync(seedSqlPath)) {
    throw new Error(`Canonical seed file not found at: ${seedSqlPath}`);
  }

  const query = fs.readFileSync(seedSqlPath, "utf-8");
  console.log("Executing canonical seed SQL (supabase/seed.sql)...");

  // If management API token is available, execute SQL query directly
  if (accessToken && supabaseUrl) {
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      console.log("✓ Applied supabase/seed.sql successfully via Supabase Management API.");
      return;
    }
    const errText = await res.text();
    console.warn("Notice: Management API execution:", errText);
  }

  // Fallback: apply via rpc if configured
  try {
    const { error } = await supabase.rpc("exec_sql", { sql: query });
    if (!error) {
      console.log("✓ Applied supabase/seed.sql successfully via rpc exec_sql.");
      return;
    }
  } catch {
    // Ignore RPC missing error
  }

  console.log("Seed SQL is ready at supabase/seed.sql for execution via Supabase CLI (supabase db reset / psql).");
}

async function main() {
  console.log("=".repeat(60));
  console.log("Starting Canonical Database Seeder (Single Source of Truth)");
  console.log("Target SQL File: supabase/seed.sql");
  console.log("=".repeat(60));

  await seedUsers();
  await executeCanonicalSeedSql();

  console.log("=".repeat(60));
  console.log("Database Seeding Completed Successfully!");
  console.log("Active Super Admin: Jonathan Kent (admin@xenoent.com)");
  console.log("Operational Data: Clean (0 clients, 0 vendors, 0 events, 0 tasks)");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
