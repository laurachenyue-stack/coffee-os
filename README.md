# Coffee OS

A simple personal espresso logging app for a Breville Barista Express BES875.

## Run locally

```sh
node server.mjs
```

Then open `http://localhost:5173`.

## Deploy

This is a static React app. Deploy the folder to Vercel as-is; `index.html`,
`src/app.js`, `src/styles.css`, `manifest.webmanifest`, and `public/icons/`
are the app.

## iPhone

Open the deployed URL in Safari, tap Share, then Add to Home Screen. Coffee OS
includes a web app manifest and Apple touch icon so it opens more like a small
standalone app.

## Data

Coffee logs and tricks are saved in browser `localStorage`. A shot is only
added to history after pressing Record. Use the history screen to export JSON
or CSV, or import a previous JSON export.
