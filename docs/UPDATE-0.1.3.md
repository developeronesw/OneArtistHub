# OneArtist Hub 0.1.3 Update

This update is designed to install over a working **0.1.2** installation. It preserves the existing D1 database, administrator, content, counters, themes, encrypted integrations and Cloudflare secrets.

## Update steps

1. Extract the 0.1.3 UPDATE ZIP over the repository root.
2. Run `npm run check`.
3. Run `npm run build`.
4. Commit and push to `main`.
5. Wait for Cloudflare Pages to deploy successfully.
6. Open OneArtist Hub Admin. The 0.1.3 D1 migration runs automatically on the first API request.

Do not recreate D1 and do not rerun the installer.

## After deployment

Open **Settings → PayPal Payments** and connect the artist's PayPal account. Do not enter PayPal API credentials or webhook settings on the artist site.

Webhook listener:

`https://CONNECT-WORKER/paypal/webhook`

The Connect Worker verifies each event and forwards it to the installation's authenticated internal processor.

Subscribe to:

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`

Then verify the **PayPal Payment Events** panel begins showing processed events after sandbox/live test transactions.
