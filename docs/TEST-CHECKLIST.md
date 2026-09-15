# OneArtist Hub 0.1.3 Test Checklist

## Deployment / migration
- [ ] Existing D1 database, administrator, content, analytics and encrypted integrations are preserved
- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] Cloudflare Pages deployment succeeds
- [ ] `/api/status` returns version `0.1.3`
- [ ] No installer rerun or manual D1 recreation is required

## Admin / Aurora regression
- [ ] Admin login/logout still works
- [ ] Forgot password still works
- [ ] Aurora desktop sidebar, mobile drawer and mobile dock work
- [ ] Releases, tracks, videos, tour dates, store, pages and media CRUD still work
- [ ] All three public themes still activate instantly without redeploy
- [ ] Glass continuous player, queue, shuffle, repeat, volume and verified play counters still work

## Commerce dashboard
- [ ] Net Revenue reflects refunds
- [ ] Gross revenue / refund snapshot renders
- [ ] Order count renders
- [ ] Customer count renders
- [ ] Average order value renders
- [ ] Top Products renders from verified order items
- [ ] Digital vs physical sales split renders

## Product variants / inventory
- [ ] Create a physical product with two or more size/color variants
- [ ] Save independent SKU and inventory for each variant
- [ ] Optional variant price override works
- [ ] Public store requires a valid variant selection
- [ ] Sold-out variants cannot be selected/purchased
- [ ] Checkout ignores client-supplied prices and uses current D1 prices
- [ ] Inventory is checked again before capture finalization
- [ ] Verified purchase decrements the selected variant only
- [ ] Low inventory creates dashboard/email notification when enabled

## PayPal checkout / webhook
- [ ] Artist can connect PayPal without entering API credentials or webhook settings
- [ ] PayPal sends events to the central Connect Worker `/paypal/webhook` endpoint
- [ ] Worker routes verified events to the installation's authenticated internal endpoint
- [ ] CHECKOUT.ORDER.APPROVED test event is verified and processed
- [ ] PAYMENT.CAPTURE.COMPLETED test event is verified and processed
- [ ] PAYMENT.CAPTURE.DENIED / approval-reversed events update order status when applicable
- [ ] PAYMENT.CAPTURE.REFUNDED updates refund totals once
- [ ] Duplicate webhook delivery does not duplicate transactions/refunds
- [ ] PayPal Payment Events shows processed/failed status

## Orders / invoices / fulfillment
- [ ] Captured payment creates stable OneArtist invoice number
- [ ] Receipt shows customer, date, status and PayPal transaction/order ID
- [ ] Printable / Save PDF receipt works
- [ ] Physical order retains PayPal shipping address
- [ ] Processing / Shipped / Delivered status saves
- [ ] Carrier and tracking number save
- [ ] Shipping/tracking email sends when configured

## Refunds
- [ ] Partial refund can be issued from Admin → Orders
- [ ] Full remaining refund can be issued by leaving amount blank
- [ ] Refunded amount appears on invoice/customer account/dashboard
- [ ] Customer receives refund email when email is configured
- [ ] Full refund prevents future digital-download allowance

## Customer accounts
- [ ] `/account` opens passwordless My Account
- [ ] Unknown email receives generic response without account disclosure
- [ ] Purchase email receives one-time magic link when email is configured
- [ ] Magic link expires after 20 minutes
- [ ] Magic link works only once
- [ ] Successful sign-in creates secure customer session
- [ ] Customer sees only orders for their email
- [ ] Customer can log out

## Digital downloads
- [ ] Verified digital purchase creates entitlement
- [ ] My Account shows download usage / limit
- [ ] Download request creates a new 15-minute one-time URL
- [ ] Dropbox permanent credential/path is not exposed to customer
- [ ] Successful file request increments download counter
- [ ] Reusing a consumed/expired token fails
- [ ] Admin → Downloads can reset entitlement count and invalidate old tokens

## Customers
- [ ] Admin → Customers shows customer name/email/order count
- [ ] Lifetime Value is net of refunds
- [ ] Last-order timestamp is correct

## Security / design contract
- [ ] Admin writes still require CSRF
- [ ] Admin and customer session cookies are HttpOnly + Secure + SameSite=Lax
- [ ] PBKDF2 remains at or below Cloudflare 100,000-iteration runtime limit
- [ ] PayPal/Dropbox/Resend secrets are not exposed in frontend/GitHub
- [ ] Built-in icons/logos remain SVG-only
- [ ] New commerce/customer UI is responsive on phone, tablet and desktop

### PayPal capture concurrency

- [ ] Complete a Sandbox purchase while the PayPal webhook is enabled.
- [ ] Confirm exactly one OneArtist Hub order is created.
- [ ] Confirm inventory decrements exactly once.
- [ ] Confirm the browser reaches the receipt even when the webhook processes first.
- [ ] Confirm `PAYMENT.CAPTURE.COMPLETED` is stored once in Webhook Health.
