# Cimo Lead API setup

The website uses its own Express lead endpoint. It does **not** use Formspree, Basin, EmailJS, Typeform, Zapier, Make, or another form-processing service.

Production flow:

`Cimo website → Cimo Express API → Gmail SMTP → jcimo47@gmail.com`

The browser never receives Gmail credentials or the private mail configuration. The Color Studio preview is held in memory long enough to attach it to the lead email and is not saved by the application.

## Administrator setup

1. Create or use a generic Cimo Gmail sender account controlled by the website administrator. Do not use the lead recipient account as the application credential unless you intentionally want it to be the sender too.
2. Enable 2-Step Verification on that Google account and create a Google App Password.
3. In Render, create a Web Service from this repository. The checked-in `render.yaml` points Render at the `server/` directory and exposes `/health` for health checks.
4. In Render's Environment settings, add these private/runtime values:

   ```text
   GMAIL_USER=<generic Cimo sender Gmail address>
   GMAIL_APP_PASSWORD=<Google App Password>
   LEAD_EMAIL_TO=jcimo47@gmail.com
   ALLOWED_ORIGINS=https://jderomanis1.github.io
   ```

   `RATE_LIMIT=10` is optional; 10 requests per 15 minutes is the application default.
5. Deploy the service and verify `GET /health` returns `{ "ok": true }`.
6. Copy the public HTTPS base URL for the service.
7. In `config.js`, replace `CONTACT_API_URL` with that base URL only. Do not add `/api/contact`; the frontend appends it.
8. Commit the public API URL and allow GitHub Pages to redeploy.
9. Submit a clearly labeled test estimate from the live site and verify it reaches `jcimo47@gmail.com`.
10. If the test includes an email address, hit Reply and confirm the reply is addressed to the customer's email.
11. Submit a Color Studio estimate and verify `cimo-color-preview.jpg` is attached.

## Safe failure behavior

If `config.js` does not contain a valid HTTPS API base URL, the site does not let a visitor fill in a form that cannot send. The estimate dialog immediately shows the clickable phone fallback, `585-305-4365`.

If the backend is configured but Gmail delivery fails, the customer's entered values remain on screen and the site asks them to retry or call.

## Security and privacy

- Never commit `GMAIL_APP_PASSWORD` or another credential to GitHub.
- `LEAD_EMAIL_TO=jcimo47@gmail.com` is a destination address, not a secret, but delivery remains controlled by the server.
- The backend validates required fields, validates optional email format, validates phone format, rate-limits requests, enforces CORS, uses a honeypot, escapes submitted values in HTML email, and limits uploads by count, size, and MIME type.
- Uploaded preview files are processed from memory and are not persisted by the application.
- Do not log complete lead payloads or secrets.
