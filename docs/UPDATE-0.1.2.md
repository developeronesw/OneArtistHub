# OneArtist Hub 0.1.2 — Glass Player, Identity & Notifications

This is an in-place update for existing 0.1.1 installations.

## What changes

- OneMusicPlayer-inspired glass SaaS continuous player
- responsive mobile mini-player and full-screen player
- shuffle, repeat-one/repeat-all, queue, volume and local favorites
- forgot-password email recovery with 30-minute one-time tokens plus emergency deployment-key recovery
- administrator password and email management
- Aurora notification bell backed by D1
- sale, low-inventory and security notifications
- Resend transactional email integration
- customer purchase receipt email
- artist new-sale email
- shipping/tracking email when fulfillment changes to shipped/delivered
- email test tool and notification preferences
- D1 migration runs automatically on the first request after deployment

## Upgrade

Extract this update at the repository root, then run:

```bash
npm run check
npm run build
git add -A
git commit -m "Update OneArtist Hub to 0.1.2 Glass Player and Notifications"
git push origin main
```

Cloudflare will redeploy automatically. Do not recreate D1 and do not rerun setup.

## Email setup

After deployment:

1. Sign into `/admin`.
2. Open **Settings**.
3. Under **Email & Sales Notifications**, enter a Resend sending API key and a verified sender address.
4. Save the integration.
5. Send a test email.

The email key is encrypted before being written to D1. It is never returned by the API or stored in GitHub.
