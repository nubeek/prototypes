# Wefranch Prototypes

Collection of static HTML/CSS/JS prototypes for different Wefranch concepts and experiences.

## Project structure

- `index.html` - prototype router served at `/prototypes/`.
- `_prototypes/` - editable source folders for each standalone prototype.
- `scripts/` - shared root scripts and publishing utilities.
- `styles/` - shared root styles.
- `_out/` - generated deploy output created by the deploy script.

## Local setup

1. From the project root, build the public prototype routes:
   - `node scripts/deploy.mjs`
2. Start a local server from the generated output:
   - `python3 -m http.server 5500 --directory _out`
3. Open the prototype router:
   - `http://localhost:5500/`
4. Or open a prototype directly, for example:
   - `http://localhost:5500/targets/`
   - `http://localhost:5500/tour/`
   - `http://localhost:5500/cst/`
   - `http://localhost:5500/decimal/`
   - `http://localhost:5500/modeling/`

When deployed from the `prototypes` GitHub Pages repo, the root router is served at `/prototypes/` and the individual prototype folders are served at `/prototypes/<folder-name>/`.

## Publishing

The GitHub Actions workflow builds `_out/` from `_prototypes/` and deploys that generated artifact to GitHub Pages. `_out/` is deleted and recreated each time the deploy script runs, so it is safe to treat it as disposable generated output. To preview the same output locally, run:

- `node scripts/deploy.mjs`

To generate clean public folders in the repository root for ad hoc local testing, run:

- `node scripts/deploy.mjs --out .`