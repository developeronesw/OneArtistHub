# OneArtist Hub 0.1.1 — Content Management

**Official admin design:** Aurora Glass Studio  
**Public themes:** Midnight Cinema, Artist OS, Neon Editorial

OneArtist Hub is a responsive artist CMS, storefront, continuous music player and serverless backend. This functional content-management release uses **Cloudflare Pages + Pages Functions + D1** for the recommended deployment profile. No PHP, MySQL or VPS is required for this profile.

## What is functional in this build

- Browser-based first-run setup with a one-time setup key
- Username/email/password administrator login
- PBKDF2-SHA256 password hashing
- HttpOnly + Secure + SameSite administrator sessions
- Session-bound CSRF protection for admin writes
- AES-GCM encrypted PayPal and Dropbox integration credentials
- Aurora Glass Studio responsive dashboard
- Real D1-backed counters for verified audio plays, page/site views and protected downloads
- D1-backed revenue/order/release dashboard metrics plus real 30-day verified engagement series
- CRUD for releases, tracks, YouTube videos, tour dates, products, custom pages and media URLs
- Three switchable public themes
- Persistent continuous music player
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

See `docs/CLOUDFLARE-SETUP.md` for the browser-only walkthrough.

## Never put these in GitHub

- PayPal Client Secret
- Dropbox access token
- `ONEARTIST_SETUP_KEY`
- `APP_ENCRYPTION_KEY`
- future private API credentials

PayPal and Dropbox credentials are entered from the secure OneArtist Hub dashboard after installation and encrypted before being written to D1.

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

## Version

0.1.1 Content Management — September 9, 2026
