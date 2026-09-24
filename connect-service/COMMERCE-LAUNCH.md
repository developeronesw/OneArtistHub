# OneArtistHub Commerce Launch

This Worker remains the secure backend for the commercial site.

## 1. Create D1

From connect-service/:

```bash
npx wrangler d1 create oneartisthub-commerce --binding COMMERCE_DB --update-config
npx wrangler d1 execute oneartisthub-commerce --remote --file=commerce-schema.sql
```

The database ID is infrastructure metadata, not a secret. Do not commit API tokens or passwords.

## 2. Admin credentials

Generate a password hash locally:

```bash
npm run admin:hash
```

Put the resulting hash in the Worker secret ADMIN_PASSWORD_HASH and set ADMIN_EMAIL.

Never put the actual admin password in GitHub, Wrangler config, Pages variables, or browser code.

## 3. Square

For the OneArtistHub commercial store, use the existing Connect Worker as the only backend boundary.

Set in Cloudflare:

- Secret: SOFTWARE_SQUARE_ACCESS_TOKEN
- Variable: SOFTWARE_SQUARE_LOCATION_ID
- Variable: SQUARE_ENV=production
- Secret: SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY

The browser never receives these values.

The Worker creates Square-hosted Payment Links using the D1 price. Square requires ORDERS_READ, ORDERS_WRITE, and PAYMENTS_WRITE for Create Payment Link.

Webhook URL:

https://connect.oneartisthub.site/software/webhook

Subscribe the Square application to payment events used by the store, especially payment.created and payment.updated.

## 4. Cloudflare Email Service

In Cloudflare, onboard oneartisthub.site under Email Service > Email Sending.

The Worker has a native EMAIL binding restricted to contact@oneartisthub.site.

Then set the contact destination from the admin dashboard under Email Service.

No SMTP password or Cloudflare API token is required by the frontend.

## 5. Self-hosted delivery

When the production ZIP is ready, set Worker variable SOFTWARE_DOWNLOAD_URL.

The Worker includes that link in paid self-hosted order confirmation emails.

## 6. Validate and deploy

```bash
npm test
npm run validate
npm run deploy
```

## 7. Pages

Deploy developeronesw/OneArtistHub-Web as a separate Cloudflare Pages project.

Use the repository root as the Pages output directory because the site is static.

Attach: www.oneartisthub.site

Do not combine this repository with the downloadable OneArtistHub application.

## Security boundaries

- D1 stores products, orders, contact messages and non-secret settings.
- KV stores short-lived admin sessions and webhook idempotency markers.
- Worker secrets store Square access credentials and the admin password hash.
- Cloudflare Email Service is accessed through a Worker binding.
- Square webhooks are verified using HMAC-SHA256 before changing order status.
- Product prices are read server-side from D1.
- No card data is stored.
