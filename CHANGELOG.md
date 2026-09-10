# Changelog

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
