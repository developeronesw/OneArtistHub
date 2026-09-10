#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then echo "Run as root: sudo bash self-host/install-ubuntu.sh" >&2; exit 1; fi
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="/opt/oneartist-hub"
MEDIA_DIR="/var/lib/oneartist-hub/media"
read -r -p "Domain name (example artist.com): " DOMAIN
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ && "$DOMAIN" == *.* && "$DOMAIN" != .* && "$DOMAIN" != *. ]] || { echo "Enter a valid DNS hostname such as artist.com." >&2; exit 1; }
read -r -p "Database name [oneartist_hub]: " DB_NAME; DB_NAME=${DB_NAME:-oneartist_hub}
read -r -p "Database user [oneartist_hub]: " DB_USER; DB_USER=${DB_USER:-oneartist_hub}
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Database name may contain only letters, numbers and underscores." >&2; exit 1; }
[[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Database user may contain only letters, numbers and underscores." >&2; exit 1; }
DB_PASSWORD="$(openssl rand -hex 24)"
SETUP_KEY="$(openssl rand -hex 32)"
ENC_KEY="$(openssl rand -hex 32)"

echo "Installing system packages..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm nginx mariadb-server openssl rsync certbot python3-certbot-nginx
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if (( NODE_MAJOR < 18 )); then echo "Node.js 18+ is required. Install a current Node.js LTS release and rerun this installer." >&2; exit 1; fi

id oneartist >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin oneartist
mkdir -p "$APP_DIR" "$MEDIA_DIR"
rsync -a --delete --exclude node_modules --exclude dist --exclude .git "$ROOT_DIR/" "$APP_DIR/"
chown -R oneartist:oneartist "$APP_DIR" "$MEDIA_DIR"

mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

cat > "$APP_DIR/self-host/.env" <<ENV
HOST=127.0.0.1
PORT=8788
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
ONEARTIST_SETUP_KEY=${SETUP_KEY}
APP_ENCRYPTION_KEY=${ENC_KEY}
MEDIA_ROOT=${MEDIA_DIR}
MAX_UPLOAD_BYTES=536870912
ENV
chmod 600 "$APP_DIR/self-host/.env"
chown oneartist:oneartist "$APP_DIR/self-host/.env"

cd "$APP_DIR"
runuser -u oneartist -- npm install
runuser -u oneartist -- npm run build
cd "$APP_DIR/self-host"
runuser -u oneartist -- npm install --omit=dev

cat > /etc/systemd/system/oneartist-hub.service <<UNIT
[Unit]
Description=OneArtist Hub API
After=network.target mariadb.service
Requires=mariadb.service

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
ReadWritePaths=${MEDIA_DIR}

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/sites-available/oneartist-hub <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root ${APP_DIR}/dist;
    index index.html;
    client_max_body_size 512m;

    location /api/ {
        proxy_pass http://127.0.0.1:8788;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
    location /assets/ { try_files \$uri =404; expires 1h; add_header Cache-Control "public, max-age=3600"; }
    location / { try_files \$uri \$uri/ /index.html; }
}
NGINX
ln -sf /etc/nginx/sites-available/oneartist-hub /etc/nginx/sites-enabled/oneartist-hub
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now oneartist-hub nginx

echo
echo "OneArtist Hub self-host installation is running."
echo "URL: http://${DOMAIN} (use HTTPS for administrator/customer sessions)"
echo "ONE-TIME SETUP KEY (save this now): ${SETUP_KEY}"
echo "The database password and encryption key were saved root-readable in ${APP_DIR}/self-host/.env."
echo
read -r -p "If DNS already points to this server, enable Let's Encrypt HTTPS now? [y/N]: " SSL
if [[ "$SSL" =~ ^[Yy]$ ]]; then certbot --nginx -d "$DOMAIN"; fi
