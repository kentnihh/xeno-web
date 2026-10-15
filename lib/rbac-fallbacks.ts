import type { Role, Permission, RolePermission, Profile } from "@/types/database";

export const FALLBACK_ROLES: Role[] = [
  { id: "admin", name: "Administrator", description: "Akses penuh seluruh konfigurasi sistem & hak akses", created_at: "2026-01-01T00:00:00Z" },
  { id: "manager", name: "Event Manager", description: "Pengelolaan acara, klien, vendor, dan checklist panggung", created_at: "2026-01-01T00:00:00Z" },
  { id: "staff", name: "Kru Operasional", description: "Eksekusi teknis lapangan dan pembaruan status tugas", created_at: "2026-01-01T00:00:00Z" },
];

export const FALLBACK_PERMISSIONS: Permission[] = [
  { id: "users:manage", name: "Kelola Pengguna & Hak Akses", description: "Manajemen akun staf dan peran RBAC", module: "users", created_at: "2026-01-01T00:00:00Z" },
  { id: "events:read", name: "Lihat Jadwal & Detail Acara", description: "Melihat kalender panggung & rundown", module: "events", created_at: "2026-01-01T00:00:00Z" },
  { id: "events:create", name: "Inisialisasi Acara Baru", description: "Membuat project event baru", module: "events", created_at: "2026-01-01T00:00:00Z" },
  { id: "events:update", name: "Perbarui Informasi Acara", description: "Mengubah status event & budget", module: "events", created_at: "2026-01-01T00:00:00Z" },
  { id: "events:delete", name: "Hapus Data Acara", description: "Menghapus arsip event", module: "events", created_at: "2026-01-01T00:00:00Z" },
  { id: "clients:manage", name: "Kelola Database Klien", description: "Mengelola kontak klien Xeno", module: "clients", created_at: "2026-01-01T00:00:00Z" },
  { id: "vendors:manage", name: "Kelola Database Vendor", description: "Mengelola vendor mitra", module: "vendors", created_at: "2026-01-01T00:00:00Z" },
  { id: "tasks:manage", name: "Kelola Tugas & Checklist Kru", description: "Membuat checklist teknis", module: "tasks", created_at: "2026-01-01T00:00:00Z" },
  { id: "team:manage", name: "Kelola Tim & Kru", description: "Mengelola penugasan anggota tim dan peran kru", module: "team", created_at: "2026-01-01T00:00:00Z" },
  { id: "rbac:manage", name: "Kelola Peran & Hak Akses Sistem", description: "Konfigurasi role dan permission pengguna", module: "users", created_at: "2026-01-01T00:00:00Z" },
  { id: "templates:manage", name: "Kelola Template Acara", description: "Mengelola master spreadsheet dan template rundown", module: "templates", created_at: "2026-01-01T00:00:00Z" },
  { id: "finances:manage", name: "Kelola Keuangan Acara", description: "Mencatat dan memantau anggaran serta rincian biaya", module: "finances", created_at: "2026-01-01T00:00:00Z" },
  { id: "documents:manage", name: "Kelola Berkas & Dokumen Acara", description: "Mengunggah dan mengelola dokumen teknis acara", module: "documents", created_at: "2026-01-01T00:00:00Z" },
];

export const FALLBACK_ROLE_PERMS: RolePermission[] = [
  ...FALLBACK_PERMISSIONS.map((p) => ({ id: `adm-${p.id}`, role_id: "admin", permission_id: p.id, created_at: "2026-01-01T00:00:00Z" })),
  { id: "mgr-1", role_id: "manager", permission_id: "events:read", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-2", role_id: "manager", permission_id: "events:create", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-3", role_id: "manager", permission_id: "events:update", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-4", role_id: "manager", permission_id: "clients:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-5", role_id: "manager", permission_id: "vendors:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-6", role_id: "manager", permission_id: "tasks:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-7", role_id: "manager", permission_id: "team:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-8", role_id: "manager", permission_id: "finances:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "mgr-9", role_id: "manager", permission_id: "documents:manage", created_at: "2026-01-01T00:00:00Z" },
  { id: "stf-1", role_id: "staff", permission_id: "events:read", created_at: "2026-01-01T00:00:00Z" },
  { id: "stf-2", role_id: "staff", permission_id: "tasks:manage", created_at: "2026-01-01T00:00:00Z" },
];

export const FALLBACK_USERS: Profile[] = [
  { id: "usr-1", full_name: "Jonathan Admin", email: "admin@xenoent.com", role: "admin", phone: "+62 812-1111-2222", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "usr-2", full_name: "Rian Kru Operasional", email: "staf@xenoent.com", role: "staff", phone: "+62 813-3333-4444", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];
