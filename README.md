# CST Layout Prototype

Static HTML/CSS/JS prototype for exploring franchise owner data and map-based views.

## Local setup

1. Ensure there is a `.env.local` file in the project root.
2. Define the Mapbox token in that file using:

```js
window.CST_ENV = {
  MAPBOX_ACCESS_TOKEN: "your_mapbox_access_token_here"
};
```

3. Open `index.html` in your local environment as usual.

## Notes

- `.env.local` is git-ignored and should never be committed.
- If a token is ever exposed, rotate it in Mapbox and update your local `.env.local`.
- GitHub Pages does not serve local `.env.local`, so the deployed prototype falls back to a static US map image (`us-map-snapshot.png`) when no token is available.
