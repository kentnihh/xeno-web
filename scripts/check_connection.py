"""Verify Supabase live connectivity using Python supabase-py."""

import sys
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from scripts.db_client import get_supabase_client

def main():
    print("Testing Supabase Python connection...")
    try:
        client = get_supabase_client()
        session = client.auth.get_session()
        print("Connected to Supabase successfully via Python Client!")
        
        # Test table query
        res = client.table("events").select("id").limit(1).execute()
        print(f"Table query succeeded! Found {len(res.data)} event records.")
    except Exception as e:
        err = str(e)
        if "PGRST205" in err or "schema cache" in err:
            print("Connected to Supabase project successfully! (Note: run supabase/schema.sql in Supabase SQL editor to create tables).")
        else:
            print(f"Connection notice: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()

