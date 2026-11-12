# Tempo

See which songs make you faster during workouts. Tempo lines up your Spotify listening history with your Strava workouts and shows:

- **Per-song pace:** each workout's pace and heart rate, with every song marked on the timeline.
- **Power songs:** songs ranked by how much faster you go than your average for that workout.
- **Heart rate per song:** which songs push your heart rate up and which calm you down.

It's a website you can add to your iPhone home screen. All data stays in your browser.

## Using it

1. Open the site, go to **Settings**, and follow the one-time setup for Spotify and Strava. Each needs its own free developer app.
2. To include Apple Watch workouts, turn on Apple Health syncing in the Strava app.
3. **After every workout, open Tempo and press Sync.** Spotify only remembers your last 50 songs.

On iPhone: open the site in Safari → Share → **Add to Home Screen**.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5180. Use `127.0.0.1`, not `localhost`: Spotify rejects localhost redirect addresses.

## How it works

- Spotify logs each play when the song ends, so a song ran roughly from `played_at − duration` to `played_at`.
- Each song is compared with the average of the workout it was played in, with the first 5 minutes (warm-up) left out. That keeps easy days and hard days comparable.
- Strava streams are only downloaded for workouts that overlap songs, to stay inside Strava's rate limits.

## Before going public

The Strava Client Secret is currently stored in the browser, which is fine for your own private Strava app. For a public release, move the Strava token exchange to a small server (e.g. a free Cloudflare Worker), and apply for extended quota on Spotify and Strava.

Deploys to GitHub Pages automatically on every push to `main` (see `.github/workflows/deploy.yml`).
