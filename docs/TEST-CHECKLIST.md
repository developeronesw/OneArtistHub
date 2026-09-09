# OneArtist Hub 0.1.1 Test Checklist

## Deployment / upgrade
- [ ] Existing D1 database is preserved
- [ ] Existing Cloudflare secrets/bindings are preserved
- [ ] Update ZIP is extracted into repository root with overwrite enabled
- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] Git push triggers successful Cloudflare Pages deployment
- [ ] `/api/status` returns version `0.1.1`

## Setup/Auth regression
- [ ] Existing administrator can still log in
- [ ] Logout invalidates administrator session
- [ ] Existing analytics and demo/live content remain present

## Aurora Dashboard
- [ ] Desktop sidebar usable
- [ ] Tablet/mobile drawer usable
- [ ] Mobile bottom dock usable and More opens the full drawer
- [ ] Revenue, Orders, Releases, Verified Plays, Downloads and Site Views render
- [ ] 30-day verified engagement chart still uses live D1 data
- [ ] New Release opens the release editor immediately
- [ ] Add Video opens the video editor immediately
- [ ] Add Tour Date opens the tour editor immediately
- [ ] Create Page opens the page editor immediately

## Releases CRUD
- [ ] Create release and publish
- [ ] Create release as draft
- [ ] Edit title/type/date/cover/description/streaming links
- [ ] Toggle published ↔ draft from list
- [ ] Feature/unfeature release
- [ ] Bulk delete selected releases
- [ ] Deleting a release also removes its linked track records

## Tracks CRUD
- [ ] Create track using release dropdown
- [ ] Release dropdown shows existing releases
- [ ] Save preview audio URL
- [ ] Save track number/duration/cover/price/explicit flag
- [ ] Edit track
- [ ] Publish/draft track
- [ ] Delete track
- [ ] Continuous player can play newly created published preview
- [ ] Play counter increments after verified listening threshold

## Videos CRUD
- [ ] New Video accepts standard YouTube watch URL
- [ ] New Video accepts youtu.be URL
- [ ] New Video accepts Shorts URL
- [ ] Fetch YouTube fills metadata when available
- [ ] Thumbnail appears before save
- [ ] Saved public card uses stored/derived YouTube thumbnail
- [ ] Public click opens responsive YouTube modal
- [ ] Video view counter records the modal open
- [ ] Edit/delete video

## Tour CRUD
- [ ] Create show with date, venue, location, ticket URL, status and time
- [ ] Edit show
- [ ] Draft/publish show
- [ ] Delete show
- [ ] Homepage shows only next 3 upcoming shows
- [ ] Tour page shows all upcoming published shows

## Store CRUD
- [ ] Create physical product with price/inventory/SKU/variants
- [ ] Create digital product with Dropbox private path
- [ ] Edit product
- [ ] Draft/publish product
- [ ] Delete product
- [ ] Homepage shows latest 4 products
- [ ] Shop page shows full published catalog

## Custom Pages
- [ ] Create custom page
- [ ] Page can be added/removed from public navigation
- [ ] HTML saves and renders
- [ ] `<script>` is stripped server-side
- [ ] inline event handlers are stripped server-side
- [ ] Edit/delete page

## Themes
- [ ] Midnight Cinema preview opens
- [ ] Artist OS preview opens
- [ ] Neon Editorial preview opens
- [ ] Activate each theme from Admin → Themes
- [ ] Activation changes public site without GitHub commit/redeploy
- [ ] Existing releases/videos/tours/store/pages remain intact after each switch

## Public catalog behavior
- [ ] Homepage shows latest 3 releases
- [ ] Homepage shows latest 3 videos
- [ ] Homepage shows latest 3 upcoming tour dates
- [ ] Homepage shows latest 4 products
- [ ] Music page shows all published releases
- [ ] Videos page shows all published videos
- [ ] Shop page shows all published products
- [ ] Continuous player survives client-side navigation

## SVG / responsive contract
- [ ] Built-in UI icons remain SVG paths
- [ ] Built-in logo remains SVG
- [ ] No raster UI icon/logo was introduced
- [ ] Button icons remain vertically/horizontally centered
- [ ] CRUD modals remain usable on phone/tablet/desktop
