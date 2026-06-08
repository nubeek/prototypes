# Wefranch Prototypes

Collection of static HTML/CSS/JS prototypes for different Wefranch concepts and experiences.

## Project structure

- `targets/` - target and owner-focused prototype.
- `tour/` - franchise tour-focused prototype.
- `cst/` - earlier CST prototype retained for reference.
- `adoption-curve/` - article-style innovation adoption curve prototype.
- `modeling/` - sell-side research and financial modeling prototype (interactive and video variants).

## Local setup

1. Start a local server from the project root (for example `python3 -m http.server 5500`).
2. Open the prototype you want to test, for example:
   - `http://localhost:5500/targets/`
   - `http://localhost:5500/tour/`
   - `http://localhost:5500/cst/`
   - `http://localhost:5500/modeling/`

## Commit and push to GitHub

From the project root:

1. Check what changed:
   - `git status`
2. Stage your changes:
   - `git add .`
3. Commit:
   - `git commit -m "Update prototypes README"`
4. Push your current branch:
   - `git push origin $(git branch --show-current)`