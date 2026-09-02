# Bench 100 Garmin Sync — Privacy

Bench 100 Garmin Sync processes only the data needed to synchronize a selected strength workout and its result between the Bench 100 PWA and the user's Garmin watch.

Data may include exercise names, target and performed weights and repetitions, workout timestamps, session RPE, heart rate, Body Battery and stress values. The service does not request a Garmin account password and does not use advertising or sell data.

The PWA creates a random account token. The watch receives a separate random device token through a temporary six-digit pairing code. Production traffic must use HTTPS. Server-side token lookup uses SHA-256 hashes.

The user can delete the server-side sync account and its stored workout, device link, readiness snapshot and results by choosing **Отключить Garmin** in Bench 100 settings. Local Bench 100 history remains on the user's device until the user removes it or clears the application's storage.
