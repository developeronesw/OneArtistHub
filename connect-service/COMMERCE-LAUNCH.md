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

The browser never receives these values. The Web Payments SDK itself is loaded from Square's production CDN and only receives the public Application ID and Location ID.

The storefront now uses the Square Web Payments SDK for an on-site card form. The browser receives only the public Application ID and Location ID; the Worker keeps the Square access token server-side and calls Payments API, Customers API, Cards API, and Subscriptions API as needed. The D1 product price is authoritative, so the browser cannot change the amount. The legacy /software/checkout Payment Link endpoint remains available as a fallback and is not used by the storefront.

Webhook URL:

https://connect.oneartisthub.site/software/webhook

Subscribe the Square application to payment events used by the store: payment.created, payment.updated, subscription.created, subscription.updated, invoice.payment_made, and invoice.scheduled_charge_failed.

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


## 5. Embedded checkout architecture

The production storefront at https://www.oneartisthub.site uses Square Web Payments SDK directly in the checkout modal. Card data is entered into Square's secure hosted card element and tokenized in the browser; raw card data never reaches OneArtistHub. Self-Hosted uses Payments API + Orders API. Hosted creates a Square customer, stores the tokenized card on file, and creates the annual subscription through Square's Subscriptions API. This prevents the hosted plan from charging the customer twice.

The public storefront endpoint https://connect.oneartisthub.site/software/config exposes only the Square Application ID, Location ID, and environment. No access token or secret is exposed.
