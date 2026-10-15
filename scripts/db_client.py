"""Supabase Python Client Factory

Provides an authenticated supabase Client instance loaded from .env.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Explicitly load .env.local and .env from project root
env_local = Path(__file__).resolve().parent.parent / ".env.local"
if env_local.exists():
    load_dotenv(dotenv_path=env_local, override=True)

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

def get_supabase_client() -> Client:
    """Initializes and returns a Supabase client using environment variables."""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.")

    return create_client(url, key)

def get_supabase_admin_client() -> Client:
    """Initializes and returns a Supabase client using service role key when available."""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in environment.")

    return create_client(url, key)

