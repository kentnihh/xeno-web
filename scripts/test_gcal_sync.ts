import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import { google } from "googleapis";

console.log("=== Running Google Calendar Sync Integration Tests ===\n");

// Test 1: RFC 2938 Base32hex ID generation
console.log("Test 1: Validating Base32hex Event ID format for Google Calendar");
function toGCalEventId(eventId: string): string {
  const clean = eventId.toLowerCase().replace(/[^0-9a-v]/g, "");
  if (clean.length >= 5 && clean.length <= 1000) {
    return `ev${clean}`.slice(0, 1024);
  }
  const hash = crypto.createHash("md5").update(eventId).digest("hex");
  return `ev${hash}`;
}

const gcalIdRegex = /^[0-9a-v]{5,1024}$/;
const testIds = [
  "66666666-6666-6666-6666-666666666666",
  "77777777-7777-7777-7777-777777777777",
  "custom-event-12345",
  "id_with_xyz_characters",
];

for (const id of testIds) {
  const result = toGCalEventId(id);
  assert(
    gcalIdRegex.test(result),
    `Generated ID "${result}" must match base32hex regex [0-9a-v]{5,1024}`
  );
  console.log(`  ✓ toGCalEventId("${id}") -> "${result}" (valid base32hex)`);
}

// Test 2: Missing environment variables check
console.log("\nTest 2: Validating strict error throwing on missing environment variables");
function validateEnvVars(email?: string, key?: string, calId?: string) {
  if (!email || !key || !calId) {
    const missing: string[] = [];
    if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!key) missing.push("GOOGLE_PRIVATE_KEY");
    if (!calId) missing.push("GOOGLE_CALENDAR_ID");
    throw new Error(
      `Konfigurasi Google Calendar belum lengkap: [${missing.join(", ")}] wajib disetel di environment variables.`
    );
  }
}

let error1Caught = false;
try {
  validateEnvVars(undefined, "key", "calId");
} catch (err: any) {
  error1Caught = true;
  assert(err.message.includes("GOOGLE_SERVICE_ACCOUNT_EMAIL"));
  console.log(`  ✓ Missing email caught: "${err.message}"`);
}
assert(error1Caught, "Should throw error when GOOGLE_SERVICE_ACCOUNT_EMAIL is missing");

let error2Caught = false;
try {
  validateEnvVars("test@email.com", undefined, undefined);
} catch (err: any) {
  error2Caught = true;
  assert(err.message.includes("GOOGLE_PRIVATE_KEY"));
  assert(err.message.includes("GOOGLE_CALENDAR_ID"));
  console.log(`  ✓ Multiple missing caught: "${err.message}"`);
}
assert(error2Caught, "Should throw error when GOOGLE_PRIVATE_KEY and GOOGLE_CALENDAR_ID are missing");

// Test 3: Key formatting
console.log("\nTest 3: Validating private key formatting (escaping \\n resolution)");
const sampleRawKey =
  '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\\n-----END PRIVATE KEY-----\\n"';

let formattedKey = sampleRawKey.replace(/\\n/g, "\n");
if (
  (formattedKey.startsWith('"') && formattedKey.endsWith('"')) ||
  (formattedKey.startsWith("'") && formattedKey.endsWith("'"))
) {
  formattedKey = formattedKey.slice(1, -1);
}
formattedKey = formattedKey.replace(/\\n/g, "\n");

assert(!formattedKey.includes("\\n"), "Formatted key should not contain literal \\n");
assert(formattedKey.includes("\n"), "Formatted key must contain real newlines");
assert(!formattedKey.startsWith('"'), "Formatted key must not retain outer quotes");
console.log("  ✓ Private key formatting correctly converts \\n to newline and strips outer quotes");

async function run() {
  // Test 4: Live connection with .env.local if present
  console.log("\nTest 4: Live validation of Google Calendar API credentials");
  if (fs.existsSync(".env.local")) {
    const content = fs.readFileSync(".env.local", "utf8");
    const emailMatch = content.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=["']?([^"'\r\n]+)["']?/);
    const keyMatch = content.match(/GOOGLE_PRIVATE_KEY=["']?([\s\S]+?)["']?\nGOOGLE_CALENDAR_ID/);
    const calIdMatch = content.match(/GOOGLE_CALENDAR_ID=["']?([^"'\r\n]+)["']?/);

    const email = emailMatch ? emailMatch[1].trim() : process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let rawKey = keyMatch ? keyMatch[1].trim() : process.env.GOOGLE_PRIVATE_KEY;
    const calId = calIdMatch ? calIdMatch[1].trim() : process.env.GOOGLE_CALENDAR_ID;

    if (email && rawKey && calId) {
      if (
        (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
        (rawKey.startsWith("'") && rawKey.endsWith("'"))
      ) {
        rawKey = rawKey.slice(1, -1);
      }
      const privateKey = rawKey.replace(/\\n/g, "\n");

      const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
      });

      const calendar = google.calendar({ version: "v3", auth });

      // Validate access to the calendar
      const calList = await calendar.events.list({
        calendarId: calId,
        maxResults: 1,
      });
      console.log(`  ✓ Successfully connected to Google Calendar API! Calendar items: ${calList.data.items?.length ?? 0}`);
    } else {
      console.log("  ℹ Credentials not fully parsed from .env.local, skipping live network call");
    }
  } else {
    console.log("  ℹ .env.local not found, skipping live network call");
  }

  console.log("\n=== All Google Calendar Sync Tests PASSED! ===\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
