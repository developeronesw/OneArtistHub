# Email & Notifications — OneArtist Hub 0.1.2

OneArtist Hub 0.1.2 includes server-side transactional email support using the **Resend** HTTP API.

## Configure email

1. Create or use a Resend account.
2. Verify the sending domain/address required by your Resend account.
3. Create a sending API key.
4. In OneArtist Hub, open **Settings → Email & Sales Notifications**.
5. Enter:
   - From name
   - From email
   - Reply-to email (optional)
   - Resend API key
6. Select **Save Email Securely**.
7. Enter a test recipient and select **Send Test Email**.

The API key is encrypted with the site's `APP_ENCRYPTION_KEY` before D1 storage and is never returned by the API.

## Automatic messages

When email is configured, OneArtist Hub can send:

- customer purchase receipts
- digital-purchase receipt/download links
- artist new-sale alerts
- shipping/tracking updates
- low-inventory alerts
- administrator password/security alerts
- forgot-password reset links

Preferences can be changed in the same Settings panel.

## Forgot password

The normal recovery flow sends a one-time reset URL to the administrator email. Reset tokens:

- are stored only as SHA-256 hashes in D1
- expire after 30 minutes
- can only be used once
- invalidate existing administrator sessions after a successful reset

If email has not been configured, the login page also offers **Emergency Recovery** using the deployment's `ONEARTIST_SETUP_KEY`. Keep that key private and never commit it to GitHub.
