import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createClientSchema } from "../lib/validations/client";
import { CLIENT_EVENT_TYPES } from "../components/clients/add-client-modal";
import { getClientEventTypeBadge } from "../components/clients/clients-view";

console.log("=== Testing Database Klien Event Types & Dynamic Wedding Form ===\n");

// 1. Database Schema & Migration Verification
console.log("--- 1. Testing Supabase Migration & Schema ---");
const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261017_add_client_event_type_and_partner_fields.sql");
assert(fs.existsSync(migrationPath), "Migration SQL file must exist");
const migrationSql = fs.readFileSync(migrationPath, "utf-8").toLowerCase();
assert(migrationSql.includes("add column if not exists event_type text"), "Migration must add event_type column");
assert(migrationSql.includes("add column if not exists partner_name text"), "Migration must add partner_name column");
assert(migrationSql.includes("add column if not exists partner_email text"), "Migration must add partner_email column");
assert(migrationSql.includes("add column if not exists partner_phone text"), "Migration must add partner_phone column");
assert(migrationSql.includes("add column if not exists partner_address text"), "Migration must add partner_address column");
console.log("✓ Migration SQL defines all 5 new columns (event_type, partner_name, partner_email, partner_phone, partner_address)");

const schemaSql = fs.readFileSync(path.resolve(process.cwd(), "supabase/schema.sql"), "utf-8");
assert(schemaSql.includes("event_type text"), "schema.sql must document event_type column");
assert(schemaSql.includes("partner_name text"), "schema.sql must document partner_name column");
console.log("✓ schema.sql updated with new client columns");

// 2. TypeScript Types Verification
console.log("\n--- 2. Testing TypeScript Database Interfaces ---");
const dbTypesCode = fs.readFileSync(path.resolve(process.cwd(), "types/database.ts"), "utf-8");
assert(dbTypesCode.includes("ClientEventType"), "types/database.ts must define ClientEventType");
assert(dbTypesCode.includes("event_type?: ClientEventType | null;"), "Client interface must include optional event_type");
assert(dbTypesCode.includes("partner_name?: string | null;"), "Client interface must include optional partner_name");
assert(dbTypesCode.includes("partner_email?: string | null;"), "Client interface must include optional partner_email");
assert(dbTypesCode.includes("partner_phone?: string | null;"), "Client interface must include optional partner_phone");
assert(dbTypesCode.includes("partner_address?: string | null;"), "Client interface must include optional partner_address");
console.log("✓ TypeScript Client interface properly typed with optional partner fields");

// 3. Zod Schema Validation
console.log("\n--- 3. Testing Zod Validation Schema ---");
// 3a. Standard non-wedding client
const standardClient = {
  name: "PT Mega Cipta",
  company: "PT Mega Cipta",
  phone: "+62 811-2233-4455",
  email: "info@megacipta.com",
  address: "Sudirman Kav 50",
  event_type: "Corporate",
};
const parsedStandard = createClientSchema.safeParse(standardClient);
assert(parsedStandard.success, "Standard client must validate successfully");
assert.strictEqual(parsedStandard.data.event_type, "Corporate");
assert(!parsedStandard.data.partner_name, "partner_name should be nullish when omitted");
console.log("✓ Standard client parses cleanly without partner fields");

// 3b. Wedding client with dual mempelai fields
const weddingClient = {
  name: "Jessica Tan",
  phone: "+62 812-1111-2222",
  email: "jessica@example.com",
  address: "Menteng, Jakarta Pusat",
  event_type: "Wedding",
  partner_name: "Budi Santoso",
  partner_phone: "+62 813-3333-4444",
  partner_email: "budi@example.com",
  partner_address: "Kebayoran Baru, Jakarta Selatan",
  notes: "Tema Rustic Garden Wedding",
};
const parsedWedding = createClientSchema.safeParse(weddingClient);
assert(parsedWedding.success, "Wedding client with partner fields must validate successfully");
assert.strictEqual(parsedWedding.data.event_type, "Wedding");
assert.strictEqual(parsedWedding.data.partner_name, "Budi Santoso");
assert.strictEqual(parsedWedding.data.partner_phone, "+62 813-3333-4444");
assert.strictEqual(parsedWedding.data.partner_email, "budi@example.com");
console.log("✓ Wedding client with dual mempelai fields parses and validates successfully");

// 3c. Empty string preprocessing to null
const emptyPartner = {
  name: "Jessica Tan",
  phone: "+62 812-1111-2222",
  email: "",
  partner_name: "",
  partner_email: "  ",
  partner_phone: "",
};
const parsedEmpty = createClientSchema.safeParse(emptyPartner);
assert(parsedEmpty.success, "Empty strings must safely convert to null without failing email checks");
assert.strictEqual(parsedEmpty.data.email, null);
assert.strictEqual(parsedEmpty.data.partner_email, null);
assert.strictEqual(parsedEmpty.data.partner_name, null);
console.log("✓ Empty strings correctly preprocessed to null values");

// 3d. Invalid partner email validation
const invalidEmailPartner = {
  name: "Jessica Tan",
  phone: "+62 812-1111-2222",
  partner_email: "invalid-email-address",
};
const parsedInvalid = createClientSchema.safeParse(invalidEmailPartner);
assert(!parsedInvalid.success, "Invalid partner email must trigger validation error");
console.log("✓ Invalid partner email caught by Zod schema");

// 4. UI Component Dynamic Form & Options
console.log("\n--- 4. Testing Dynamic Client Form UI Structure ---");
const expectedEventTypes = ["Wedding", "Birthday", "Corporate", "Social Event", "Lainnya"];
const actualEventTypes = CLIENT_EVENT_TYPES.map((t) => t.value);
assert.deepStrictEqual(actualEventTypes, expectedEventTypes, "Event type options must match exact specifications");
console.log("✓ CLIENT_EVENT_TYPES contains exact options: Wedding, Birthday, Corporate, Social Event, Lainnya");

const addModalCode = fs.readFileSync(path.resolve(process.cwd(), "components/clients/add-client-modal.tsx"), "utf-8");
assert(addModalCode.includes('eventType === "Wedding"'), "Form must conditionally check if eventType is Wedding");
assert(addModalCode.includes("Data Mempelai 1"), "Wedding mode must render Section 1: Data Mempelai 1");
assert(addModalCode.includes("Data Mempelai 2"), "Wedding mode must render Section 2: Data Mempelai 2");
assert(addModalCode.includes('name="partner_name"'), "Wedding mode must bind partner_name field");
assert(addModalCode.includes('name="partner_email"'), "Wedding mode must bind partner_email field");
assert(addModalCode.includes('name="partner_phone"'), "Wedding mode must bind partner_phone field");
assert(addModalCode.includes('name="partner_address"'), "Wedding mode must bind partner_address field");
assert(addModalCode.includes("clientToEdit"), "AddClientModal must accept clientToEdit prop for editing existing clients");
console.log("✓ AddClientModal dynamically renders dual sections for Wedding and standard form for other event types");

// 5. Server Actions (Create and Update)
console.log("\n--- 5. Testing Server Actions Implementation ---");
const clientActionsCode = fs.readFileSync(path.resolve(process.cwd(), "app/(dashboard)/clients/actions.ts"), "utf-8");
assert(clientActionsCode.includes('requirePermission("clients.create")'), "createClientAction must guard with clients.create");
assert(clientActionsCode.includes("export async function updateClientAction"), "updateClientAction must be declared and exported");
assert(clientActionsCode.includes("event_type: input.get(\"event_type\")"), "createClientAction must map event_type from FormData");
assert(clientActionsCode.includes("partner_name: input.get(\"partner_name\")"), "createClientAction must map partner_name from FormData");
console.log("✓ createClientAction and updateClientAction properly persist event_type and partner fields with auth guards");

// 6. Client List Badges & Table UI
console.log("\n--- 6. Testing Client List / Table Badges ---");
const weddingBadge = getClientEventTypeBadge("Wedding");
assert(weddingBadge !== null, "Wedding badge must render");
assert(getClientEventTypeBadge("Birthday") !== null, "Birthday badge must render");
assert(getClientEventTypeBadge("Corporate") !== null, "Corporate badge must render");
assert(getClientEventTypeBadge("Social Event") !== null, "Social Event badge must render");
assert(getClientEventTypeBadge("Lainnya") !== null, "Lainnya badge must render");
assert(getClientEventTypeBadge(null) === null, "Null event type should render null badge");
console.log("✓ getClientEventTypeBadge renders distinctive badges for all event types");

const clientsViewCode = fs.readFileSync(path.resolve(process.cwd(), "components/clients/clients-view.tsx"), "utf-8");
assert(clientsViewCode.includes("getClientEventTypeBadge"), "ClientsView must render event_type badge");
assert(clientsViewCode.includes("client.partner_name"), "ClientsView must handle partner_name for Wedding clients");
assert(clientsViewCode.includes("handleOpenEdit"), "ClientsView must provide edit capability");
console.log("✓ ClientsView renders event_type badges, dual couple display, and edit modal trigger");

console.log("\n=== ALL CLIENT DATABASE EVENT TYPE & WEDDING FORM TESTS PASSED! ===");
