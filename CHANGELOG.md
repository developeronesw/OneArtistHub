# Changelog

## 0.3.0 — Mockup-Locked Public Themes — 2026-09-10

- Rebuilt Midnight Cinema to match the approved cinematic black/gold concept: framed desktop canvas, editorial serif identity, cinematic hero, gold CTA system, featured-release panel, video/merch split, tour rows, and matching player treatment.
- Rebuilt Artist OS to match the approved futuristic creator-OS concept: fixed desktop navigation rail, immersive moon/hero workspace, feature-release card, modular dashboard-style content grid, community/quote modules, and blue glass player.
- Rebuilt Neon Editorial to match the approved high-fashion neon concept: asymmetrical editorial hero, oversized split-color headline, image-led composition, latest-release feature, dense music/video/merch grids, poster typography, and pink/cyan player treatment.
- Added independent tablet/mobile geometry for each theme instead of collapsing all three through one generic responsive template.
- Preserved existing content APIs, commerce, media pipeline, player continuity, analytics, D1/MySQL/SQLite portability, storage providers, email providers, and PayPal integrations.

## 0.2.2 — Infrastructure & Integrations
- Added S3-compatible media storage with AWS Signature V4 and connection testing.
- Added Brevo and self-hosted SMTP transactional email adapters.
- Added durable transactional email queue with retry/dead-letter handling.
- Added Node/VPS SQLite database profile and Ubuntu SQLite installer.
- Added PayPal Connect partner-onboarding architecture and a separate central Worker reference service.
- Includes 0.2.1 Media Library and Universal Asset Picker for cumulative 0.2.0 upgrades.

## 0.2.1 — Media Library & Universal Asset Picker

- Replaced URL-only media administration with a real provider-backed Media Library.
- Added reusable Media Library image picker to release, track, product, artist profile, artist logo, homepage hero and Album ZIP workflows.
- Added direct image upload from artwork/image fields while preserving manual URL entry.
- Added responsive media search/filter grid, image previews, file/provider/folder details and public URL copy action.
- Added reusable media title and alt-text metadata editing.
- Added reference-aware deletion protection so in-use media cannot be removed accidentally.
- Added provider-aware deletion for Cloudflare R2, Dropbox and VPS-local storage.
- Added safer public media delivery headers and attachment behavior for document media.
- Preserved the 0.2.0 Album ZIP ingest, storage adapters, MySQL/VPS profile, PayPal commerce and email-provider integrations without a database migration.

## 0.2.0 — Media & Deployment

- Added OneArtist Album Ingest for Album/EP/Single MP3 ZIPs.
- Added automatic ID3 reading, drag/touch track ordering, editable metadata, external or embedded artwork detection/replacement and customer-ready ZIP generation.
- Finalization strips prior ID3v2/ID3v1 tags, rewrites clean ID3v2.4 title, artist, album, track/total, year and genre metadata, embeds album artwork, and records full track duration while generating previews.
- Added automatic preview-audio generation and upload during release finalization.
- Added provider-backed media object records with protected R2, Dropbox and VPS-local storage support.
- Digital products can now reference managed private media objects instead of requiring permanent Dropbox paths.
- Added Cloudflare Email Service REST adapter while preserving Resend.
- Added PayPal direct-merchant credential test from Settings.
- Added self-hosted Node.js + MySQL/MariaDB + local-storage profile, NGINX/systemd Ubuntu installer and MySQL schema.
- Added automatic 0.2.0 D1 migration; existing 0.1.3 content, orders, counters, accounts, themes and integrations remain intact.
- Preserved SVG-only application icon/logo contract and Aurora Glass Studio responsive dashboard.

## 0.1.3 — Commerce & Customer Accounts

- Added passwordless customer accounts with 20-minute email magic links and 30-day secure customer sessions.
- Added My Orders & Downloads with rotating 15-minute one-time download links.
- Added branded printable invoices/receipts, refund totals, fulfillment and tracking status.
- Added PayPal webhook signature verification, idempotent webhook event storage and server-side capture fallback.
- Hardened concurrent browser/webhook capture races: already-captured PayPal orders are re-read from PayPal and duplicate finalizers wait for the canonical D1 order instead of orphaning a paid buyer.
- Added PayPal refunds, transaction history, refund-aware revenue, customer count, AOV, top-product and digital/physical dashboard analytics.
- Added structured product variants for size/color/SKU/price override/inventory and server-verified variant checkout.
- Added automatic inventory decrement and low-stock notifications after verified captures.
- Added Customers and Digital Downloads admin screens, entitlement reset controls and webhook health visibility.
- Added PayPal Webhook ID configuration without requiring the client secret to be re-entered.
- Preserved OneArtist Hub 0.1.2 glass player, content CRUD, themes, counters, security and transactional email.

## 0.1.2 — Glass Player, Identity & Notifications

- Rebuilt public continuous player as a responsive glass SaaS player inspired by OneMusicPlayer.
- Added queue, shuffle, repeat, favorites, volume, progress seeking, desktop floating player and mobile full-player experience.
- Preserved server-verified play counters.
- Added forgot-password recovery with one-time 30-minute reset links plus deployment-key emergency recovery when email is unavailable.
- Added administrator password change, email change and session invalidation.
- Added D1 notification center and live Aurora notification bell.
- Added Resend email adapter with encrypted API-key storage and test-email flow.
- Added customer purchase receipts and administrator new-sale notifications.
- Added shipping/tracking customer notifications and low-inventory dashboard alerts.
- Added notification preferences and automatic 0.1.2 D1 migration for existing installations.
- Kept all built-in UI icons and logos SVG-only.

## 0.1.1 — Content Management

- Functional releases/tracks/videos/tours/products/pages/media CRUD.
- YouTube metadata/thumbnail retrieval.
- Immediate public theme activation.
- Functional dashboard quick actions.
