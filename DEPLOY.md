# Deployment Guide: Self-Hosted Oracle Cloud VPS (Docker + Caddy)

This guide provides the exact, production-ready steps to deploy **Xeno Entertainment Operations** to an **Oracle Cloud Infrastructure (OCI) Ubuntu VPS** with automated HTTPS via **Caddy** and an optimized multi-stage **Docker** container for Next.js standalone mode.

- **Production Domain**: `xenoent.my.id`
- **Application Port**: `3000` (internal network only)
- **Public Ports**: `80` (HTTP) and `443` (HTTPS + HTTP/3)
- **Local Environment**: Runs natively with `pnpm run dev` (No Docker required locally).

---

## 1. Oracle Cloud VPS Ingress & Firewall Configuration

Oracle Cloud instances have two layers of firewall: the **OCI Virtual Cloud Network (VCN) Security List** and the **Ubuntu OS `iptables`**. Both must allow ports 80 and 443.

### A. OCI Security List (Web Console)
1. Go to **Networking** > **Virtual Cloud Networks** > Click your VCN > **Security Lists** > **Default Security List**.
2. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443`
   - **Description**: `Allow HTTP & HTTPS for Caddy`
3. Add a second Ingress Rule for HTTP/3 QUIC (optional but recommended):
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `UDP`
   - **Destination Port Range**: `443`
   - **Description**: `Allow HTTP/3 UDP`

### B. Ubuntu OS Firewall Configuration (Terminal)
SSH into your Oracle Ubuntu VPS and run:

```bash
# Allow ports 80 and 443 in Ubuntu iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT

# Persist iptables rules across reboots
sudo apt update && sudo apt install -y iptables-persistent
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

---

## 2. DNS Record Setup

In your domain registrar / DNS provider for `xenoent.my.id`:
- **A Record**:
  - Name: `@` (or `xenoent.my.id`)
  - Value: `<YOUR_ORACLE_VPS_PUBLIC_IP>`
  - TTL: Auto or 300

---

## 3. Install Docker & Docker Compose on Ubuntu

Run the official Docker convenience script:

```bash
# Update package cache
sudo apt update && sudo apt upgrade -y

# Install Docker engine
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group to run without sudo
sudo usermod -aG docker $USER

# Apply group changes immediately
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## 4. Clone Repository & Setup Environment

```bash
# 1. Clone repository to your home directory or /opt
git clone <YOUR_REPOSITORY_URL> xeno
cd xeno

# 2. Create the production environment file
nano .env
```

Paste your production credentials into `.env`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Google Calendar Integration (Optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@unique-axle-xxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

## 5. Build and Start the Application

Run Docker Compose to build the multi-stage Next.js standalone container and spin up Caddy:

```bash
docker compose up -d --build
```

### What Happens Automatically:
1. **`web` service**:
   - Uses multi-stage Next.js build (`deps` -> `builder` -> `runner`).
   - Copies standalone output and static assets.
   - Listens on `0.0.0.0:3000` inside the internal Docker network.
2. **`caddy` service**:
   - Binds to host ports `80` and `443`.
   - Reads `./Caddyfile` with reverse proxy config to `web:3000`.
   - Automatically negotiates and installs **free SSL/TLS certificates** from Let's Encrypt / ZeroSSL for `xenoent.my.id`.
   - Persists certificates in the `caddy_data` Docker volume.

---

## 6. Verifying & Managing the Deployment

```bash
# Check container status
docker compose ps

# View live logs of the Next.js app
docker compose logs -f web

# View live logs of Caddy (useful for SSL certificate status)
docker compose logs -f caddy

# Restart services
docker compose restart

# Stop services
docker compose down
```

---

## 7. Deploying Updates (Zero-Downtime Rebuild)

Whenever you push new code to Git:

```bash
cd ~/xeno
git pull origin main
docker compose up -d --build
```

Docker will build the new image in the background and gracefully swap the running container once healthy.

---

## 8. Local Development Reminder

In your local development environment (macOS / Linux / Windows), you **do not** use Docker:

```bash
# Local development is 100% native
pnpm install
pnpm run dev
```
Accessible at `http://localhost:3000`.
