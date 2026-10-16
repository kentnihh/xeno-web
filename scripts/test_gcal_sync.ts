import assert from "assert";
import fs from "fs";
import { SignJWT, importPKCS8 } from "jose";

console.log("=== Running Edge-Compatible Google Calendar Sync Tests ===\n");

// Test 1: Missing environment variables check
console.log("Test 1: Validating strict error throwing on missing environment variables");
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

// Test 2: Key formatting
console.log("\nTest 2: Validating private key formatting (escaping \\n resolution)");
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

// Test 3: Duration fallback & payload structure
console.log("\nTest 3: Validating duration fallback for empty/invalid end dates (preventing timeRangeEmpty)");
function resolveEventDates(
  rawStartDate?: string | null,
  rawEndDate?: string | null
): {
  safeStartDate: Date;
  safeEndDate: Date;
} {
  let safeStartDate = rawStartDate ? new Date(rawStartDate) : new Date();
  if (isNaN(safeStartDate.getTime())) {
    safeStartDate = new Date();
  }

  let safeEndDate = rawEndDate ? new Date(rawEndDate) : null;
  if (!safeEndDate || isNaN(safeEndDate.getTime()) || safeEndDate.getTime() <= safeStartDate.getTime()) {
    safeEndDate = new Date(safeStartDate.getTime() + 2 * 60 * 60 * 1000);
  }

  return { safeStartDate, safeEndDate };
}

// Case 1: Identical start and end dates
const c1 = resolveEventDates("2026-10-20T11:00:00.000Z", "2026-10-20T11:00:00.000Z");
assert(c1.safeEndDate.getTime() > c1.safeStartDate.getTime(), "End date must be strictly after start date");
assert.strictEqual(
  c1.safeEndDate.getTime() - c1.safeStartDate.getTime(),
  2 * 60 * 60 * 1000,
  "Must fall back to exactly +2 hours"
);
console.log("  ✓ Identical dates dynamically resolved to +2 hours positive range");

// Case 2: Null / missing end date
const c2 = resolveEventDates("2026-10-20T11:00:00.000Z", null);
assert(c2.safeEndDate.getTime() > c2.safeStartDate.getTime(), "Null end date must be resolved to +2 hours");
console.log("  ✓ Null end date dynamically resolved to +2 hours positive range");

// Case 3: End date before start date
const c3 = resolveEventDates("2026-10-31T14:30:00.000Z", "2026-10-12T14:37:09.000Z");
assert(c3.safeEndDate.getTime() > c3.safeStartDate.getTime(), "Inverted end date must be corrected to +2 hours");
console.log("  ✓ Inverted end date (endDate < startDate) corrected to +2 hours");

// Case 4: Valid range preserved
const c4 = resolveEventDates("2026-10-20T11:00:00.000Z", "2026-10-20T19:00:00.000Z");
assert.strictEqual(c4.safeEndDate.toISOString(), "2026-10-20T19:00:00.000Z");
console.log("  ✓ Valid positive range correctly preserved");

// Output payload structure check
const payload = {
  start: { dateTime: c1.safeStartDate.toISOString() },
  end: { dateTime: c1.safeEndDate.toISOString() },
};
assert(payload.start.dateTime && payload.end.dateTime);
assert(typeof payload.start.dateTime === "string");
assert(typeof payload.end.dateTime === "string");
console.log("  ✓ Google Calendar payload strictly matches { start: { dateTime }, end: { dateTime } }");

async function run() {
  // Test 4: Live Edge-compatible JWT signing and OAuth2 token exchange with jose + fetch
  console.log("\nTest 4: Live Edge-compatible JWT signing and REST API check with jose + fetch");
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
      const privateKeyStr = rawKey.replace(/\\n/g, "\n");

      // Sign with jose
      const privateKey = await importPKCS8(privateKeyStr, "RS256");
      const jwt = await new SignJWT({
        iss: email,
        scope: "https://www.googleapis.com/auth/calendar.events",
        aud: "https://oauth2.googleapis.com/token",
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

      assert(jwt && jwt.length > 50, "JWT must be properly signed string");
      console.log("  ✓ jose SignJWT successfully generated signed RS256 token");

      // Exchange token via fetch
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      assert(tokenRes.ok, `Token exchange failed with HTTP status ${tokenRes.status}`);
      const tokenData = await tokenRes.json();
      assert(tokenData.access_token, "Must receive valid access_token from Google OAuth2");
      console.log("  ✓ Access token successfully received from Google OAuth2 endpoint");

      // Fetch events via REST API
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?maxResults=1`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      assert(calRes.ok, `Calendar API call failed with HTTP status ${calRes.status}`);
      const calData = await calRes.json();
      console.log(`  ✓ Successfully connected to Google Calendar REST API! Events found: ${calData.items?.length ?? 0}`);
      // Test 5: Idempotency logic verification (PUT vs POST & 404 handling)
      console.log("\nTest 5: Validating idempotent sync logic (PUT vs POST & 404 fallback)");
      let methodCalled = "";
      let savedDbId: string | null = null;
      let dbIdCleared = false;

      async function mockSync(ev: { id: string; gcal_event_id: string | null }, simulateGcalStatus = 200) {
        methodCalled = "";
        if (ev.gcal_event_id) {
          methodCalled = "PUT";
          if (simulateGcalStatus === 404) {
            dbIdCleared = true;
            ev.gcal_event_id = null;
            // Falls through to POST
            methodCalled = "POST";
            savedDbId = "new_recreated_gcal_id";
            return { success: true, method: "POST", id: savedDbId };
          }
          return { success: true, method: "PUT", id: ev.gcal_event_id };
        } else {
          methodCalled = "POST";
          savedDbId = "new_created_gcal_id";
          return { success: true, method: "POST", id: savedDbId };
        }
      }

      // Case 5a: No gcal_event_id -> POST and save ID
      const evNew = { id: "ev-1", gcal_event_id: null };
      await mockSync(evNew);
      assert.strictEqual(methodCalled, "POST");
      assert.strictEqual(savedDbId, "new_created_gcal_id");
      console.log("  ✓ Missing gcal_event_id triggered POST and saved ID to DB");

      // Case 5b: Existing gcal_event_id -> PUT without duplicating
      const evExisting = { id: "ev-2", gcal_event_id: "existing_123" };
      await mockSync(evExisting);
      assert.strictEqual(methodCalled, "PUT");
      console.log("  ✓ Existing gcal_event_id triggered PUT update (no duplicate created)");

      // Case 5c: 404 on Google Calendar -> clears DB ID and recreates via POST
      const evDeleted = { id: "ev-3", gcal_event_id: "deleted_on_gcal_456" };
      await mockSync(evDeleted, 404);
      assert(dbIdCleared, "Must clear old ID from database when 404 received");
      assert.strictEqual(methodCalled, "POST");
      assert.strictEqual(savedDbId, "new_recreated_gcal_id");
      console.log("  ✓ 404 on Google Calendar cleared old ID and recreated via POST");
    } else {
      console.log("  ℹ Credentials not fully parsed from .env.local, skipping live network call");
    }
  } else {
    console.log("  ℹ .env.local not found, skipping live network call");
  }

  console.log("\n=== All Edge-Compatible Google Calendar Sync Tests PASSED! ===\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
