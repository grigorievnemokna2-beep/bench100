# Bench 100 Watch — Garmin Venu 2 Plus

Connect IQ watch app for the Bench 100 PWA.

## Features

- downloads the currently selected Bench 100 workout;
- shows exercise, target weight, reps and set number;
- one-tap set completion, automatic rest timer and vibration;
- reads live heart rate, Body Battery and stress from the watch;
- records a native strength FIT activity for Garmin Connect;
- asks for session RPE and sends completed sets back to Bench 100;
- keeps an unsent result on the watch and retries at the next launch.

## Build

1. Install Java 11+ and Garmin Connect IQ SDK 9.2+.
2. Generate a Garmin developer key.
3. From this directory run:

   `monkeyc -f monkey.jungle -o bin/Bench100Watch-venu2plus.prg -y <developer_key.der> -d venu2plus -r -w`

4. Test in the Venu 2 Plus simulator or copy the PRG to `GARMIN/APPS` over USB.

The production sync URL is already included in the app. On first launch the watch displays a six-digit code. Open Bench 100 settings, connect the sync server, enter that code in the Garmin Connect IQ card and tap **Привязать часы**. The code expires after 15 minutes. The API URL remains editable for local development or a future server migration.

Holding the menu button in Bench 100 Watch clears the saved device pairing and creates a new code.
