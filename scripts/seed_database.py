"""Seed database with dummy clients, vendors, events, and tasks."""

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from scripts.db_client import get_supabase_client

def seed():
    client = get_supabase_client()
    print("Beginning database seed...")

    # Ensure Admin and Staff dummy users
    for user_info in [
        {"email": "admin@xenoent.com", "password": "Password123!", "name": "Jonathan Admin", "role": "admin"},
        {"email": "staf@xenoent.com", "password": "Password123!", "name": "Rian Kru Operasional", "role": "staff"}
    ]:
        try:
            client.auth.sign_up({
                "email": user_info["email"],
                "password": user_info["password"],
                "options": {"data": {"full_name": user_info["name"]}}
            })
        except Exception:
            pass

    # Sign in as Admin to satisfy RLS policies
    try:
        client.auth.sign_in_with_password({
            "email": "admin@xenoent.com",
            "password": "Password123!"
        })
        print("Authenticated as Admin.")
    except Exception as e:
        print(f"Admin login notice: {e}")


    # 1. Clients
    clients_data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "Rian Pratama",
            "company": "PT Sinar Jaya Abadi",
            "email": "rian@sinarjaya.co.id",
            "phone": "+6281234567890",
            "address": "Sudirman SCBD Lot 8, Jakarta Selatan",
            "notes": "Corporate Gathering 500 pax",
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "Jessica Tan",
            "company": "Tan & Partners",
            "email": "jessica.tan@gmail.com",
            "phone": "+6281987654321",
            "address": "Menteng, Jakarta Pusat",
            "notes": "Private Wedding Reception",
        },
    ]
    client.table("clients").upsert(clients_data).execute()
    print("Seeded clients.")

    # 2. Vendors
    vendors_data = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "name": "Spectrum Lighting Pro",
            "category": "Lighting",
            "pic_name": "Budi Santoso",
            "phone": "+6281311223344",
            "email": "budi@spectrumlight.id",
            "notes": "Moving beam 350W, par LED, laser controller",
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Sonic Wave Audio",
            "category": "Sound System",
            "pic_name": "Agus Salim",
            "phone": "+6281700998877",
            "email": "info@sonicwave.com",
            "notes": "Line array L-Acoustics, digital mixer Allen & Heath",
        },
        {
            "id": "55555555-5555-5555-5555-555555555555",
            "name": "Delight Gourmet Catering",
            "category": "Catering",
            "pic_name": "Chef Melinda",
            "phone": "+6281555667788",
            "email": "melinda@delightgourmet.id",
            "notes": "Indonesian & Western buffet, VIP canapes",
        },
    ]
    client.table("vendors").upsert(vendors_data).execute()
    print("Seeded vendors.")

    # 3. Events
    now = datetime.now(timezone.utc)
    events_data = [
        {
            "id": "66666666-6666-6666-6666-666666666666",
            "title": "Sinar Jaya Annual Gala 2026",
            "description": "Annual gala dinner & award recognition",
            "client_id": "11111111-1111-1111-1111-111111111111",
            "venue": "Grand Ballroom Hotel Indonesia Kempinski",
            "start_date": (now + timedelta(days=5)).isoformat(),
            "end_date": (now + timedelta(days=5, hours=8)).isoformat(),
            "status": "confirmed",
            "budget": 250000000.00,
        },
        {
            "id": "77777777-7777-7777-7777-777777777777",
            "title": "Jessica & Kevin Wedding Reception",
            "description": "Luxury intimate outdoor wedding",
            "client_id": "22222222-2222-2222-2222-222222222222",
            "venue": "Plataran Dharmawangsa",
            "start_date": (now + timedelta(days=14)).isoformat(),
            "end_date": (now + timedelta(days=14, hours=6)).isoformat(),
            "status": "planning",
            "budget": 180000000.00,
        },
    ]
    client.table("events").upsert(events_data).execute()
    print("Seeded events.")

    # 4. Event Vendors
    event_vendors = [
        {
            "event_id": "66666666-6666-6666-6666-666666666666",
            "vendor_id": "33333333-3333-3333-3333-333333333333",
            "service_name": "Full Stage Intelligent Lighting Package",
            "cost": 35000000.00,
            "status": "contracted",
        },
        {
            "event_id": "66666666-6666-6666-6666-666666666666",
            "vendor_id": "44444444-4444-4444-4444-444444444444",
            "service_name": "20.000 Watt Line Array Sound Rig",
            "cost": 40000000.00,
            "status": "contracted",
        },
    ]
    client.table("event_vendors").upsert(event_vendors, on_conflict="event_id, vendor_id").execute()
    print("Seeded event vendors.")

    # 5. Event Tasks
    event_tasks = [
        {
            "id": "88888888-8888-8888-8888-888888888888",
            "event_id": "66666666-6666-6666-6666-666666666666",
            "title": "Finalize Rundown with MC",
            "description": "Confirm timing for CEO opening speech and awards",
            "due_date": (now + timedelta(days=2)).isoformat(),
            "status": "in_progress",
            "priority": "high",
        },
        {
            "id": "99999999-9999-9999-9999-999999999999",
            "event_id": "66666666-6666-6666-6666-666666666666",
            "title": "Technical Rider Loading & Sound Check",
            "description": "In-venue loading at 10:00 AM sharp",
            "due_date": (now + timedelta(days=5)).isoformat(),
            "status": "todo",
            "priority": "urgent",
        },
    ]
    client.table("event_tasks").upsert(event_tasks).execute()
    print("Seeded event tasks.")

    # 6. RBAC Tables
    try:
        roles_data = [
            {"id": "admin", "name": "Administrator", "description": "Akses penuh seluruh konfigurasi sistem, database, dan hak akses"},
            {"id": "manager", "name": "Event Manager", "description": "Pengelolaan acara, klien, vendor, dan checklist panggung"},
            {"id": "staff", "name": "Kru Operasional", "description": "Eksekusi teknis lapangan dan pembaruan status tugas"},
        ]
        client.table("roles").upsert(roles_data).execute()
        print("Seeded roles.")

        perms_data = [
            {"id": "users:manage", "name": "Kelola Pengguna & Hak Akses", "module": "users", "description": "Akun & peran"},
            {"id": "events:read", "name": "Lihat Jadwal & Detail Acara", "module": "events", "description": "Jadwal & rundown"},
            {"id": "events:create", "name": "Inisialisasi Acara Baru", "module": "events", "description": "Buat event"},
            {"id": "events:update", "name": "Perbarui Informasi Acara", "module": "events", "description": "Edit event"},
            {"id": "events:delete", "name": "Hapus Data Acara", "module": "events", "description": "Hapus event"},
            {"id": "clients:manage", "name": "Kelola Database Klien", "module": "clients", "description": "Kontak klien"},
            {"id": "vendors:manage", "name": "Kelola Database Vendor", "module": "vendors", "description": "Mitra vendor"},
            {"id": "tasks:manage", "name": "Kelola Tugas & Checklist Kru", "module": "tasks", "description": "Checklist teknis"},
        ]
        client.table("permissions").upsert(perms_data).execute()
        print("Seeded permissions.")
    except Exception as e:
        print(f"RBAC seeding notice (tables not created yet in Supabase): {e}")

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"Error seeding database: {e}")
        sys.exit(1)
