# Cimo Lead API setup (website administrator)

Justin is only the lead recipient. He does not need GitHub, Render, Gmail, API, environment-variable, Twilio, or deployment access.

## Newbie 101

1. Create a generic Gmail sender account that **you**, the website administrator, control. Do not use Justin's Gmail.
2. In that Google account, enable 2-Step Verification, then create a Google App Password.
3. In Render, create a **Web Service** from this repository. Render can read `render.yaml`; the service root is `server/`.
4. Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and Justin's private address as `LEAD_EMAIL_TO` in Render's Environment page. Never put their values in GitHub.
5. Set `ALLOWED_ORIGINS` to comma-separated exact origins, initially `https://jderomanis1.github.io`; add a future custom Cimo origin after a comma.
6. Deploy and confirm `/health` responds with `{ "ok": true }`.
7. Copy the Render service URL.
8. In frontend `config.js`, replace `CONTACT_API_URL` with the service URL (no `/api/contact` suffix).
9. Commit that public URL and redeploy GitHub Pages.
10. Submit a clearly labeled test estimate and verify Justin receives its readable email.
11. Hit **Reply** and verify the reply is addressed to the test customer's email.
12. Submit a Color Studio estimate and verify the single `cimo-color-preview.jpg` attachment.
13. Test an estimate without an image and the phone fallback.

## Optional SMS (later)

Email is primary. Leave `SMS_ENABLED=false` until ready. To enable a concise alert, configure `SMS_ENABLED=true`, `SMS_TO`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` in Render. An SMS error does not turn an emailed lead into a failed request.

## Operations and privacy

The API accepts one in-memory JPEG, PNG, or WebP preview, attaches it to email, and retains no file. Rotate an App Password in Google and update Render if it is ever exposed. Render—not Justin—owns all configuration. Use Render logs only for delivery status; the application never logs complete lead payloads or secrets.
