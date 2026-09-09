# Cimo Home Refreshments

A static, mobile-first painting website and local-only Color Studio for Justin Cimo.

Public site: https://jderomanis1.github.io/jcconcept/

## Contact

Call/text **585-880-9905**. Email **cimohomerefreshments@gmail.com**.
The estimate builder prepares a message for the visitor's email or text app. It does not send mail, record leads or claim delivery. Visitors review and press Send in their own app. A server delivery service is not configured.

## Color Studio

Two prepared templates, photo upload, edge/color-assisted selection, polygon outlines and cutouts, brush/erase refinement, independent surfaces, undo/redo, before/after, zoom/pan and JPEG export. Desktop and mobile share the same editor DOM; Expand opens that editor in a native dialog.

Selection on personal photos is color/edge assisted, not semantic AI. Similar-colored adjacent objects may require Outline or Erase. Prepared template masks avoid guessing. Screen previews are illustrative; choose physical paint samples before committing.

All uploaded-image processing happens in the browser. Photos are not transmitted or stored by the site. Color selections can be included in a prepared estimate message; saved images must be attached by the visitor.

## Develop and verify

```sh
python3 -m pip install Pillow==11.3.0
node --test tests/core.test.cjs
python3 scripts/stage.py
python3 -m http.server 4173 --directory _site
```

In a second shell:

```sh
npm install --no-save --package-lock=false playwright@1.55.0 axe-core@4.10.3
npx playwright install --with-deps chromium webkit
node tests/browser.mjs
```

Production has no JavaScript package dependencies. CI dependencies are test-only. The Pages build publishes only the allowlist in `scripts/stage.py`, not source tooling or unused photos. Changes are reviewed through a pull request and its QA evidence before merge. The main-branch Pages workflow verifies the deployed release and contacts.

See `docs/RELEASE_REVIEW.md` for scope and limitations and `assets/projects/README.md` for photo provenance.
