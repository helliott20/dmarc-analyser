# DMARC Analyser - Production Deployment Guide

Deploy DMARC Analyser to a Google Cloud VM using Docker.

## Cost

~$17/month (e2-small VM in London + 20GB SSD)

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed locally
- [Docker](https://docs.docker.com/get-docker/) installed locally
- Docker Hub account
- Domain name

---

## Step 1: Build and Push Docker Images

On your local machine:

```bash
# Login to Docker Hub
docker login

# Build and push both images
./deploy/push.sh

# Or with version tag
./deploy/push.sh v1.0.0
```

Images pushed to `helliott20/dmarc-analyser`:
- `:web` - Next.js web application
- `:worker` - Background job workers

---

## Step 2: Create GCP VM

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create VM in London (europe-west2)
gcloud compute instances create dmarc-analyser \
  --zone=europe-west2-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server

# Create firewall rules (if not already exists)
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --target-tags=https-server
```

---

## Step 3: Install Docker on VM

SSH into your VM:

```bash
gcloud compute ssh dmarc-analyser --zone=europe-west2-a
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit
```

SSH back in (required for group change):

```bash
gcloud compute ssh dmarc-analyser --zone=europe-west2-a
```

Verify Docker works:

```bash
docker --version
```

---

## Step 4: Deploy the Application

### 4.1 Create deployment directory

```bash
mkdir -p ~/dmarc-analyser/deploy
cd ~/dmarc-analyser
```

### 4.2 Create Caddyfile

Replace `YOUR_DOMAIN.COM` with your actual domain:

```bash
cat > deploy/Caddyfile << 'EOF'
YOUR_DOMAIN.COM {
    reverse_proxy web:3000
    encode gzip
}
EOF
```

### 4.3 Create environment file

```bash
cat > .env.production << 'EOF'
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
NEXTAUTH_URL=https://YOUR_DOMAIN.COM
NEXTAUTH_SECRET=CHANGE_ME_RUN_openssl_rand_base64_32
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
EOF
```

Edit with your actual values:

```bash
nano .env.production
```

**Tips:**
- Generate `POSTGRES_PASSWORD`: `openssl rand -base64 24 | tr -dc 'a-zA-Z0-9'` (no special chars!)
- Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### 4.4 Create data directories

```bash
sudo mkdir -p /var/lib/dmarc-analyser/{postgres,redis,caddy}
```

### 4.5 Create docker-compose.prod.yml

```bash
cat > docker-compose.prod.yml << 'EOF'
services:
  web:
    image: helliott20/dmarc-analyser:web
    container_name: dmarc-web
    restart: unless-stopped
    env_file: .env.production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://dmarc:${POSTGRES_PASSWORD}@postgres:5432/dmarc_analyser
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - dmarc-network

  worker:
    image: helliott20/dmarc-analyser:worker
    container_name: dmarc-worker
    restart: unless-stopped
    env_file: .env.production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://dmarc:${POSTGRES_PASSWORD}@postgres:5432/dmarc_analyser
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - dmarc-network

  postgres:
    image: postgres:16-alpine
    container_name: dmarc-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: dmarc
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: dmarc_analyser
    volumes:
      - /var/lib/dmarc-analyser/postgres:/var/lib/postgresql/data
    networks:
      - dmarc-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dmarc -d dmarc_analyser"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: dmarc-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy noeviction
    volumes:
      - /var/lib/dmarc-analyser/redis:/data
    networks:
      - dmarc-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  caddy:
    image: caddy:2-alpine
    container_name: dmarc-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - /var/lib/dmarc-analyser/caddy:/data
    networks:
      - dmarc-network
    depends_on:
      - web

networks:
  dmarc-network:
EOF
```

### 4.6 Pull and run

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Step 5: Point Your Domain

Get your VM's external IP:

```bash
gcloud compute instances describe dmarc-analyser \
  --zone=europe-west2-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

In your domain's DNS settings, add an A record:
- **Type**: A
- **Name**: `@` (or subdomain like `dmarc`)
- **Value**: Your VM's IP address

Caddy will automatically provision an SSL certificate once DNS propagates (5-15 minutes).

---

## Updating the Application

### On your local machine:

```bash
./deploy/push.sh
```

### On the VM:

```bash
cd ~/dmarc-analyser
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Useful Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker

# Restart a service
docker compose -f docker-compose.prod.yml restart web

# Stop everything
docker compose -f docker-compose.prod.yml down

# Check resource usage
docker stats

# Enter postgres shell
docker exec -it dmarc-postgres psql -U dmarc -d dmarc_analyser
```

---

## Troubleshooting

### Container won't start

```bash
docker compose -f docker-compose.prod.yml logs web
docker compose -f docker-compose.prod.yml logs worker
```

### SSL certificate issues

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Verify DNS points to VM
dig YOUR_DOMAIN.COM
```

### Out of memory

Add swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Backup (Optional)

### Manual database backup

```bash
docker exec dmarc-postgres pg_dump -U dmarc dmarc_analyser > backup_$(date +%Y%m%d).sql
```

### Restore from backup

```bash
cat backup_20241201.sql | docker exec -i dmarc-postgres psql -U dmarc -d dmarc_analyser
```
