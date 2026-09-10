# Email Providers — OneArtist Hub 0.2.0

OneArtist Hub does not require you to operate an SMTP server for transactional email.

## Resend
Use a Resend API key, sender name/email and optional reply-to. This remains the easiest low-volume serverless option.

## Cloudflare Email Service
OneArtist uses Cloudflare's HTTPS Email Sending REST API. Configure:
- Cloudflare Account ID
- API token with Email Sending permission
- onboarded sending domain/from address
- optional reply-to

Cloudflare requires the sending domain to use Cloudflare DNS. Current Cloudflare pricing permits free sends to verified destination addresses for testing; arbitrary customer recipients require Workers Paid and then use the Email Sending allowance/usage pricing.

Use **Send Test Email** before enabling commerce notifications in production.
