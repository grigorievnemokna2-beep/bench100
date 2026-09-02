# Bench 100 / GRIND

Local-first strength training PWA with an optional Garmin Venu 2 Plus companion.

## Components

- `BenchApp/` — the existing installable PWA and local development server.
- `garmin/Bench100Watch/` — Connect IQ watch app for Venu 2 Plus.
- `sync-worker/` — Cloudflare Worker API for production HTTPS sync.
- `tests/` — protocol and API integration tests.

## How synchronization works

1. The PWA creates a private sync account and displays a temporary six-digit pairing code.
2. The code and API URL are entered once in the watch app settings through Garmin Connect IQ.
3. The PWA publishes the currently opened workout to the server.
4. The watch downloads it, guides the workout, records heart rate and a strength FIT activity, then uploads the performed sets and RPE.
5. The PWA receives and merges the result into its local training history. Existing backup files remain compatible.

Account and device credentials are independent random 256-bit tokens. Tokens are sent only over HTTPS in production; the server stores token hashes as lookup keys.

## Local development

```powershell
cd BenchApp
node server.js
```

Open `http://localhost:3000`. The local API is `http://localhost:3000/api/v1`.

Run tests from the repository root:

```powershell
node --test tests\sync-protocol.test.js tests\sync-api.test.js
```

## Production setup

1. Deploy `sync-worker/` and create its `SYNC` KV namespace.
2. Enter the resulting HTTPS URL ending in `/api/v1` in Bench 100 settings.
3. Build and install the Connect IQ app using the instructions in `garmin/Bench100Watch/README.md`.
4. In Bench 100 settings press **Новый код**.
5. Enter the API URL and code in the Bench 100 Watch settings inside Garmin Connect IQ.
6. Open a training day in Bench 100 and press **Отправить**.

The readiness score is an advisory blend of Body Battery and inverse stress. It does not automatically change the strength program.
