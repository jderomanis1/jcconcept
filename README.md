# Cimo Home Refreshments — Painting-First Website

A responsive static website positioning Cimo as a professional Rochester-area painting business. It preserves the premium concept design while making painting, right-sized projects, preparation, personal service, phone calls, and free estimate requests the primary experience.

## How it works

The site uses semantic HTML, modern CSS, and vanilla JavaScript for the mobile menu, before/after comparison, reveal effects, estimate dialog, and deterministic Project Assistant. Both lead experiences post to Formspree through the single endpoint in `config.js`. There is no build step, framework, database, or application server.

## Files

- `index.html` — page structure and editable copy
- `styles.css` — visual system and responsive layouts
- `script.js` — lightweight interactions
- `config.js` — the single public Formspree endpoint setting
- `assets/favicon.svg` — concept favicon
- `CONTACT_SETUP.md` — internal, beginner-friendly Formspree setup guide (not deployed)
- `.github/workflows/pages.yml` — automatic GitHub Pages deployment

## Editing the concept

Change messaging directly in `index.html`. Demo images use clearly visible Unsplash URLs in `index.html` and `styles.css`; replace those URLs with optimized Cimo project files placed in `assets/images/`. Keep paths relative (for example, `assets/images/project.webp`) so the site continues to work under a GitHub Pages repository subpath.

Every push to `main` triggers the Pages workflow. GitHub Pages must use **GitHub Actions** as its source in repository settings. The workflow stages only the client files required by the public site, keeping internal Markdown documentation out of the deployed artifact.

## Future conversational AI architecture

V1 is intentionally deterministic: it cannot invent pricing or service commitments and needs no paid API. If conversational AI is added later, use this boundary:

```text
GitHub Pages frontend → secure Cloudflare Worker → OpenAI API
```

Store the OpenAI API key **only** as a Cloudflare Worker secret. Never place an API key in browser JavaScript, repository files, GitHub Pages configuration, or client-visible requests. The Worker should enforce allowed origins, validate and minimize input, apply rate limits, keep the same business guardrails, and return only the information the frontend needs.
