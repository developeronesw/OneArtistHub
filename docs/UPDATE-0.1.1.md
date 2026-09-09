# Update an existing OneArtist Hub installation to 0.1.1

This update does not require a new D1 database or reinstall.

1. Extract the 0.1.1 UPDATE ZIP into the repository root and overwrite matching files.
2. In Codespaces run:

   npm install
   npm run check
   npm run build

3. Commit and push:

   git add -A
   git commit -m "Update OneArtist Hub to 0.1.1 Content Management"
   git push origin main

4. Allow Cloudflare Pages to redeploy automatically.
5. Log back into `/admin` and test Releases, Tracks, Videos, Tour Dates, Store, Pages and Themes.

Existing D1 content, admin account, analytics, PayPal/Dropbox encrypted integrations, orders and Cloudflare secrets remain untouched.
