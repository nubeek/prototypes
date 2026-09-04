# Prototypes

Collection of static HTML/CSS/JS prototypes for different Wefranch concepts and experiences.
No build step and no dependencies to install — everything runs straight from source.

## Local setup

1. Serve the repo root from the project root:
   - `npx serve`
2. Open:
   - `http://localhost:3000/_prototypes/`

Local development uses `_prototypes/`. You do not need `_out/`.

Serve the repo root rather than a subfolder — the prototypes reference shared
`assets/`, `scripts/`, and `styles/` from the root. Use directory URLs
(`/_prototypes/cst/`) rather than `/_prototypes/cst/index.html`, since `serve`
strips `.html` and that breaks relative asset paths.

## Prototypes

| Prototype | Path |
| --- | --- |
| Prospects | `_prototypes/cst/` |
| Targets | `_prototypes/targets/` |
| Territories | `_prototypes/territories/` |
| Financial Modeling | `_prototypes/financial-modeling/` |
| Logo Collection | `logos/` |

Shared UI, filter, and map modules live in `_prototypes/shared/`.

## Commit, push, and deploy

Run this single command from the project root:

- `git add -A && git commit -m "Your change summary" && git push origin "$(git branch --show-current)"`

This push triggers GitHub Actions, which builds and deploys GitHub Pages.

`_out/` is generated build output (`node scripts/deploy.mjs`). It is gitignored
and safe to delete at any time; it is rebuilt from `_prototypes/` on demand.
