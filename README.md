# OneArtist Hub 0.2.0 — Media & Deployment

**Official admin design:** Aurora Glass Studio  
**Public themes:** Midnight Cinema, Artist OS, Neon Editorial

OneArtist Hub is a responsive artist CMS, storefront, continuous music player and portable JavaScript backend. **Cloudflare Pages + Pages Functions + D1** remains the recommended serverless profile, while 0.2.0 adds a **Node.js + MySQL/MariaDB + NGINX** self-hosted/VPS profile. PHP is not required.

## What is functional in this build

- OneArtist Album Ingest: upload an Album/EP/Single ZIP containing MP3 tracks and optional artwork
- Automatic ID3v2 metadata reading, embedded/external artwork detection, editable track titles and drag/touch track ordering
- Finalize pipeline removes old ID3v2/ID3v1 tags, rewrites MP3 title/artist/album/track-total/year/genre tags, embeds cover artwork and records full track durations
- Automatic customer-ready release ZIP creation plus protected storage linkage
- Browser-generated 30/60/90-second WAV previews uploaded as public stream sources
- Provider-backed media objects stored in D1/MySQL as metadata pointers, never as database blobs
- Cloudflare R2 or Dropbox storage in the serverless profile; private local storage in the VPS profile
- Cloudflare Email Service transactional-email adapter alongside Resend
- PayPal credential connection test and direct-merchant Apps & Credentials workflow
- Self-hosted Node.js API with MySQL/MariaDB adapter, local media storage, NGINX and systemd installer
- Browser-based first-run setup with a one-time setup key
- Username/email/password administrator login plus secure forgot-password email recovery
- PBKDF2-SHA256 password hashing
- HttpOnly + Secure + SameSite administrator sessions
- Session-bound CSRF protection for admin writes
- AES-GCM encrypted PayPal, Dropbox and transactional-email integration credentials
- Aurora Glass Studio responsive dashboard
- Aurora notification bell backed by D1 with sale, inventory and security events
- Resend transactional email adapter, test-email tool and configurable sender identity
- Customer purchase receipt/download emails and artist new-sale emails
- Passwordless customer My Account portal using one-time email magic links
- Customer order history with branded printable invoices/receipts, refunds, fulfillment and tracking
- Secure customer My Downloads with rotating 15-minute one-time links and admin entitlement resets
- PayPal webhook signature verification with idempotent event processing, server-side capture fallback and concurrent browser/webhook race recovery
- PayPal partial/full refunds with refund-aware revenue and customer email notification
- Structured physical-product variants with size/color/SKU/price override and per-variant inventory
- Server-verified inventory decrement and low-stock alerts after captured payment
- Customer, download-entitlement and webhook-health administration screens
- Commerce dashboard metrics for net/gross revenue, refunds, customers, AOV, top products and digital/physical sales
- Customer shipping/tracking emails when fulfillment is updated
- Administrator password change, administrator email change and old-session invalidation
- Real D1-backed counters for verified audio plays, page/site views and protected downloads
- D1-backed revenue/order/release dashboard metrics plus real 30-day verified engagement series
- CRUD for releases, tracks, YouTube videos, tour dates, products, custom pages and media URLs
- Three switchable public themes
- OneMusicPlayer-inspired floating glass SaaS continuous player with responsive mobile full-player, queue, shuffle, repeat, favorites and volume
- Play counting after 10 seconds of real preview playback
- Page-view deduplication by visitor and day
- Audio/video analytics deduplication by visitor and hour
- YouTube thumbnails derived from YouTube IDs
- YouTube playback in a responsive modal
- Custom HTML pages with server-side removal of scripts, iframes, inline event handlers and `javascript:` URLs
- PayPal JS checkout using server-created/server-captured Orders API transactions, with D1 checkout snapshots and capture amount/currency verification
- Physical-product flat shipping calculated server-side
- D1 order history, printable customer receipts, PayPal shipping capture, and physical-fulfillment/tracking controls
- Digital purchase entitlements
- One-time 15-minute download authorization tokens
- Dropbox-backed private digital delivery streamed through the server
- Download limits configurable per site
- SVG-only OneArtist Hub logo, UI icons and included artwork
- Two original local WAV preview files for immediate counter/player testing
- Standard React 18 + Vite production build; Cloudflare installs dependencies during deployment and bundles React into the final static site

## Root-level ZIP deployment

Upload the **contents** of the extracted folder into the root of a new GitHub repository. `package.json`, `index.html`, `functions/`, `src/`, and `database/` should all be at the repository root.

Recommended Cloudflare Pages build settings:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank / repository root

The `/functions` directory intentionally stays outside `dist`; Cloudflare Pages Functions discovers it at the project root.

Then create a D1 database and bind it to the Pages project with the binding name exactly:

`DB`

Add two encrypted runtime secrets:

- `ONEARTIST_SETUP_KEY` — a long random password you will type once into the installer
- `APP_ENCRYPTION_KEY` — a different random secret of at least 24 characters; 32+ random characters recommended

After the binding and secrets are added, redeploy and visit:

`https://YOUR-SITE.pages.dev/admin`

The installer creates the D1 schema itself. You do **not** have to paste SQL manually for the normal installation path.

See `docs/CLOUDFLARE-SETUP.md` for the browser-only walkthrough and `docs/COMMERCE-0.1.3.md` for PayPal webhook/customer-account setup.

## Never put these in GitHub

- PayPal Client Secret
- Dropbox access token
- `ONEARTIST_SETUP_KEY`
- `APP_ENCRYPTION_KEY`
- future private API credentials

PayPal, Dropbox and email-provider credentials are entered from the secure OneArtist Hub dashboard after installation and encrypted before being written to D1.

## Demo data

Leave **Load demo content** checked during first setup. The installer creates demo releases, preview tracks, one YouTube video, future tour dates, physical merch, a digital product and an About page. The preview WAV files and SVG artwork are included locally, so the player and play counter can be tested immediately.

## Architecture notes

Cloudflare/D1 is the implemented backend adapter in the current release. The API boundary intentionally keeps the public/admin React UI independent from D1 so additional MySQL/PostgreSQL/SQLite/self-hosted adapters can be added without rebuilding the themes.

PayPal and Dropbox require your own provider credentials before those external flows can be end-to-end tested. The rest of the CMS can be tested using the included demo data immediately after D1 installation.

## QA commands

For local development/QA, install the declared React/Vite dependencies first:

```bash
npm install
npm run check
npm run build
```

Cloudflare Pages installs the package dependencies automatically during its Git build, then `npm run build` produces `dist/` with Vite.

## Email notifications

OneArtist Hub 0.1.2 supports Resend through the server-side REST API. Configure it under **Settings → Email & Sales Notifications** using a sending API key and a verified sender address. Forgot-password recovery depends on a working email integration.

## Version

0.1.3 Commerce & Customer Accounts — September 9, 2026
