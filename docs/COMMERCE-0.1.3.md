# OneArtist Hub 0.1.3 Commerce & Customer Accounts

## Customer account model

Customers do not need a OneArtist password. A customer enters the email address used at checkout at `/account`. If a verified purchase exists, OneArtist Hub emails a one-time magic link that expires after 20 minutes. Successful use creates a secure HttpOnly/Secure/SameSite customer session for 30 days.

The customer portal provides:

- order history
- branded invoice/receipt links
- payment/refund status
- merchandise fulfillment/tracking status
- protected digital downloads

## Digital downloads

Digital entitlements are created only after verified payment capture. A customer or receipt download request creates a random one-time token valid for 15 minutes. The final Dropbox file is streamed through OneArtist Hub; the permanent Dropbox credential is never exposed to the browser.

Admin can reset an entitlement's download count from **Downloads**.

## Product variants

Physical products can have structured variants. Each variant supports:

- name
- size
- color
- SKU
- inventory
- optional price override

OneArtist Hub re-resolves product pricing and inventory from D1 on the server when creating checkout, then checks inventory again immediately before capture finalization. Inventory decrements only after verified capture.

## PayPal production webhook

Configure the listener URL shown in **Settings → PayPal** and save the Webhook ID from the PayPal Developer Dashboard. OneArtist Hub verifies webhook signatures server-to-server before processing events and stores event IDs in D1 for idempotency.

Recommended subscriptions:

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`

The webhook path is `/api/paypal/webhook`.

## Refunds

Orders in `paid` or `partially_refunded` status can be refunded from Admin → Orders. Leaving the amount blank refunds the remaining eligible amount. Full refunds disable remaining digital-download allowance.

## Invoices

Every captured order receives a stable OneArtist invoice number and printable branded receipt. The invoice reflects refunds, fulfillment and tracking data.

## Capture race recovery

PayPal can deliver an approval webhook while the buyer browser is also capturing the same order. OneArtist Hub 0.1.3 uses deterministic PayPal request IDs, re-reads the canonical PayPal order after an already-captured response, requires the actual capture status to be `COMPLETED`, and waits for the D1 order finalization if another verified request won the race. This prevents duplicate inventory decrements and prevents a paid buyer from being stranded by an `ORDER_ALREADY_CAPTURED` response.

## Pending refunds

If PayPal returns a refund with `PENDING` status, OneArtist Hub records the provider transaction but does not reduce the invoice balance, change the order to refunded, or revoke digital access yet. The verified `PAYMENT.CAPTURE.REFUNDED` webhook promotes that provider transaction to `COMPLETED` and applies the refund exactly once.
