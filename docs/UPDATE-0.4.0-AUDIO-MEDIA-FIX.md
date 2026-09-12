# OneArtist Hub 0.4.0 Audio / Media Library Hotfix

Date: September 12, 2026

## Problem

The manual New Track form only accepted a typed preview-audio URL, and the New Release form did not provide a direct audio-source workflow. This made it impossible for an artist to upload or reuse audio through the normal content forms.

## Fix

- **New Track -> Audio source** now supports:
  - Upload Audio
  - Choose from Media Library
  - Existing/manual URL entry remains supported
  - Inline audio playback preview
- **New Release -> Release audio** now supports multiple audio files:
  - Upload multiple MP3/WAV/AIFF/OGG files
  - Choose existing public audio assets from Media Library
  - Every new upload is registered in Media Library
  - Saving the release automatically creates ordered Track records for the attached audio assets
- Media upload MIME normalization now recognizes AIFF/AIF and additional common audio extensions.

## Storage / security behavior

Audio uploaded through these controls uses the existing authenticated `/api/admin/media/upload` pipeline and `registerLibrary=1`, so the central `media_objects` record and reusable Media Library metadata are created at upload time. Public audio remains playable through the existing protected media-file route; no new storage backend or parallel media table was introduced.

## QA

- `npm run check` — PASS
- `npm run security-test` — PASS
- `node --check src/app.js` — PASS
- `node --check functions/api/[[path]].js` — PASS

A full Vite production build was not run in the isolated build environment because the package install could not complete its external dependency fetch; source syntax and the project's complete static/security QA suites pass.
