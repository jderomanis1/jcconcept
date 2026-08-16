# Cimo Home Refreshments — Website Concept

A responsive, clickable concept prototype for Cimo Home Refreshments. This is a visual review site—not a production website—and its estimate form intentionally does not submit data.

## How it works

The site uses semantic HTML, modern CSS, and a small amount of vanilla JavaScript for the mobile menu, before/after comparison, reveal effects, and estimate-demo dialog. There is no build step or backend.

## Files

- `index.html` — page structure and editable copy
- `styles.css` — visual system and responsive layouts
- `script.js` — lightweight interactions
- `assets/favicon.svg` — concept favicon
- `FEEDBACK.md` — questions for Justin's review
- `.github/workflows/pages.yml` — automatic GitHub Pages deployment

## Editing the concept

Change messaging directly in `index.html`. Demo images use clearly visible Unsplash URLs in `index.html` and `styles.css`; replace those URLs with optimized Cimo project files placed in `assets/images/`. Keep paths relative (for example, `assets/images/project.webp`) so the site continues to work under a GitHub Pages repository subpath.

Every push to `main` triggers the Pages workflow. GitHub Pages must use **GitHub Actions** as its source in repository settings. Add review notes directly to `FEEDBACK.md`.
