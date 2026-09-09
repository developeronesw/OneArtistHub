# FOUNDATION Test Checklist

## Deployment
- [ ] GitHub repository root contains `package.json`, `index.html`, `functions/`, `src/`
- [ ] Cloudflare build command is `npm run build`
- [ ] Output directory is `dist`
- [ ] D1 binding name is exactly `DB`
- [ ] `ONEARTIST_SETUP_KEY` configured as a secret
- [ ] `APP_ENCRYPTION_KEY` configured as a separate secret
- [ ] Project redeployed after bindings/secrets

## Setup/Auth
- [ ] `/admin` opens setup before installation
- [ ] Incorrect setup key is rejected
- [ ] Correct setup creates admin and demo data
- [ ] Setup cannot run a second time
- [ ] Wrong password rejected
- [ ] Correct username/password logs in
- [ ] Logout invalidates admin session

## Aurora Dashboard
- [ ] Desktop sidebar usable
- [ ] Tablet layout responsive
- [ ] Mobile drawer/mobile dock usable
- [ ] Revenue, Orders, Releases, Verified Plays, Downloads, Site Views render
- [ ] 30-day verified engagement chart uses real D1 series and refreshes
- [ ] No raster button/icon assets appear

## Content
- [ ] Create/edit/delete release
- [ ] Create/edit/delete track
- [ ] YouTube URL generates thumbnail after save
- [ ] Create/edit/delete tour date
- [ ] Create/edit/delete physical product
- [ ] Create/edit/delete digital product
- [ ] Create custom page with HTML
- [ ] `<script>` is removed from custom page HTML
- [ ] Switch all three public themes

## Public site
- [ ] Home automatically shows latest 3 releases
- [ ] Home shows videos, merch and upcoming tours
- [ ] Continuous player survives client-side route changes
- [ ] Demo audio plays
- [ ] Play counter increments after 10 seconds
- [ ] YouTube video opens in modal
- [ ] Page view counter records visits
- [ ] Cart persists in localStorage

## PayPal / Orders
- [ ] Sandbox credentials save
- [ ] PayPal buttons appear in cart
- [ ] Sandbox order creates and captures
- [ ] Order appears in admin
- [ ] Receipt page opens
- [ ] Receipt can print/save as PDF
- [ ] PayPal captured amount/currency matches the server checkout snapshot
- [ ] Physical order exposes shipping address only inside authenticated Orders view
- [ ] Fulfillment status, carrier and tracking can be saved

## Digital delivery
- [ ] Dropbox token saves
- [ ] Digital product has private Dropbox path
- [ ] Paid digital order creates entitlement
- [ ] Receipt Download button creates one-time token
- [ ] Token streams file
- [ ] Same token cannot be reused
- [ ] Download counter increments
- [ ] Download limit enforced
