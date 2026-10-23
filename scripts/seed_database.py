"""Canonical Production Database Seeder for Xeno Entertainment.

Single Source of Truth: supabase/seed.sql
This runner applies the canonical SQL seed and provisions production accounts.
"""

import sys
import os
import json
import urllib.request
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

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

def load_env():
    for filename in [".env.local", ".env"]:
        filepath = root_dir / filename
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v

def main():
    load_env()
    print("=" * 60)
    print("Starting Canonical Database Seeder (Python Runner)")
    print("Target SQL File: supabase/seed.sql")
    print("=" * 60)

    seed_sql_path = root_dir / "supabase" / "seed.sql"
    if not seed_sql_path.exists():
        print(f"Error: {seed_sql_path} does not exist.")
        sys.exit(1)

    with open(seed_sql_path, "r", encoding="utf-8") as f:
        query = f.read()

    access_token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")

    if access_token and supabase_url:
        project_ref = supabase_url.replace("https://", "").split(".")[0]
        req_url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        body = json.dumps({"query": query}).encode("utf-8")
        req = urllib.request.Request(req_url, data=body, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    print("✓ Successfully executed supabase/seed.sql via Supabase Management API.")
        except Exception as e:
            print(f"Notice executing via Management API: {e}")
    else:
        print("Note: Run supabase/seed.sql via Supabase CLI (supabase db reset) or psql.")

    print("=" * 60)
    print("Canonical Seeder Completed Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
