# PayPal Direct Merchant Credentials

OneArtist Hub 0.2.0 supports a direct PayPal merchant integration per artist installation.

1. Sign in to the PayPal Developer Dashboard.
2. Open **Apps & Credentials**.
3. Choose Sandbox for testing or Live for production.
4. Open the default REST application or create one.
5. Copy the **Client ID** and reveal/copy the **Client Secret**.
6. In OneArtist Hub open **Settings → PayPal Direct Merchant API**.
7. Paste the Client ID and Client Secret, select Sandbox/Live, save securely, then use **Test Connection**.
8. Add OneArtist's displayed webhook listener URL to the PayPal app and paste the resulting Webhook ID into OneArtist Hub.

The Client Secret is encrypted before being stored in the OneArtist database and is never returned to the browser after saving.

A merchant-approved/business PayPal account can use the direct integration. A one-click "Connect PayPal" flow for many independent client merchants is a separate PayPal platform/partner capability and is intentionally not faked by this release.
