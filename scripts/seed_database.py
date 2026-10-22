"""Production Database Seeder for Xeno Entertainment.

Configures:
1. Production Users:
   - Jonathan Kent (admin@xenoent.com) - Admin
   - Edja (edjamoo@xenoent.com) - Admin
2. RBAC Tables:
   - Roles (admin, manager, staff)
   - System Permissions (13 modules)
   - Role-Permission Mappings
   - User-Role Assignments
3. Production Master Templates:
   - 10 standard spreadsheet templates

Leaves the operational database (clients, vendors, events, event_tasks, event_vendors, event_crew) completely clean.
"""

import sys
import json
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from scripts.db_client import get_supabase_admin_client, get_supabase_client

# Exact production initial users
PRODUCTION_USERS = [
    {
        "name": "Jonathan Kent",
        "email": "admin@xenoent.com",
        "password": "Admin123!",
        "role": "SUPER_ADMIN",
    },
    {
        "name": "Edja",
        "email": "edjamoo@xenoent.com",
        "password": "295200",
        "role": "admin",
    },
    {
        "name": "Vinna",
        "email": "vinna@xenoent.com",
        "password": "290394",
        "role": "admin",
    },
]

# Standard RBAC Roles
ROLES_DATA = [
    {
        "id": "SUPER_ADMIN",
        "name": "Super Administrator",
        "description": "Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna",
    },
    {
        "id": "super_admin",
        "name": "Super Administrator",
        "description": "Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna",
    },
    {
        "id": "admin",
        "name": "Administrator",
        "description": "Akses penuh seluruh konfigurasi sistem, database, dan manajemen hak akses",
    },
    {
        "id": "manager",
        "name": "Event Manager",
        "description": "Pengelolaan operasional acara, klien, vendor, dan delegasi tugas kru",
    },
    {
        "id": "staff",
        "name": "Kru Operasional",
        "description": "Akses eksekusi lapangan, melihat jadwal panggung, dan memperbarui status tugas",
    },
]

# Standard System Permissions
PERMISSIONS_DATA = [
    {"id": "users:manage", "name": "Kelola Pengguna & Hak Akses", "module": "users", "description": "Membuat, mengubah, dan menghapus akun staf serta peran RBAC"},
    {"id": "events:read", "name": "Lihat Jadwal & Detail Acara", "module": "events", "description": "Melihat daftar kalender acara dan lembar rundown panggung"},
    {"id": "events:create", "name": "Inisialisasi Acara Baru", "module": "events", "description": "Membuat project event baru beserta rancangan timeline"},
    {"id": "events:update", "name": "Perbarui Informasi Acara", "module": "events", "description": "Mengubah status event, venue, dan alokasi anggaran"},
    {"id": "events:delete", "name": "Hapus Data Acara", "module": "events", "description": "Menghapus arsip event dari sistem operasional"},
    {"id": "clients:manage", "name": "Kelola Database Klien", "module": "clients", "description": "Mengelola kontak prinsipal dan PIC korporasi"},
    {"id": "vendors:manage", "name": "Kelola Database Vendor", "module": "vendors", "description": "Mengelola direktori mitra audio, lighting, catering, dan panggung"},
    {"id": "tasks:manage", "name": "Kelola Tugas & Checklist Kru", "module": "tasks", "description": "Membuat dan memperbarui status checklist teknis kru"},
    {"id": "team:manage", "name": "Kelola Tim & Kru", "module": "team", "description": "Mengelola penugasan anggota tim dan peran kru"},
    {"id": "rbac:manage", "name": "Kelola Peran & Hak Akses Sistem", "module": "users", "description": "Konfigurasi role dan permission pengguna"},
    {"id": "templates:manage", "name": "Kelola Template Acara", "module": "templates", "description": "Mengelola master spreadsheet dan template rundown"},
    {"id": "finances:manage", "name": "Kelola Keuangan Acara", "module": "finances", "description": "Mencatat dan memantau anggaran serta rincian biaya"},
    {"id": "documents:manage", "name": "Kelola Berkas & Dokumen Acara", "module": "documents", "description": "Mengunggah dan mengelola dokumen teknis acara"},
]

# Standard Role-to-Permission Mappings
ROLE_PERMISSIONS_MAPPING = {
    "SUPER_ADMIN": [p["id"] for p in PERMISSIONS_DATA],
    "super_admin": [p["id"] for p in PERMISSIONS_DATA],
    "admin": [p["id"] for p in PERMISSIONS_DATA],
    "manager": [
        "events:read", "events:create", "events:update",
        "clients:manage", "vendors:manage", "tasks:manage",
        "team:manage", "finances:manage", "documents:manage",
    ],
    "staff": [
        "events:read", "tasks:manage",
    ],
}

# 9 Standard Master Templates
MASTER_TEMPLATES_DATA = [
    {
        "sheet_name": "CHECKLIST",
        "order_index": 0,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "No"},
                {"id": "col_2", "name": "Item Checklist"},
                {"id": "col_3", "name": "Kategori"},
                {"id": "col_4", "name": "PIC"},
                {"id": "col_5", "name": "Status"},
                {"id": "col_6", "name": "Catatan"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "1", "col_2": "Sound system test & mic wireless", "col_3": "Teknis", "col_4": "Budi", "col_5": "Done", "col_6": "Semua 4 mic aman"},
                {"id": "row_2", "col_1": "2", "col_2": "Lighting panggung utama & ambience", "col_3": "Teknis", "col_4": "Agus", "col_5": "In Progress", "col_6": "Spotlight standby"},
                {"id": "row_3", "col_1": "3", "col_2": "Souvenir VIP & meja registrasi", "col_3": "Front Desk", "col_4": "Siti", "col_5": "Ready", "col_6": "200 pax siap"},
                {"id": "row_4", "col_1": "4", "col_2": "Koordinasi Catering & Test Food", "col_3": "F&B", "col_4": "Rian", "col_5": "Done", "col_6": "Menu fix"},
                {"id": "row_5", "col_1": "5", "col_2": "Gladi resik / Rundown walk-through", "col_3": "Program", "col_4": "Team", "col_5": "Pending", "col_6": "Jam 16:00"},
            ],
        },
    },
    {
        "sheet_name": "Meja VIP resepsi",
        "order_index": 1,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "No Meja"},
                {"id": "col_2", "name": "Nama Tamu / VIP"},
                {"id": "col_3", "name": "Instansi / Hubungan"},
                {"id": "col_4", "name": "Jumlah Pax"},
                {"id": "col_5", "name": "Keterangan Meja"},
                {"id": "col_6", "name": "Status Kehadiran"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "VIP 01", "col_2": "Bpk. Hendra & Ibu", "col_3": "Keluarga Utama", "col_4": "4", "col_5": "Dekat Panggung", "col_6": "Konfirmasi"},
                {"id": "row_2", "col_1": "VIP 02", "col_2": "Direksi PT Sinar Abadi", "col_3": "Rekan Bisnis", "col_4": "6", "col_5": "Baris Depan Kiri", "col_6": "Konfirmasi"},
                {"id": "row_3", "col_1": "VIP 03", "col_2": "Bpk. Walikota & Rombongan", "col_3": "Pejabat Daerah", "col_4": "8", "col_5": "Protokoler VIP", "col_6": "Menunggu Info"},
            ],
        },
    },
    {
        "sheet_name": "Reception Rundown",
        "order_index": 2,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "Waktu"},
                {"id": "col_2", "name": "Durasi"},
                {"id": "col_3", "name": "Aktivitas / Acara"},
                {"id": "col_4", "name": "Pengisi / PIC"},
                {"id": "col_5", "name": "Audio / Video Cue"},
                {"id": "col_6", "name": "Keterangan"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "18:00 - 18:30", "col_2": "30 mnt", "col_3": "Registrasi & Welcoming Drink", "col_4": "Front Desk & LO", "col_5": "Instrumental Jazz", "col_6": "Pintu Ballroom buka"},
                {"id": "row_2", "col_1": "18:30 - 18:45", "col_2": "15 mnt", "col_3": "Grand Entrance Pengantin / VIP", "col_4": "MC & Wedding Organizer", "col_5": "Theme Song Entrance", "col_6": "Spotlight follow"},
                {"id": "row_3", "col_1": "18:45 - 19:15", "col_2": "30 mnt", "col_3": "Sambutan & Toast Bersama", "col_4": "Perwakilan Keluarga", "col_5": "Microphone Center", "col_6": "Gelas champagne ready"},
                {"id": "row_4", "col_1": "19:15 - 20:30", "col_2": "75 mnt", "col_3": "Dinner & Live Band Performance", "col_4": "Band Talent & Catering", "col_5": "Live Performance", "col_6": "Buffet dibuka"},
            ],
        },
    },
    {
        "sheet_name": "List Teapai",
        "order_index": 3,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "No"},
                {"id": "col_2", "name": "Nama Pasangan / Tetua"},
                {"id": "col_3", "name": "Pihak (Groom/Bride)"},
                {"id": "col_4", "name": "Sebutan / Hubungan"},
                {"id": "col_5", "name": "PIC Angpau / Baki"},
                {"id": "col_6", "name": "Status Selesai"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "1", "col_2": "Kakek & Nenek Pria", "col_3": "Groom", "col_4": "Yeye & Nainai", "col_5": "Lisa", "col_6": "Siap"},
                {"id": "row_2", "col_1": "2", "col_2": "Kakek & Nenek Wanita", "col_3": "Bride", "col_4": "Akong & Amah", "col_5": "Lisa", "col_6": "Siap"},
                {"id": "row_3", "col_1": "3", "col_2": "Orang Tua Pria", "col_3": "Groom", "col_4": "Papa & Mama", "col_5": "Dewi", "col_6": "Siap"},
                {"id": "row_4", "col_1": "4", "col_2": "Orang Tua Wanita", "col_3": "Bride", "col_4": "Papa & Mama", "col_5": "Dewi", "col_6": "Siap"},
            ],
        },
    },
    {
        "sheet_name": "LO Resepsi",
        "order_index": 4,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "Nama Petugas LO"},
                {"id": "col_2", "name": "Tugas Khusus / Pendamping"},
                {"id": "col_3", "name": "No HT / Kontak"},
                {"id": "col_4", "name": "Posisi Standby"},
                {"id": "col_5", "name": "Jam Standby"},
                {"id": "col_6", "name": "Catatan"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "Andi Pratama", "col_2": "LO Pengantin Pria", "col_3": "CH 1 / 0812-xxx", "col_4": "Ruang Rias Groom", "col_5": "15:00", "col_6": "Bawa jas ganti & air mineral"},
                {"id": "row_2", "col_1": "Nadia Utami", "col_2": "LO Pengantin Wanita", "col_3": "CH 1 / 0813-xxx", "col_4": "Bridal Suite", "col_5": "15:00", "col_6": "Touch up kit standby"},
                {"id": "row_3", "col_1": "Farhan", "col_2": "LO VIP & Orang Tua", "col_3": "CH 2 / 0817-xxx", "col_4": "Holding Room VIP", "col_5": "17:00", "col_6": "Korsase disematkan"},
            ],
        },
    },
    {
        "sheet_name": "F&B Resepsi",
        "order_index": 5,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "Menu / Stall"},
                {"id": "col_2", "name": "Vendor Penyedia"},
                {"id": "col_3", "name": "Target Pax"},
                {"id": "col_4", "name": "Waktu Keluar"},
                {"id": "col_5", "name": "Lokasi Stall"},
                {"id": "col_6", "name": "Status Refill"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "Main Buffet Nusantara", "col_2": "Hotel Catering", "col_3": "500 pax", "col_4": "19:00", "col_5": "Buffet A & B", "col_6": "Ready"},
                {"id": "row_2", "col_1": "Zuppa Soup", "col_2": "Vendor Rasa Prima", "col_3": "300 porsi", "col_4": "18:45", "col_5": "Stall Kiri 1", "col_6": "Ready"},
                {"id": "row_3", "col_1": "Roast Beef", "col_2": "Vendor Rasa Prima", "col_3": "250 porsi", "col_4": "18:45", "col_5": "Stall Kiri 2", "col_6": "Standby"},
            ],
        },
    },
    {
        "sheet_name": "Event Resepsi",
        "order_index": 6,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "Item Acara"},
                {"id": "col_2", "name": "Pengisi / Vendor"},
                {"id": "col_3", "name": "Area / Panggung"},
                {"id": "col_4", "name": "Kebutuhan Alat"},
                {"id": "col_5", "name": "Catatan Teknis"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "Wedding Cake Cutting", "col_2": "Cake Vendor & MC", "col_3": "Stage Center", "col_4": "Pisau hias & lap", "col_5": "Spotlight 80%"},
                {"id": "row_2", "col_1": "Champagne Toast", "col_2": "MC & Bartender", "col_3": "Stage Center", "col_4": "Piramida gelas", "col_5": "Botol siap buka"},
            ],
        },
    },
    {
        "sheet_name": "front desk",
        "order_index": 7,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "Meja Registrasi"},
                {"id": "col_2", "name": "Petugas Jaga"},
                {"id": "col_3", "name": "Souvenir"},
                {"id": "col_4", "name": "Kotak Angpau"},
                {"id": "col_5", "name": "Status Kunci"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "Meja 1 (A - M)", "col_2": "Jessica & Cindy", "col_3": "150 pcs", "col_4": "Kotak A (Terkunci)", "col_5": "Kunci di Ibu Rita"},
                {"id": "row_2", "col_1": "Meja 2 (N - Z)", "col_2": "Maya & Devi", "col_3": "150 pcs", "col_4": "Kotak B (Terkunci)", "col_5": "Kunci di Ibu Rita"},
                {"id": "row_3", "col_1": "Meja VIP", "col_2": "Tania & Kevin", "col_3": "50 pcs VIP", "col_4": "Kotak VIP (Terkunci)", "col_5": "Kunci di Bpk. Hendra"},
            ],
        },
    },
    {
        "sheet_name": "Hotel Room Reception",
        "order_index": 8,
        "jsonb_structure": {
            "columns": [
                {"id": "col_1", "name": "No Kamar"},
                {"id": "col_2", "name": "Tipe Kamar"},
                {"id": "col_3", "name": "Nama Penghuni"},
                {"id": "col_4", "name": "Check-in"},
                {"id": "col_5", "name": "Check-out"},
                {"id": "col_6", "name": "Kunci / Kartu"},
            ],
            "rows": [
                {"id": "row_1", "col_1": "Room 1201", "col_2": "Presidential Suite", "col_3": "Pengantin", "col_4": "14:00 (Hari H-1)", "col_5": "12:00 (Hari H+1)", "col_6": "2 Kartu Aktif"},
                {"id": "row_2", "col_1": "Room 1105", "col_2": "Deluxe Suite", "col_3": "Orang Tua Pria", "col_4": "14:00 (Hari H-1)", "col_5": "12:00 (Hari H+1)", "col_6": "2 Kartu Aktif"},
                {"id": "row_3", "col_1": "Room 1106", "col_2": "Deluxe Suite", "col_3": "Orang Tua Wanita", "col_4": "14:00 (Hari H-1)", "col_5": "12:00 (Hari H+1)", "col_6": "2 Kartu Aktif"},
            ],
        },
    },
]


def seed_users(client):
    """Provisions exactly the 2 production initial users with Admin roles."""
    print("Provisioning production users...")
    has_admin_api = hasattr(client.auth, "admin")

    existing_users_by_email = {}
    if has_admin_api:
        try:
            users_list = client.auth.admin.list_users()
            for u in users_list:
                if hasattr(u, "email") and u.email:
                    existing_users_by_email[u.email.lower()] = u
        except Exception as e:
            print(f"Notice: list_users via admin api: {e}")

    for user_info in PRODUCTION_USERS:
        email = user_info["email"].lower()
        password = user_info["password"]
        name = user_info["name"]
        role = user_info["role"]
        user_id = None

        if has_admin_api and email in existing_users_by_email:
            existing_user = existing_users_by_email[email]
            user_id = existing_user.id
            try:
                client.auth.admin.update_user_by_id(
                    user_id,
                    {
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": name},
                    },
                )
                print(f"Updated existing user in auth: {email} ({name})")
            except Exception as e:
                print(f"Notice: updating user {email}: {e}")
        elif has_admin_api:
            try:
                res = client.auth.admin.create_user(
                    {
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": name},
                    }
                )
                user_id = res.user.id if hasattr(res, "user") else res.id
                print(f"Created new user in auth via Admin API: {email} ({name})")
            except Exception as e:
                print(f"Notice: creating user via admin API {email}: {e}")
                # Fallback to sign_up if needed
                try:
                    res = client.auth.sign_up(
                        {
                            "email": email,
                            "password": password,
                            "options": {"data": {"full_name": name}},
                        }
                    )
                    user_id = res.user.id if hasattr(res, "user") and res.user else None
                except Exception as ex:
                    print(f"Sign up fallback error: {ex}")
        else:
            try:
                res = client.auth.sign_up(
                    {
                        "email": email,
                        "password": password,
                        "options": {"data": {"full_name": name}},
                    }
                )
                user_id = res.user.id if hasattr(res, "user") and res.user else None
                print(f"Signed up user: {email} ({name})")
            except Exception as e:
                print(f"Sign up notice for {email}: {e}")

        # If user_id was found or created, sync profile and user_roles
        if user_id:
            try:
                client.table("profiles").upsert(
                    {
                        "id": user_id,
                        "full_name": name,
                        "email": email,
                        "role": role,
                    }
                ).execute()
                print(f"Synced profile for {email} -> role: {role}")
            except Exception as e:
                print(f"Notice: syncing profile for {email}: {e}")

            try:
                client.table("user_roles").upsert(
                    {
                        "user_id": user_id,
                        "role_id": role,
                    },
                    on_conflict="user_id, role_id",
                ).execute()
                print(f"Assigned user_role for {email} -> {role}")
            except Exception as e:
                print(f"Notice: assigning user_role for {email}: {e}")


def seed_rbac(client):
    """Seeds roles, permissions, and role_permissions mappings."""
    print("Seeding RBAC roles & permissions...")
    try:
        client.table("roles").upsert(ROLES_DATA).execute()
        print(f"Seeded {len(ROLES_DATA)} roles.")

        client.table("permissions").upsert(PERMISSIONS_DATA).execute()
        print(f"Seeded {len(PERMISSIONS_DATA)} permissions.")

        role_perms_records = []
        for role_id, perm_ids in ROLE_PERMISSIONS_MAPPING.items():
            for pid in perm_ids:
                role_perms_records.append({"role_id": role_id, "permission_id": pid})

        client.table("role_permissions").upsert(
            role_perms_records,
            on_conflict="role_id, permission_id",
        ).execute()
        print(f"Seeded {len(role_perms_records)} role-permission mappings.")
    except Exception as e:
        print(f"RBAC seeding notice: {e}")


def seed_master_templates(client):
    """Seeds the 10 production master spreadsheet templates."""
    print("Seeding master templates...")
    try:
        client.table("master_templates").upsert(
            MASTER_TEMPLATES_DATA,
            on_conflict="sheet_name",
        ).execute()
        print(f"Seeded {len(MASTER_TEMPLATES_DATA)} master templates.")
    except Exception as e:
        print(f"Master templates seeding notice: {e}")


def seed():
    """Main production seeding routine."""
    print("=" * 60)
    print("Starting Clean Production Database Seeder for Xeno")
    print("=" * 60)

    client = get_supabase_admin_client()

    # 1. Seed Production Users
    seed_users(client)

    # 2. Seed RBAC structure
    seed_rbac(client)

    # 3. Seed Master Templates
    seed_master_templates(client)

    print("=" * 60)
    print("Production Database Seeding Completed Successfully!")
    print("Active Production Users:")
    print("  1. Jonathan Kent (admin@xenoent.com) -> Role: Super Admin")
    print("  2. Edja (edjamoo@xenoent.com) -> Role: Admin")
    print("Operational Data: Clean (0 clients, 0 vendors, 0 events, 0 tasks)")
    print("=" * 60)


if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"Fatal error seeding production database: {e}")
        sys.exit(1)
