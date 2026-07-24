# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AuraWeather is a premium weather PWA (vanilla HTML/CSS/JS, no framework, no build step for the web app itself) that is also packaged as a native Android app via Capacitor. Live at https://mamueljr.github.io/App_Clima/. UI copy, comments, and commit messages are in Spanish — match that convention.

## Commands

```bash
npm install                # Install Capacitor deps (only needed for the Android build)
npm run build              # Runs copy-assets.js: wipes and rebuilds www/ from source files
npx http-server -p 8080    # Serve locally (source files run directly, no build needed)
npx cap sync android       # Sync www/ into the native Android project
```

Android APK is built in CI (`.github/workflows/build-apk.yml`) on every push to `main`: build web assets → `cap sync android` → `gradlew assembleDebug` → uploads `AuraWeather-Android-APK` artifact. There are no tests or linters.

## Critical build/deploy model

The **source of truth is the root files** (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `assets/`). Edit these directly.

- `www/` is a **generated copy** (gitignored). `npm run build` deletes and regenerates it from the root files. Never edit `www/` by hand — changes there are lost on the next build.
- GitHub Pages serves the **root files directly** (no build). Capacitor/Android consumes `www/`. So a web change is live on push; an Android change also requires `npm run build` + `cap sync`.
- The file list to copy is hardcoded in `copy-assets.js` — if you add a new top-level asset, add it there too.

## Service Worker cache — bump the version on every asset change

`sw.js` caches the app shell under `CACHE_NAME` (currently `aura-weather-cache-v16`). **When you change any cached static file, increment this version number**, otherwise users keep the stale cached copy. The `activate` handler deletes any cache whose name != current, and `index.html` sends `SKIP_WAITING` + listens for `controllerchange` to force an immediate reload when a new SW takes over. Weather API hosts (`open-meteo.com`, `bigdatacloud.net`, `api.brightsky.dev`) are explicitly excluded from caching so data stays fresh.

## app.js architecture (single ~1700-line file, no modules)

All logic lives in `app.js` as plain functions on the global scope. Key flows:

- **Weather data with automatic failover** — `fetchWeatherData()` calls the **primary** API BrightSky (`api.brightsky.dev`, has native CORS → near-instant) and falls back **transparently** to Open-Meteo if it fails/times out. Each provider has a mapper that normalizes its JSON into the internal Open-Meteo-shaped structure the rest of the app expects: `mapBrightSkyToOpenMeteo()` and (for BrightSky's icon strings) `brightSkyIconToWmoCode()`. **All rendering assumes the Open-Meteo data shape** — if you add/change a provider, write a mapper to that shape rather than touching render code.
- **`fetchWithTimeout()`** — every external request goes through this (AbortController-based). Timeouts in use: weather 8s, reverse-geocode 4s, city autocomplete 5s. Preserve these when adding requests.
- **Rendering** — `renderWeather()` is the orchestrator; it fans out to `renderHourlyChart()` (Chart.js), `renderHourlyScroll()` (swipeable cards), `render7DayForecast()`, `updateAstronomy()`, `updateWeatherEffects()`, `generateAuraInsight()`.
- **Dynamic theming + particles** — the current weather sets a `weatherClass` that drives CSS accent-color/gradient variables and a 2D particle engine (rain/snow) in `updateWeatherEffects()`.
- **Synthesized ambient audio (Web Audio API, fully offline)** — `initAudioContext()` / `updateAmbientSound()` / `applyAudioState()` generate rain (white noise + bandpass), wind (noise + LFO), and thunder from oscillators — no audio files. Muted state persists in `localStorage` (`aura_sound_muted`); browser autoplay policy means audio only starts after the first user gesture (`playAudioOnGesture`).
- **Astronomy** — `updateAstronomy()` draws an SVG arc with a sun (day) or moon (night) node following a trig curve between sunrise/sunset; `calculateMoonPhase()` computes the synodic lunar phase.
- **Units** — `toggleTemperatureUnit()` / `formatTemp()` convert °C↔°F entirely client-side from cached data (no refetch). Data is stored/computed in Celsius; formatting converts at display time.
- **Favorites** — persisted in `localStorage`; `isSameLocation()` dedupes by coordinates.
- **PWA install** — custom install flow via captured `beforeinstallprompt` event and `triggerPWAInstall()`.

## Docs

`continue.md` is a hand-maintained Spanish development log (dated changelog + tech spec). `README.md` covers user-facing features and build steps. Keep `continue.md` updated when making notable changes, per existing project practice.
