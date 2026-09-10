# OneArtist Hub Self-Hosted / VPS Profile

This profile runs the same OneArtist Hub React application and API contract on a Linux VPS without Cloudflare D1.

## Supported baseline
- Ubuntu 22.04/24.04 or compatible Debian-family host
- Node.js 18+
- MariaDB/MySQL
- NGINX
- Local private media storage (default), Dropbox, or other adapters as added

## Automated Ubuntu install
From the extracted OneArtist Hub root:

```bash
sudo bash self-host/install-ubuntu.sh
```

The installer creates a local database/user, builds React, installs the Node API, configures NGINX and systemd, creates secure random setup/encryption keys, and optionally invokes Certbot after DNS points to the server.

After installation, enable HTTPS (the installer can run Certbot once DNS resolves), then visit `/admin` and enter the one-time setup key printed by the installer. HTTP can be used for an initial local check, but production administrator/customer sessions should always use HTTPS.

## Manual environment
Copy `.env.example` to `.env`, fill every required value, build the root React app, install `self-host` dependencies, then start `node self-host/server.mjs` behind your reverse proxy.

The default local media directory is private and is never exposed directly by NGINX. Public previews and paid downloads flow through the OneArtist API so analytics and entitlement checks remain active.
