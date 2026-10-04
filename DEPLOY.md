# Sparks – Production Deploy (Docker + Nginx + Let's Encrypt)

| Domain | Service |
|---|---|
| https://api.sparks-learning.com | `backend-spark` (Express + Socket.IO), MongoDB |
| https://admin.sparks-learning.com | `sparksAdmin` (Vite React build) |
| https://landing.sparks-learning.com | `Landing page` (Vite React build) |

## 1. DNS
Add **A records** for `api.sparks-learning.com`, `admin.sparks-learning.com`, and `landing.sparks-learning.com` → server public IP.
Open ports **80** and **443** (security group / `ufw allow 80,443/tcp`).

## 2. Server setup (Ubuntu)
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # re-login after this
```

## 3. Upload code
Copy these to the server (e.g. `/opt/sparks`):
```
compose.yml  init-letsencrypt.sh  nginx/  backend-spark/  sparksAdmin/  "Landing page/"
```
(`node_modules` and `dist` are not needed.)

## 4. Backend env
Edit `backend-spark/.env` (JWT, SMTP, AWS ...). `MONGO_URI` is overridden by compose
to `mongodb://mongo:27017/eduspark`, so the local value doesn't matter.

## 5. First start + SSL (only once)
```bash
cd /opt/sparks
chmod +x init-letsencrypt.sh
sudo ./init-letsencrypt.sh            # test first with: sudo STAGING=1 ./init-letsencrypt.sh
docker compose exec api npm run seed:admin   # create the first admin user
```
Certificates renew automatically (certbot container every 12h, nginx reload every 6h).

## Day-to-day
```bash
docker compose up -d --build api      # redeploy backend
docker compose up -d --build admin    # redeploy admin panel
docker compose up -d --build landing  # redeploy landing page
docker compose logs -f api            # logs
docker compose ps
```

## Backup MongoDB
```bash
docker compose exec mongo mongodump --db eduspark --archive > backup-$(date +%F).archive
```
