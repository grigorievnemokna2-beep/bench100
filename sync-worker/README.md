# Bench 100 Sync Worker

HTTPS API between the Bench 100 PWA and the Garmin Connect IQ app.

## Deploy to Cloudflare

1. Install Wrangler and sign in: `npx wrangler login`.
2. Create KV: `npx wrangler kv namespace create SYNC`.
3. Copy `wrangler.toml.example` to `wrangler.toml` and paste the returned KV id.
4. Deploy: `npx wrangler deploy`.
5. In Bench 100 settings use `https://<worker>.workers.dev/api/v1`.
6. Put the same base URL into the Bench 100 Watch settings in Garmin Connect IQ.

The PWA account token and watch device token are random 256-bit values. Only SHA-256 hashes are used as lookup keys in KV.
