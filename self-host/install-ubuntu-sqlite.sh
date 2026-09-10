#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then echo "Run as root: sudo bash self-host/install-ubuntu-sqlite.sh" >&2; exit 1; fi
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; APP_DIR="/opt/oneartist-hub"; DATA_DIR="/var/lib/oneartist-hub"; MEDIA_DIR="$DATA_DIR/media"
read -r -p "Domain name (example artist.com): " DOMAIN
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ && "$DOMAIN" == *.* ]] || { echo "Invalid hostname." >&2; exit 1; }
SETUP_KEY="$(openssl rand -hex 32)"; ENC_KEY="$(openssl rand -hex 32)"
apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm nginx openssl rsync certbot python3-certbot-nginx build-essential python3
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]"); if (( NODE_MAJOR < 18 )); then echo "Node.js 18+ required." >&2; exit 1; fi
id oneartist >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin oneartist
mkdir -p "$APP_DIR" "$MEDIA_DIR"; rsync -a --delete --exclude node_modules --exclude dist --exclude .git "$ROOT_DIR/" "$APP_DIR/"; chown -R oneartist:oneartist "$APP_DIR" "$DATA_DIR"
cat > "$APP_DIR/self-host/.env" <<ENV
HOST=127.0.0.1
PORT=8788
DB_DRIVER=sqlite
SQLITE_FILE=${DATA_DIR}/oneartist.sqlite
ONEARTIST_SETUP_KEY=${SETUP_KEY}
APP_ENCRYPTION_KEY=${ENC_KEY}
MEDIA_ROOT=${MEDIA_DIR}
MAX_UPLOAD_BYTES=536870912
ENV
chmod 600 "$APP_DIR/self-host/.env"; chown oneartist:oneartist "$APP_DIR/self-host/.env"
cd "$APP_DIR"; runuser -u oneartist -- npm install; runuser -u oneartist -- npm run build; cd "$APP_DIR/self-host"; runuser -u oneartist -- npm install --omit=dev
cat > /etc/systemd/system/oneartist-hub.service <<UNIT
[Unit]
Description=OneArtist Hub API
After=network.target
[Service]
Type=simple
User=oneartist
Group=oneartist
WorkingDirectory=${APP_DIR}/self-host
EnvironmentFile=${APP_DIR}/self-host/.env
ExecStart=/usr/bin/node ${APP_DIR}/self-host/server.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=${DATA_DIR}
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/nginx/sites-available/oneartist-hub <<NGINX
server {
 listen 80; listen [::]:80; server_name ${DOMAIN}; root ${APP_DIR}/dist; index index.html; client_max_body_size 512m;
 location /api/ { proxy_pass http://127.0.0.1:8788; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 300s; }
 location /assets/ { try_files \$uri =404; expires 1h; add_header Cache-Control "public, max-age=3600"; }
 location / { try_files \$uri \$uri/ /index.html; }
}
NGINX
ln -sf /etc/nginx/sites-available/oneartist-hub /etc/nginx/sites-enabled/oneartist-hub; rm -f /etc/nginx/sites-enabled/default; nginx -t; systemctl daemon-reload; systemctl enable --now oneartist-hub nginx
echo "OneArtist Hub SQLite/VPS installation is running at http://${DOMAIN}"; echo "ONE-TIME SETUP KEY: ${SETUP_KEY}"
read -r -p "If DNS already points here, enable Let's Encrypt HTTPS now? [y/N]: " SSL; [[ "$SSL" =~ ^[Yy]$ ]] && certbot --nginx -d "$DOMAIN" || true
