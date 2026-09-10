# Update to OneArtist Hub 0.2.1 — Media Library & Universal Asset Picker

This update overlays an existing 0.2.0 installation. It is schema-neutral: it reuses the existing `media_objects` table and `content_items` media records, so **do not recreate D1/MySQL and do not rerun the installer**.

Because mobile/browser uploads may add `(1)` or another suffix to the ZIP filename, the safest Codespaces update flow is:

```bash
cd /workspaces/OneArtistHub
ZIP=$(find . -maxdepth 1 -type f -iname "*0.2.1*UPDATE*.zip" | head -n 1)
echo "Installing: $ZIP"
unzip -o "$ZIP" -d .
rm "$ZIP"
npm install
npm run check
npm run build
git add -A
git commit -m "Update OneArtist Hub to 0.2.1 Media Library and Asset Picker"
git push origin main
```

If `git pull --rebase origin main` is needed first and Git reports local changes, stash them before pulling and restore them afterward. Do not force-push.

## Media Library

The **Media** dashboard section now lists real files from the active storage provider rather than acting as URL-only content CRUD. It supports multi-file upload, search/filtering, image previews, file/provider/folder metadata, public URL copying, title/alt metadata editing, and protected deletion.

A file that is referenced by a release, track, product, site setting, hero/profile/logo field or another content item cannot be deleted from the Media Library until the reference is changed or removed.

## Universal artwork picker

The reusable Media Library picker is wired into:

- release cover artwork
- track artwork
- product/merch images
- artist profile image
- artist logo
- homepage hero image
- Album ZIP ingest cover artwork

Each supported form can either select an existing public image, upload a new image directly, or keep using a manually pasted URL.

## Storage behavior

Files remain outside the database. OneArtist stores only media metadata/pointers in D1/MySQL. Upload and delete operations route through the configured provider: Cloudflare R2, Dropbox, or VPS-local storage.

Public media responses add MIME normalization, `X-Content-Type-Options: nosniff`, same-site resource policy, and attachment handling for document types.
