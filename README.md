# Coffee OS

A simple personal espresso logging app for a Breville Barista Express BES875.

## Run locally

```sh
node server.mjs
```

Then open `http://localhost:5173`.

## Deploy

This is a static React app. Deploy the folder to Vercel as-is; `index.html`,
`src/app.js`, and `src/styles.css` are the app.

## Data

Coffee logs and tricks are saved in browser `localStorage`. A shot is only
added to history after pressing Record. Use the history screen to export JSON
or CSV, or import a previous JSON export.
