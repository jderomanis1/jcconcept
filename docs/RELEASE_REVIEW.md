# September 9, 2026 refresh

## Source and scope

Based on the September 6 meeting and Justin's supplied interior-painting process. Brand is Cimo Home Refreshments across desktop and mobile. Interior/exterior is one service; garages, preparation and small-business painting remain separate. All seven interior steps preserve conditional priming and additional coats as needed.

Cleaning remains a secondary referral inquiry to Justin. No name, photo, contact or booking for his sister is published because her permission and business details were not supplied. No unverified reviews, registration, insurance, guarantees, pricing, payment gateway or availability are claimed.

## UX and operation

Color Studio is the first major feature after the hero. One editor supports touch, keyboard, desktop and expanded mobile mode. Prepared template boundaries are deterministic. Uploaded photos have color/edge-assisted selection plus explicit Outline/Cutout refinement, not an AI room-understanding claim. Selections preserve pixels outside the mask exactly. Recoloring is rebuilt from the original, supports dark-to-light previews and retains relative shading.

Image upload has size/format validation and preserves the current image when replacement fails. Unsupported HEIC is explained instead of silently failing. Photo processing is local-only. Export includes original and preview plus chosen color codes and a physical-sample disclaimer. Export is independent of on-screen comparison/selection overlays.

Estimate requests prepare email/text to the new public contacts. Visitors must send from their own app. No server delivery or automatic photo attachment is configured or represented as working. Copy and direct call/email/text remain available.

## Verification

`tests/core.test.cjs` checks exact outside-mask pixels, shading, dark-to-light preview, non-cumulative edits, independent surfaces, selection edge/seed bounds, full-resolution history and cutouts.

`tests/browser.mjs` checks seven Chromium viewports (320 through 1440 pixels), mobile WebKit, menu/focus, expanded layout, functional template painting, touch, upload, precision tools, comparison, undo/redo, color handoff, file validation, JPEG download, no unexpected external requests or form POSTs, accessibility via axe, and no-JavaScript contact fallback. CI publishes screenshots and results under cimo-qa-evidence. A test is not represented as passing until its run succeeds.

## Known limits

Personal-photo automatic selection is not semantic segmentation. Similar colors and low-contrast borders can need manual outlining. The browser preview cannot reproduce actual lighting, sheen or paint color accuracy. Physical samples are necessary. Photos reset when the page closes; save a preview to keep it. Up to four surfaces and eight undo actions bound mobile memory. HEIC support depends on the browser; JPG, PNG or WebP are recommended.
