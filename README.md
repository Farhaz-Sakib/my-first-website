# কৃষি আবহাওয়া — Krishi Abohawa

A Bangla Android weather and agriculture starter app for Bangladesh. Built with React, Vite, and Capacitor. No account, application server, or API key is required for the non-commercial weather endpoint.

## Features

- Bangla navigation, numbers, forecasts, and farming guidance; bundled Bengali fonts work offline.
- Cascading division → district → upazila → union selectors: 8 divisions, all 64 districts, 494 upazilas, and 4,540 unions from the bundled open dataset.
- Current temperature, feels-like temperature, humidity, wind, and seven-day rainfall/temperature forecasts from Open-Meteo.
- Device-location forecasts with explicit location permission on Android and browsers.
- Guidance for rice, wheat, maize, potatoes, vegetables, and jute; conditional rainfall, heat, wind, and thunderstorm notices.
- Per-coordinate forecast cache for up to 24 hours, clearly marked as saved data when network access fails. No fabricated/demo weather is shown to users.
- Responsive desktop/mobile interface and an Android native project with a Bangla app name and custom launcher icon.

## Location precision and coverage

The community dataset contains **district headquarters coordinates, not union coordinates**. Choosing a union retains the district-coordinate forecast; this is explicitly explained in the app. Use “আমার অবস্থান” for a forecast at the device's coordinates. GPS does not reverse-map coordinates to the selected union. The geographic bounding box is a basic validation check, not a Bangladesh border polygon. The community administrative list may be outdated and is not a current official registry.

Source: [nuhil/bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode), commit `5622f68bd07a98e076edcf8100bf0db6a75b9854`. Data license: MIT, preserved in [DATA-LICENSE.txt](DATA-LICENSE.txt). A production release should validate administrative changes and add reviewed union coordinates.

## Develop

Node.js 22+ and npm are recommended. The lockfile pins installed dependency versions.

```sh
cd /workspace/my-first-website
npm ci --cache /tmp/krishi-npm-cache
npm run dev
```

The development server listens on port 5173. Forecast requests go directly from the app to `https://api.open-meteo.com`; allow that domain through any cloud network policy. No credentials are required. Local functional checks can use HTTP requests; cloud onboarding does not provide a public preview link.

## Validate

```sh
npm test
npm run test:browser
npm run build
npm run test:live
npm run android:sync
```

The browser tests use controlled **test-only** API responses and explicitly test connection failures, caching, location changes, GPS, and mobile layout. They do not verify the live Open-Meteo service. Browser tests default to `/usr/bin/chromium`; set `CHROMIUM_PATH` to another installed Chromium executable if necessary, or edit the local Playwright configuration for your platform.

## Build Android

Requires Java 21, Android SDK platform 35, build tools 35.0.0 and 34.0.0 (for Capacitor library projects), and platform tools. Android Studio can install these on a local workstation. On this Linux cloud environment, the following installs the official SDK tools into a writable directory with the official repository checksum verified:

```sh
bash scripts/setup-java.sh
bash scripts/setup-android.sh
npm run android:sync
python3 scripts/build-android.py
```

The cloud JDK is Temurin 21.0.12.1+1, downloaded from the official Eclipse Adoptium release with its published SHA-256 checked. On a local workstation, install a full Java 21 JDK and set `JAVA_HOME` instead of using the cloud JDK script.

The build helper uses `ANDROID_HOME` when supplied, otherwise `/workspace/.android-sdk`. It sets writable Gradle/Android user directories and respects the cloud HTTPS proxy without saving proxy credentials. When using that proxy, Java uses the existing OS Java trust store; TLS verification remains enabled. The Gradle wrapper distribution is SHA-256 pinned.

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected Android device with `adb install -r` or open the native project with `npm run android:open`. Android runtime location permission is requested only after pressing “আমার অবস্থান”. Browser GPS requires HTTPS or localhost. This debug build is for testing; a store release needs signing, a final application ID, device testing, and Play Store/privacy review.

## Weather source and guidance

Weather: [Open-Meteo](https://open-meteo.com/), [API documentation](https://open-meteo.com/en/docs), [terms](https://open-meteo.com/en/terms), weather data under CC BY 4.0. The free API is for non-commercial use; check the current service terms before commercial distribution. Source attribution is available in the app's information page.

Farming guidance is conservative, general information generated from weather thresholds. It is **not** an official agricultural bulletin, crop disease diagnosis, fertilizer dose, or pesticide prescription. Consult the local upazila agriculture office for field-specific advice. Follow [Bangladesh Meteorological Department](https://bmd.gov.bd/) for official disaster warnings and [Department of Agricultural Extension](https://dae.gov.bd/) for agricultural support.

## Privacy

Location coordinates are sent only to Open-Meteo when requesting a forecast. Selected administrative areas and forecast cache are stored locally on the device. No analytics, advertising, login, or application backend is included. Data remains subject to the weather provider's own privacy terms.

## Validation performed in this cloud environment

- Eight weather, forecast-validation, and administrative-hierarchy tests passed.
- Twelve browser checks passed across desktop and mobile using controlled test-only weather responses.
- A real Open-Meteo request returned current conditions and seven forecast days in `Asia/Dhaka`.
- The production web build, Android synchronization, and native debug APK build completed successfully. The APK's v2 signature, Bangla app name, Android 6+ minimum version, and location permissions were verified.
- No Android emulator or physical device was used; native GPS and installation need device testing. Cloud `adb devices` could not initialize its default home directory because it is read-only; use a local Android workstation for device testing.
- A separate attempt to load live weather directly in cloud Chromium failed with `ERR_CERT_AUTHORITY_INVALID` for the cloud proxy certificate. Automatic approval review rejected adding that certificate to Chromium's existing trust store because it affects broader browser trust. Certificate verification was kept enabled and that existing trust store was left unchanged. This cloud-browser check requires explicit approval; it does not invalidate the separately verified API response or mocked interface checks.

Reusable installation and startup instructions, plus the `api.open-meteo.com` network requirement, are saved in the cloud environment draft. Review and save them in environment settings, then publish the environment. Draft saving is separate from publication and does not establish restoration in a new task.
