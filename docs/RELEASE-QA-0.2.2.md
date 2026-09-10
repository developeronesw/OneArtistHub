# OneArtist Hub 0.2.2 Release QA

Release gates completed in the packaging environment:

- JavaScript syntax checks for frontend, API, self-host adapters and PayPal Connect Worker.
- Full static/source QA suite passes.
- Fresh D1/SQLite schema execution passes.
- Existing 0.2.0 D1 schema plus `MIGRATION_022` creates the durable email queue successfully.
- S3-compatible storage adapter, Brevo, SMTP, email retry queue, SQLite VPS profile and partner-onboarding source contracts are covered by QA assertions.
- Bash syntax passes for both MySQL/MariaDB and SQLite Ubuntu installers.
- Cumulative UPDATE archive is tested as an overlay on the 0.2.0 FULL baseline and compared to the finalized 0.2.2 source tree.
- ZIP integrity/CRC is verified for UPDATE and FULL archives.

The Vite production build must still be run in the target Codespace/deployment environment, where npm dependencies are available. Root frontend dependencies are unchanged from 0.2.1/0.2.0 other than previously-added `fflate`.
