import assert from "assert";
import fs from "fs";
import path from "path";
import { isRedirectError } from "next/dist/client/components/redirect-error";

console.log("=== Testing Login NEXT_REDIRECT Fix ===");

// 1. Verify next/dist redirect error detection
console.log("\n--- 1. Testing isRedirectError Detection ---");
const mockRedirectError = {
  digest: "NEXT_REDIRECT;replace;/dashboard;307;",
  message: "NEXT_REDIRECT",
};
assert.strictEqual(
  isRedirectError(mockRedirectError),
  true,
  "isRedirectError must accurately identify NEXT_REDIRECT digest objects"
);
console.log("✓ isRedirectError accurately detects NEXT_REDIRECT digest error objects.");

// 2. Audit app/auth/actions.ts
console.log("\n--- 2. Auditing Server Action app/auth/actions.ts ---");
const actionsPath = path.resolve(process.cwd(), "app/auth/actions.ts");
const actionsCode = fs.readFileSync(actionsPath, "utf-8");

assert(
  actionsCode.includes('import { isRedirectError } from "next/dist/client/components/redirect-error"'),
  "app/auth/actions.ts must import isRedirectError"
);
assert(
  actionsCode.includes("let isSuccess = false;"),
  "app/auth/actions.ts must track isSuccess flag"
);
assert(
  actionsCode.includes("if (isRedirectError(err)) {"),
  "app/auth/actions.ts must re-throw redirect error in catch"
);
assert(
  actionsCode.includes('msg.includes("NEXT_REDIRECT")'),
  "app/auth/actions.ts must check for NEXT_REDIRECT string in catch"
);
assert(
  actionsCode.includes('if (isSuccess) {\n    redirect("/dashboard");\n  }'),
  "app/auth/actions.ts must invoke redirect outside try/catch upon isSuccess"
);
console.log("✓ app/auth/actions.ts follows recommended pattern with redirect() outside try-catch and rethrows redirect errors.");

// 3. Audit app/login/page.tsx
console.log("\n--- 3. Auditing Client Form app/login/page.tsx ---");
const loginPagePath = path.resolve(process.cwd(), "app/login/page.tsx");
const loginPageCode = fs.readFileSync(loginPagePath, "utf-8");

assert(
  loginPageCode.includes('import { isRedirectError } from "next/dist/client/components/redirect-error"'),
  "app/login/page.tsx must import isRedirectError"
);
assert(
  loginPageCode.includes('!res.error.includes("NEXT_REDIRECT")'),
  "app/login/page.tsx must filter out NEXT_REDIRECT from server action response"
);
assert(
  loginPageCode.includes("if (isRedirectError(err)) {"),
  "app/login/page.tsx handleSubmit must catch isRedirectError and return cleanly"
);
assert(
  loginPageCode.includes('msg.includes("NEXT_REDIRECT")'),
  "app/login/page.tsx handleSubmit must catch NEXT_REDIRECT message and return cleanly"
);
assert(
  loginPageCode.includes('!error.includes("NEXT_REDIRECT")'),
  "app/login/page.tsx alert banner must never display NEXT_REDIRECT"
);
console.log("✓ app/login/page.tsx client-side sanitization and error catching verified.");

console.log("\n🎉 ALL LOGIN NEXT_REDIRECT TESTS PASSED SUCCESSFULLY! 🚀");
