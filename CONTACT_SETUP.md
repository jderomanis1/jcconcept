# Connect Cimo estimate requests with Formspree

This setup guide contains no private credentials or routing addresses. The GitHub Pages workflow publishes only the website files, so internal Markdown documentation will not appear on the public site.

Both the standard estimate form and the Cimo Project Assistant use one Formspree endpoint. You only need to change **one value**.

## 1. Create a Formspree account

1. Go to [formspree.io](https://formspree.io/).
2. Choose **Get Started** (or **Sign Up**).
3. Create an account and complete Formspree's email-verification steps.
4. Sign in to the Formspree dashboard.

## 2. Create the Cimo form

1. In the dashboard, create a **New Form**.
2. Use a clear name such as `Cimo website estimate requests`.
3. Set the recipient/delivery address to the **private Cimo routing email provided separately**.
4. Complete any recipient-verification message Formspree sends. Requests cannot be delivered until the recipient is confirmed.

The recipient belongs only in Formspree. **Do not add it to `index.html`, `script.js`, `config.js`, metadata, or browser code.**

## 3. Copy the endpoint

Open the new form in Formspree and copy its endpoint. It should look like:

```text
https://formspree.io/f/abcdefgh
```

The final letters are Formspree's form ID. Do not use an endpoint containing an email address.

## 4. Change the website's one configuration value

Open `config.js`. Replace this exact placeholder value:

```js
https://formspree.io/f/REPLACE_WITH_FORM_ID
```

with the complete endpoint copied from Formspree. Change **only** `formspreeEndpoint`; there is no second form endpoint elsewhere in the site.

Save, commit, and push the change to `main` after the pull request is approved. The existing GitHub Pages workflow will deploy it.

## 5. Test the standard estimate form

1. Open the deployed website in a private/incognito browser window.
2. Select **Get a Free Estimate**.
3. Try submitting with required fields empty; the browser should identify the missing fields.
4. Complete every required field with clearly labeled test information.
5. Select **Send Estimate Request**.
6. Confirm the polished success message appears.
7. Check the Formspree submissions dashboard.
8. Confirm the recipient inbox receives the request.
9. Confirm the submission includes `lead_source: Website Estimate Form`.

If the form shows a connection message instead, confirm the URL in `config.js` is exact, the form ID is active, and the recipient has completed verification.

## 6. Test the Project Assistant

1. Select **Tell Us About Your Project**.
2. Complete the guided flow.
3. Use **Back / Edit** at least once and confirm the earlier answer remains available.
4. Review the structured summary.
5. Send the request.
6. Confirm its success message appears.
7. Confirm Formspree and the recipient inbox receive it.
8. Confirm it includes `lead_source: Cimo Project Assistant` and a readable `project_summary`.
9. Reopen the assistant and test **Restart**.

## 7. Review Formspree protection settings

In the new form's Formspree settings, review the protection options available on the selected plan. If offered:

- restrict accepted submissions to the deployed Cimo website domain;
- keep Formspree's spam filtering enabled;
- review submission notifications and retention preferences; and
- periodically check the Formspree dashboard for rejected or spam submissions.

The website also sends a hidden `_gotcha` honeypot field from the standard form. Do not put real information in that field or remove it without reviewing Formspree's current spam guidance.

## Final launch checklist

- [ ] Recipient verified inside Formspree
- [ ] `formspreeEndpoint` replaced once in `config.js`
- [ ] Standard form received in Formspree and the recipient inbox
- [ ] Project Assistant request received in both places
- [ ] Correct `lead_source` shown for both paths
- [ ] Public website source does not contain the private delivery address
