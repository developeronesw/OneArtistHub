# Update to OneArtist Hub 0.2.0 — Media & Deployment

This update overlays an existing 0.1.3 installation. Do not recreate D1 and do not rerun the installer.

```bash
unzip -o "OneArtist-Hub-0.2.0-Media-Deployment-UPDATE.zip" -d .
rm "OneArtist-Hub-0.2.0-Media-Deployment-UPDATE.zip"
npm install
npm run check
npm run build
git add -A
git commit -m "Update OneArtist Hub to 0.2.0 Media and Deployment"
git push origin main
```

Cloudflare automatically applies the new `media_objects` table on the first API request after deployment.

## To use R2 for music packages
Create an R2 bucket and bind it to the Pages project with the variable/binding name exactly `MEDIA`, redeploy, then choose **Settings → Media Storage → Cloudflare R2**.

## To keep Dropbox
No infrastructure change is required. Keep Dropbox configured and select it under Media Storage.

## Album ZIP ingest
Go to **Releases → Import Album ZIP**. Use MP3 tracks in the ZIP for this release. OneArtist reads their ID3 data, detects artwork, lets you reorder and rename tracks, generates previews, rewrites the final MP3 tags and creates a protected release ZIP.

The Cloudflare/serverless upload endpoint intentionally caps a single request at 95 MB to remain under the common Pages/Workers request-body ceiling. For larger lossless/long-form packages, use the VPS profile or split/optimize the package until multipart upload support is added.
