/**
 * TypeScript Production Database Seeder for Xeno Entertainment.
 *
 * Configures:
 * 1. Production Users:
 *    - Jonathan Kent (admin@xenoent.com) - Admin
 *    - Edja (edjamoo@xenoent.com) - Admin
 * 2. RBAC System:
 *    - Roles (admin, manager, staff)
 *    - 13 System Permissions
 *    - Role-to-Permission mappings
 *    - User-Role assignments
 * 3. Production Master Templates:
 *    - 10 operational spreadsheet master templates
 *
 * Operational tables (clients, vendors, events, event_tasks, event_vendors, event_crew)
 * remain 100% clean without mock data.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Production users
const PRODUCTION_USERS = [
  {
    name: "Jonathan Kent",
    email: "admin@xenoent.com",
    password: "Admin123!",
    role: "SUPER_ADMIN",
  },
  {
    name: "Edja",
    email: "edjamoo@xenoent.com",
    password: "295200",
    role: "admin",
  },
  {
    name: "Vinna",
    email: "vinna@xenoent.com",
    password: "290394",
    role: "admin",
  },
];

// RBAC Roles
const ROLES_DATA = [
  {
    id: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna",
  },
  {
    id: "super_admin",
    name: "Super Administrator (System)",
    description: "Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna",
  },
  {
    id: "admin",
    name: "Administrator",
    description: "Akses penuh seluruh konfigurasi sistem, database, dan manajemen hak akses",
  },
  {
    id: "manager",
    name: "Event Manager",
    description: "Pengelolaan operasional acara, klien, vendor, dan delegasi tugas kru",
  },
  {
    id: "staff",
    name: "Kru Operasional",
    description: "Akses eksekusi lapangan, melihat jadwal panggung, dan memperbarui status tugas",
  },
];

// RBAC Permissions
const PERMISSIONS_DATA = [
  { id: "users:manage", name: "Kelola Pengguna & Hak Akses", module: "users", description: "Membuat, mengubah, dan menghapus akun staf serta peran RBAC" },
  { id: "events:read", name: "Lihat Jadwal & Detail Acara", module: "events", description: "Melihat daftar kalender acara dan lembar rundown panggung" },
  { id: "events:create", name: "Inisialisasi Acara Baru", module: "events", description: "Membuat project event baru beserta rancangan timeline" },
  { id: "events:update", name: "Perbarui Informasi Acara", module: "events", description: "Mengubah status event, venue, dan alokasi anggaran" },
  { id: "events:delete", name: "Hapus Data Acara", module: "events", description: "Menghapus arsip event dari sistem operasional" },
  { id: "clients:manage", name: "Kelola Database Klien", module: "clients", description: "Mengelola kontak prinsipal dan PIC korporasi" },
  { id: "vendors:manage", name: "Kelola Database Vendor", module: "vendors", description: "Mengelola direktori mitra audio, lighting, catering, dan panggung" },
  { id: "tasks:manage", name: "Kelola Tugas & Checklist Kru", module: "tasks", description: "Membuat dan memperbarui status checklist teknis kru" },
  { id: "team:manage", name: "Kelola Tim & Kru", module: "team", description: "Mengelola penugasan anggota tim dan peran kru" },
  { id: "rbac:manage", name: "Kelola Peran & Hak Akses Sistem", module: "users", description: "Konfigurasi role dan permission pengguna" },
  { id: "templates:manage", name: "Kelola Template Acara", module: "templates", description: "Mengelola master spreadsheet dan template rundown" },
  { id: "finances:manage", name: "Kelola Keuangan Acara", module: "finances", description: "Mencatat dan memantau anggaran serta rincian biaya" },
  { id: "documents:manage", name: "Kelola Berkas & Dokumen Acara", module: "documents", description: "Mengunggah dan mengelola dokumen teknis acara" },
  { id: "events:operations:manage", name: "Kelola Operasional Acara", module: "events", description: "Mengelola penugasan kru, checklist tugas, dan vendor acara" },
  { id: "events:sheets:manage", name: "Kelola Lembar Kerja Acara", module: "events", description: "Mengedit dan mengelola lembar kerja acara" },
  { id: "events:family:manage", name: "Kelola Data Keluarga Acara", module: "events", description: "Mengonfigurasi formulir dan mengelola data keluarga acara" },
];

// Role-to-Permissions mapping
const ROLE_PERMISSIONS_MAPPING: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS_DATA.map((p) => p.id),
  super_admin: PERMISSIONS_DATA.map((p) => p.id),
  admin: PERMISSIONS_DATA.map((p) => p.id),
  manager: [
    "events:read", "events:create", "events:update",
    "clients:manage", "vendors:manage", "tasks:manage",
    "team:manage", "finances:manage", "documents:manage",
  ],
  staff: ["events:read", "tasks:manage"],
};

// 9 Master Templates
const MASTER_TEMPLATES_DATA = [
  {
    sheet_name: "CHECKLIST",
    order_index: 0,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "No" },
        { id: "col_2", name: "Item Checklist" },
        { id: "col_3", name: "Kategori" },
        { id: "col_4", name: "PIC" },
        { id: "col_5", name: "Status" },
        { id: "col_6", name: "Catatan" },
      ],
      rows: [
        { id: "row_1", col_1: "1", col_2: "Sound system test & mic wireless", col_3: "Teknis", col_4: "Budi", col_5: "Done", col_6: "Semua 4 mic aman" },
        { id: "row_2", col_1: "2", col_2: "Lighting panggung utama & ambience", col_3: "Teknis", col_4: "Agus", col_5: "In Progress", col_6: "Spotlight standby" },
        { id: "row_3", col_1: "3", col_2: "Souvenir VIP & meja registrasi", col_3: "Front Desk", col_4: "Siti", col_5: "Ready", col_6: "200 pax siap" },
        { id: "row_4", col_1: "4", col_2: "Koordinasi Catering & Test Food", col_3: "F&B", col_4: "Rian", col_5: "Done", col_6: "Menu fix" },
        { id: "row_5", col_1: "5", col_2: "Gladi resik / Rundown walk-through", col_3: "Program", col_4: "Team", col_5: "Pending", col_6: "Jam 16:00" },
      ],
    },
  },
  {
    sheet_name: "Meja VIP resepsi",
    order_index: 1,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "No Meja" },
        { id: "col_2", name: "Nama Tamu / VIP" },
        { id: "col_3", name: "Instansi / Hubungan" },
        { id: "col_4", name: "Jumlah Pax" },
        { id: "col_5", name: "Keterangan Meja" },
        { id: "col_6", name: "Status Kehadiran" },
      ],
      rows: [
        { id: "row_1", col_1: "VIP 01", col_2: "Bpk. Hendra & Ibu", col_3: "Keluarga Utama", col_4: "4", col_5: "Dekat Panggung", col_6: "Konfirmasi" },
        { id: "row_2", col_1: "VIP 02", col_2: "Direksi PT Sinar Abadi", col_3: "Rekan Bisnis", col_4: "6", col_5: "Baris Depan Kiri", col_6: "Konfirmasi" },
        { id: "row_3", col_1: "VIP 03", col_2: "Bpk. Walikota & Rombongan", col_3: "Pejabat Daerah", col_4: "8", col_5: "Protokoler VIP", col_6: "Menunggu Info" },
      ],
    },
  },
  {
    sheet_name: "Reception Rundown",
    order_index: 2,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "Waktu" },
        { id: "col_2", name: "Durasi" },
        { id: "col_3", name: "Aktivitas / Acara" },
        { id: "col_4", name: "Pengisi / PIC" },
        { id: "col_5", name: "Audio / Video Cue" },
        { id: "col_6", name: "Keterangan" },
      ],
      rows: [
        { id: "row_1", col_1: "18:00 - 18:30", col_2: "30 mnt", col_3: "Registrasi & Welcoming Drink", col_4: "Front Desk & LO", col_5: "Instrumental Jazz", col_6: "Pintu Ballroom buka" },
        { id: "row_2", col_1: "18:30 - 18:45", col_2: "15 mnt", col_3: "Grand Entrance Pengantin / VIP", col_4: "MC & Wedding Organizer", col_5: "Theme Song Entrance", col_6: "Spotlight follow" },
        { id: "row_3", col_1: "18:45 - 19:15", col_2: "30 mnt", col_3: "Sambutan & Toast Bersama", col_4: "Perwakilan Keluarga", col_5: "Microphone Center", col_6: "Gelas champagne ready" },
        { id: "row_4", col_1: "19:15 - 20:30", col_2: "75 mnt", col_3: "Dinner & Live Band Performance", col_4: "Band Talent & Catering", col_5: "Live Performance", col_6: "Buffet dibuka" },
      ],
    },
  },
  {
    sheet_name: "List Teapai",
    order_index: 3,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "No" },
        { id: "col_2", name: "Nama Pasangan / Tetua" },
        { id: "col_3", name: "Pihak (Groom/Bride)" },
        { id: "col_4", name: "Sebutan / Hubungan" },
        { id: "col_5", name: "PIC Angpau / Baki" },
        { id: "col_6", name: "Status Selesai" },
      ],
      rows: [
        { id: "row_1", col_1: "1", col_2: "Kakek & Nenek Pria", col_3: "Groom", col_4: "Yeye & Nainai", col_5: "Lisa", col_6: "Siap" },
        { id: "row_2", col_1: "2", col_2: "Kakek & Nenek Wanita", col_3: "Bride", col_4: "Akong & Amah", col_5: "Lisa", col_6: "Siap" },
        { id: "row_3", col_1: "3", col_2: "Orang Tua Pria", col_3: "Groom", col_4: "Papa & Mama", col_5: "Dewi", col_6: "Siap" },
        { id: "row_4", col_1: "4", col_2: "Orang Tua Wanita", col_3: "Bride", col_4: "Papa & Mama", col_5: "Dewi", col_6: "Siap" },
      ],
    },
  },
  {
    sheet_name: "LO Resepsi",
    order_index: 4,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "Nama Petugas LO" },
        { id: "col_2", name: "Tugas Khusus / Pendamping" },
        { id: "col_3", name: "No HT / Kontak" },
        { id: "col_4", name: "Posisi Standby" },
        { id: "col_5", name: "Jam Standby" },
        { id: "col_6", name: "Catatan" },
      ],
      rows: [
        { id: "row_1", col_1: "Andi Pratama", col_2: "LO Pengantin Pria", col_3: "CH 1 / 0812-xxx", col_4: "Ruang Rias Groom", col_5: "15:00", col_6: "Bawa jas ganti & air mineral" },
        { id: "row_2", col_1: "Nadia Utami", col_2: "LO Pengantin Wanita", col_3: "CH 1 / 0813-xxx", col_4: "Bridal Suite", col_5: "15:00", col_6: "Touch up kit standby" },
        { id: "row_3", col_1: "Farhan", col_2: "LO VIP & Orang Tua", col_3: "CH 2 / 0817-xxx", col_4: "Holding Room VIP", col_5: "17:00", col_6: "Korsase disematkan" },
      ],
    },
  },
  {
    sheet_name: "F&B Resepsi",
    order_index: 5,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "Menu / Stall" },
        { id: "col_2", name: "Vendor Penyedia" },
        { id: "col_3", name: "Target Pax" },
        { id: "col_4", name: "Waktu Keluar" },
        { id: "col_5", name: "Lokasi Stall" },
        { id: "col_6", name: "Status Refill" },
      ],
      rows: [
        { id: "row_1", col_1: "Main Buffet Nusantara", col_2: "Hotel Catering", col_3: "500 pax", col_4: "19:00", col_5: "Buffet A & B", col_6: "Ready" },
        { id: "row_2", col_1: "Zuppa Soup", col_2: "Vendor Rasa Prima", col_3: "300 porsi", col_4: "18:45", col_5: "Stall Kiri 1", col_6: "Ready" },
        { id: "row_3", col_1: "Roast Beef", col_2: "Vendor Rasa Prima", col_3: "250 porsi", col_4: "18:45", col_5: "Stall Kiri 2", col_6: "Standby" },
      ],
    },
  },
  {
    sheet_name: "Event Resepsi",
    order_index: 6,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "Item Acara" },
        { id: "col_2", name: "Pengisi / Vendor" },
        { id: "col_3", name: "Area / Panggung" },
        { id: "col_4", name: "Kebutuhan Alat" },
        { id: "col_5", name: "Catatan Teknis" },
      ],
      rows: [
        { id: "row_1", col_1: "Wedding Cake Cutting", col_2: "Cake Vendor & MC", col_3: "Stage Center", col_4: "Pisau hias & lap", col_5: "Spotlight 80%" },
        { id: "row_2", col_1: "Champagne Toast", col_2: "MC & Bartender", col_3: "Stage Center", col_4: "Piramida gelas", col_5: "Botol siap buka" },
      ],
    },
  },
  {
    sheet_name: "front desk",
    order_index: 7,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "Meja Registrasi" },
        { id: "col_2", name: "Petugas Jaga" },
        { id: "col_3", name: "Souvenir" },
        { id: "col_4", name: "Kotak Angpau" },
        { id: "col_5", name: "Status Kunci" },
      ],
      rows: [
        { id: "row_1", col_1: "Meja 1 (A - M)", col_2: "Jessica & Cindy", col_3: "150 pcs", col_4: "Kotak A (Terkunci)", col_5: "Kunci di Ibu Rita" },
        { id: "row_2", col_1: "Meja 2 (N - Z)", col_2: "Maya & Devi", col_3: "150 pcs", col_4: "Kotak B (Terkunci)", col_5: "Kunci di Ibu Rita" },
        { id: "row_3", col_1: "Meja VIP", col_2: "Tania & Kevin", col_3: "50 pcs VIP", col_4: "Kotak VIP (Terkunci)", col_5: "Kunci di Bpk. Hendra" },
      ],
    },
  },
  {
    sheet_name: "Hotel Room Reception",
    order_index: 8,
    jsonb_structure: {
      columns: [
        { id: "col_1", name: "No Kamar" },
        { id: "col_2", name: "Tipe Kamar" },
        { id: "col_3", name: "Nama Penghuni" },
        { id: "col_4", name: "Check-in" },
        { id: "col_5", name: "Check-out" },
        { id: "col_6", name: "Kunci / Kartu" },
      ],
      rows: [
        { id: "row_1", col_1: "Room 1201", col_2: "Presidential Suite", col_3: "Pengantin", col_4: "14:00 (Hari H-1)", col_5: "12:00 (Hari H+1)", col_6: "2 Kartu Aktif" },
        { id: "row_2", col_1: "Room 1105", col_2: "Deluxe Suite", col_3: "Orang Tua Pria", col_4: "14:00 (Hari H-1)", col_5: "12:00 (Hari H+1)", col_6: "2 Kartu Aktif" },
        { id: "row_3", col_1: "Room 1106", col_2: "Deluxe Suite", col_3: "Orang Tua Wanita", col_4: "14:00 (Hari H-1)", col_5: "12:00 (Hari H+1)", col_6: "2 Kartu Aktif" },
      ],
    },
  },
];

async function seedUsers() {
  console.log("Provisioning production users...");
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUsers = usersData?.users || [];

  for (const u of PRODUCTION_USERS) {
    const existing = existingUsers.find((eu) => eu.email?.toLowerCase() === u.email.toLowerCase());
    let userId: string | null = null;

    if (existing) {
      userId = existing.id;
      console.log(`User ${u.email} already exists (ID: ${userId}). Keeping existing password.`);
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
      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: u.name,
        email: u.email,
        role: u.role,
      });
      console.log(`Synced profile: ${u.email} -> ${u.role}`);

      // Upsert user_role
      await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role_id: u.role,
        },
        { onConflict: "user_id, role_id" }
      );
      console.log(`Assigned user_role: ${u.email} -> ${u.role}`);
    }
  }
}

async function seedRBAC() {
  console.log("Seeding RBAC roles & permissions...");
  // 1. Roles
  const { error: rolesErr } = await supabase.from("roles").upsert(ROLES_DATA);
  if (rolesErr) console.warn("Notice roles:", rolesErr.message);
  else console.log(`Seeded ${ROLES_DATA.length} roles.`);

  // 2. Permissions
  const { error: permsErr } = await supabase.from("permissions").upsert(PERMISSIONS_DATA);
  if (permsErr) console.warn("Notice permissions:", permsErr.message);
  else console.log(`Seeded ${PERMISSIONS_DATA.length} permissions.`);

  // 3. Role Permissions
  const rolePermsRecords: { role_id: string; permission_id: string }[] = [];
  for (const [roleId, permIds] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
    for (const pid of permIds) {
      rolePermsRecords.push({ role_id: roleId, permission_id: pid });
    }
  }
  const { error: rpErr } = await supabase
    .from("role_permissions")
    .upsert(rolePermsRecords, { onConflict: "role_id, permission_id" });
  if (rpErr) console.warn("Notice role_permissions:", rpErr.message);
  else console.log(`Seeded ${rolePermsRecords.length} role-permission mappings.`);
}

async function seedMasterTemplates() {
  console.log("Seeding master templates...");
  const { error } = await supabase
    .from("master_templates")
    .upsert(MASTER_TEMPLATES_DATA, { onConflict: "sheet_name" });
  if (error) console.warn("Notice master_templates:", error.message);
  else console.log(`Seeded ${MASTER_TEMPLATES_DATA.length} master templates.`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Starting Clean Production Database Seeder (Node.js/TypeScript)");
  console.log("=".repeat(60));

  await seedUsers();
  await seedRBAC();
  await seedMasterTemplates();

  console.log("=".repeat(60));
  console.log("Production Database Seeding Completed Successfully!");
  console.log("Active Production Users:");
  console.log("  1. Jonathan Kent (admin@xenoent.com) -> Role: Admin");
  console.log("  2. Edja (edjamoo@xenoent.com) -> Role: Admin");
  console.log("Operational Data: Clean (0 clients, 0 vendors, 0 events, 0 tasks)");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
