# Cimo Home Refreshments

A responsive, painting-first GitHub Pages website for Cimo's Rochester-area residential and small-business painting service. It includes a local Canvas-based Color Studio and one guided free-estimate experience.

## Architecture

- `index.html`, `styles.css`, `script.js`: framework-free GitHub Pages frontend and local-only Color Studio
- `config.js`: public Render API base URL (no secrets)
- `server/`: Express, Nodemailer and optional Twilio lead delivery API
- `LEAD_API_SETUP.md`: administrator deployment guide; Justin has no setup responsibility

The photo visualizer resizes the selected image in memory, creates a contiguous color-similarity mask, supports brush/erase refinement, and preserves luminance while recoloring. It does not use storage or external image/AI services. Only an explicitly selected original/preview composite is submitted.

See `LEAD_API_SETUP.md` for deployment. Run backend tests with `cd server && npm install && npm test`.
