# CST Layout Prototype

Static HTML/CSS/JS prototype for exploring franchise owner data and map-based views.

## Local setup

1. Create a `.env.local` file in the project root:

```js
window.CST_ENV = {
  MAPBOX_ACCESS_TOKEN: "your_local_dev_token_here"
};
```

2. Start a local server (for example `python3 -m http.server 5500`) and open the app via localhost.
3. If `.env.local` is missing, the app falls back to the hardcoded GitHub token in `script.js`.

## Notes

- Restrict the Mapbox token to the expected URL(s) in the Mapbox dashboard.
- `.env.local` is git-ignored and intended for local-only token overrides.
