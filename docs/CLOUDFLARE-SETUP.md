# OneArtist Hub — Cloudflare Setup (Browser Workflow)

This guide assumes you do not want to use Git commands.

## 1. Upload OneArtist Hub to GitHub

1. Extract `OneArtist-Hub-0.1.0-Foundation.zip` on your computer.
2. Create a new empty GitHub repository.
3. In the new repository choose **Add file → Upload files**.
4. Upload the **contents** of the extracted OneArtist Hub folder.
5. Confirm `package.json`, `index.html`, `functions`, `src`, `public`, and `database` are visible at the repository root.
6. Commit the upload to `main`.

Do not upload any secrets or provider passwords.

## 2. Create the Cloudflare Pages project

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Create a Pages application and choose the Git integration/import existing Git repository flow.
4. Authorize/select the GitHub repository containing OneArtist Hub.
5. Production branch: `main`.
6. Build command: `npm run build`.
7. Build output directory: `dist`.
8. Leave the project root at the repository root.
9. Deploy.

The first static deployment may show a database-binding error until the next steps are finished. That is expected.

## 3. Create D1

1. In Cloudflare create a D1 database for this artist/site.
2. Suggested name: `oneartist-ARTISTNAME`.
3. Open the OneArtist Hub Pages project settings.
4. Add a D1 binding for the database.
5. The binding variable name must be exactly `DB`.
6. Add the binding to the Production environment. Add it to Preview as well if you want branch-preview testing.

OneArtist Hub accesses D1 only through `context.env.DB` inside Pages Functions.

## 4. Add the installation secrets

Add encrypted secrets/environment variables to the Pages project:

### ONEARTIST_SETUP_KEY
Create a long random password. Example format only:

`oah-setup-CHANGE-THIS-random-random-random`

You will type this into the first-run installer once.

### APP_ENCRYPTION_KEY
Create a completely different random value, ideally 32+ random characters.

Do not reuse the setup key. Do not put either value in GitHub.

## 5. Redeploy

Trigger a new Pages deployment after adding the D1 binding and secrets.

## 6. Run the OneArtist installer

Open:

`https://YOUR-PROJECT.pages.dev/admin`

Enter:

- the `ONEARTIST_SETUP_KEY`
- administrator username
- administrator email
- administrator password (10+ characters)
- artist/stage name

For the first test, leave **Load demo content** checked.

When setup succeeds, the installation route locks and the admin login becomes active.

## 7. Test Aurora Glass Studio

After login, confirm:

- Dashboard loads
- Releases list contains demo releases
- Tracks list contains two local preview tracks
- Videos contains the demo YouTube item
- Tour Dates contains demo future shows
- Store contains physical and digital demo products
- Pages contains About
- Themes lets you switch between Midnight Cinema, Artist OS and Neon Editorial

## 8. Test the live counters

Open the public site in another browser/private window.

- Visit the homepage: Site Views should increase once for that visitor/day.
- Play a demo track for at least 10 seconds: Verified Plays should increase once for that visitor/track/hour.
- Open the YouTube modal: the video-view event is recorded in D1.
- A protected download only increments after a paid digital entitlement is verified and a one-time token is used.

Refresh the Aurora dashboard after testing to see updated totals.

## 9. Configure PayPal

For initial testing use PayPal Sandbox credentials.

In OneArtist Hub:

**Settings → PayPal**

Enter:

- Client ID
- Client Secret
- Environment: Sandbox

The Client Secret is sent over HTTPS to the Pages Function, encrypted with `APP_ENCRYPTION_KEY`, and stored encrypted in D1. It is not returned to the browser after saving.

## 10. Configure Dropbox digital delivery

Create/use a Dropbox API access token with access to the files you want OneArtist Hub to deliver.

In OneArtist Hub:

**Settings → Dropbox Digital Delivery**

Save the access token. Then edit a Digital product and set its private Dropbox path, for example:

`/OneArtistHub/Albums/MyAlbum.zip`

The customer does not receive the Dropbox access token or a permanent Dropbox URL. OneArtist Hub validates the purchase, creates a one-time 15-minute token, and streams the file through the server endpoint.
