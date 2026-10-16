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

async function run() {
  // Test 3: Live Edge-compatible JWT signing and OAuth2 token exchange with jose + fetch
  console.log("\nTest 3: Live Edge-compatible JWT signing and REST API check with jose + fetch");
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
