# OneArtist Hub 0.4.0 - Security-Hardened Release Candidate

**Official admin design:** Aurora Glass Studio  
**Public themes:** Midnight Cinema, Artist OS, Neon Editorial

OneArtist Hub is a responsive artist CMS, storefront, continuous music player and portable JavaScript backend. **Cloudflare Pages + Pages Functions + D1** remains the recommended serverless profile, while the same application also supports a **Node.js + MySQL/MariaDB + NGINX** self-hosted/VPS profile. PHP is not required. Version 0.4.0 hardens authentication, receipts, downloads, uploads, album ingest, content URLs, PayPal validation, diagnostics and security event logging while preserving the mockup-locked public themes and existing data model.

## What is functional in this build

- Provider-backed Media Library for uploaded artwork, artist/hero images, audio, video and documents
- Universal image asset picker available from release covers, track artwork, product images, artist profile image, artist logo, homepage hero and Album ZIP ingest
- Direct image upload from the same forms without leaving the editor, while preserving manual URL entry
- Searchable responsive media grid with image previews, provider/folder/file-size details and copyable public URLs
- Media title and alt-text editing for reusable accessibility/organization metadata
- In-use reference detection blocks destructive deletion of media still referenced by site content/settings
- Provider-aware media deletion for Cloudflare R2, Dropbox and VPS-local storage
- OneArtist Album Ingest: upload an Album/EP/Single ZIP containing MP3 tracks and optional artwork
- Automatic ID3v2 metadata reading, embedded/external artwork detection, editable track titles and drag/touch track ordering
- Finalize pipeline removes old ID3v2/ID3v1 tags, rewrites MP3 title/artist/album/track-total/year/genre tags, embeds cover artwork and records full track durations
- Automatic customer-ready release ZIP creation plus protected storage linkage
- Browser-generated 30/60/90-second WAV previews uploaded as public stream sources
- Provider-backed media objects stored in D1/MySQL as metadata pointers, never as database blobs
- Cloudflare R2 or Dropbox storage in the serverless profile; private local storage in the VPS profile
- Cloudflare Email Service transactional-email adapter alongside Resend
- PayPal seller onboarding through a central Cloudflare Worker
- Self-hosted Node.js API with MySQL/MariaDB adapter, local media storage, NGINX and systemd installer
- Browser-based first-run setup with a one-time setup key
- Username/email/password administrator login plus secure forgot-password email recovery
- PBKDF2-SHA256 password hashing
- HttpOnly + Secure + SameSite administrator sessions
- Session-bound CSRF protection for admin writes
- AES-GCM encrypted integration credentials; PayPal platform secrets stay in the central Connect Worker
- Aurora Glass Studio responsive dashboard
- Aurora notification bell backed by D1 with sale, inventory and security events
- Resend transactional email adapter, test-email tool and configurable sender identity
- Customer purchase receipt/download emails and artist new-sale emails
- Passwordless customer My Account portal using one-time email magic links
- Customer order history with branded printable invoices/receipts, refunds, fulfillment and tracking
- Secure customer My Downloads with rotating 15-minute one-time links and admin entitlement resets
- Central PayPal webhook signature verification, per-artist event routing, idempotent event processing and concurrent browser/webhook race recovery
- PayPal partial/full refunds through the central Worker with refund-aware revenue and customer email notification
- Structured physical-product variants with size/color/SKU/price override and per-variant inventory
- Server-verified inventory decrement and low-stock alerts after captured payment
- Customer, download-entitlement and webhook-health administration screens
- Commerce dashboard metrics for net/gross revenue, refunds, customers, AOV, top products and digital/physical sales
- Customer shipping/tracking emails when fulfillment is updated
- Administrator password change, administrator email change and old-session invalidation
- Real D1-backed counters for verified audio plays, page/site views and protected downloads
- D1-backed revenue/order/release dashboard metrics plus real 30-day verified engagement series
- CRUD for releases, tracks, YouTube videos, tour dates, products and custom pages, plus a real provider-backed Media Library
- Three switchable public themes
- OneMusicPlayer-inspired floating glass SaaS continuous player with responsive mobile full-player, queue, shuffle, repeat, favorites and volume
- Play counting after 10 seconds of real preview playback
- Page-view deduplication by visitor and day
- Audio/video analytics deduplication by visitor and hour
- YouTube thumbnails derived from YouTube IDs
- YouTube playback in a responsive modal
- Custom HTML pages with server-side removal of scripts, iframes, inline event handlers and `javascript:` URLs
- PayPal JS checkout using a platform client ID + connected seller merchant ID, server-created/server-captured Orders API transactions, D1 checkout snapshots and capture amount/currency verification
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

Dropbox and email-provider credentials are entered from the secure OneArtist Hub dashboard and encrypted in D1. PayPal platform credentials remain in the central OneArtist Connect Worker.

## Demo data

Leave **Load demo content** checked during first setup. The installer creates demo releases, preview tracks, one YouTube video, future tour dates, physical merch, a digital product and an About page. The preview WAV files and SVG artwork are included locally, so the player and play counter can be tested immediately.

## Architecture notes

Cloudflare/D1 is the recommended serverless backend. The self-hosted profile uses the same API contract through the included MySQL/MariaDB compatibility adapter and private local-storage provider. The React UI remains independent of the selected database/storage profile, so additional adapters can be introduced without rebuilding the public themes.

PayPal requires the central OneArtist Connect Worker to be configured before seller payments can be end-to-end tested; artists do not enter PayPal API credentials. The rest of the CMS can be tested using the included demo data immediately after D1 installation.

### Automatic OneArtist Connect registration

Managed HTTPS installations register with the central Connect Worker automatically during first-run setup. The managed server-side control plane generates an installation ID and one-time bootstrap credential in memory, activates its hash, and exchanges it immediately for a Worker-generated `OAH_INST_<64 lowercase hexadecimal characters>` credential encrypted in the server-side integrations store. Neither credential is sent to the browser or added to Vite variables. Standalone self-hosted installations remain unprovisioned unless explicitly enrolled.

The Connect Worker needs a `CONNECT_INSTALLATIONS` KV binding. The managed control-plane runtime is configured with `ONEARTIST_CONNECT_PROVISIONING_SECRET`; it is never configured for self-hosted customer servers or client code and authenticates activation to the Worker’s `CONNECT_SHARED_SECRET`. Successful registration consumes the one-time KV activation. Existing `ONEARTIST_CONNECT_TOKEN` deployments remain supported as a legacy/manual migration path. See [connect-service/README.md](connect-service/README.md) for local-test instructions.

## QA commands

For local development/QA, install the declared React/Vite dependencies first:

```bash
npm install
npm run check
npm run build
```

Cloudflare Pages installs the package dependencies automatically during its Git build, then `npm run build` produces `dist/` with Vite.

## Email notifications

OneArtist Hub supports **Resend** and **Cloudflare Email Service** from **Settings → Email & Sales Notifications**. Provider credentials are encrypted at rest. Resend remains suitable for the normal serverless setup; Cloudflare Email Service can be selected when the deployment/account has the required sending capability. Forgot-password recovery and customer magic-link sign-in depend on a working email integration.

## Version

0.4.0 Security-Hardened Release Candidate - September 11, 2026

Local and source-level verification is complete. Cloudflare Pages/D1, self-hosted MySQL/MariaDB runtime, and PayPal sandbox verification remain blocked pending environment access. See `docs/RELEASE-QA-0.4.0.md`.


## 0.2.2 provider support
OneArtist Hub supports D1/MySQL/MariaDB/SQLite databases; R2/Dropbox/S3-compatible/VPS-local storage; Resend/Brevo/Cloudflare Email/SMTP mail; and PayPal Direct plus optional partner-onboarding architecture. See `docs/INTEGRATIONS-0.2.2.md`.

Release QA notes: `docs/RELEASE-QA-0.2.2.md`.


## 0.3.0 mockup-locked public themes

The three public themes are intentionally separate visual systems, not recolors of one shared template. Midnight Cinema, Artist OS, and Neon Editorial reproduce the approved concept-board geometry and visual hierarchy while binding to the same live OneArtist content, commerce, analytics, media and continuous-player data. Theme switching remains immediate through `site.publicTheme`.


## Simple Theme Builder

OneArtistHub includes a lightweight visual homepage builder under **Admin → Theme Builder**. Artists can reorder sections with drag-and-drop, add multiple hero sections, create two-column layouts, move components between columns, configure section content, and activate the responsive result without editing code. See `docs/THEME-BUILDER.md`.
