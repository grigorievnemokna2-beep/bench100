# Bench 100 Sync Worker

HTTPS API between the Bench 100 PWA and the Garmin Connect IQ app.

## Deploy to Cloudflare

1. Install Wrangler and sign in: `npx wrangler login`.
2. Create KV: `npx wrangler kv namespace create SYNC`.
3. Copy `wrangler.toml.example` to `wrangler.toml` and paste the returned KV id.
4. Deploy: `npx wrangler deploy`.
5. In Bench 100 settings use `https://<worker>.workers.dev/api/v1`.
6. Build the same base URL into the watch app's `apiUrl` property. On first launch the watch creates a six-digit code that the user enters in Bench 100 settings.

The PWA account token, watch device token and temporary pairing secret are random 256-bit values. Only SHA-256 hashes are used as lookup keys in KV. The visible six-digit code expires after 15 minutes and is not sufficient to retrieve the device token without the watch's pairing secret.
