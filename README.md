# Prototypes

Collection of static HTML/CSS/JS prototypes for different Wefranch concepts and experiences.

## Local setup

1. Run:
   - `python3 -m http.server 5500`
2. Open:
   - `http://localhost:5500/_prototypes/`

Local development uses `_prototypes/`. You do not need `_out/`.

## Commit, push, and deploy

Run this single command from the project root:

- `git add -A && git commit -m "Bug fixes" && git push origin "$(git branch --show-current)""`

This push triggers GitHub Actions, which builds and deploys GitHub Pages.