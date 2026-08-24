const dialog = $('#estimate-dialog');
const estimateForm = $('#estimate-form');
const fallback = $('.estimate-config-fallback');
const formPanel = $('.estimate-form-panel');
const successPanel = $('.estimate-success');
const successHeading = successPanel.querySelector('h3');
const successCopy = successPanel.querySelector('p');
const submitStatus = $('.assistant-status');
let studioPreview = null;
let submitting = false;

const DEFAULT_SUCCESS_HEADING = 'Thank you. Your estimate request was sent to Cimo.';
const DEFAULT_SUCCESS_COPY = 'Cimo will follow up using the information you provided.';
const ATTACHMENT_FALLBACK_MESSAGE = "Sent. Your color choice was included — we couldn't attach the photo, so mention it when we call.";

function apiBaseUrl() {
  const candidate = window.CIMO_CONFIG?.contactApiUrl?.trim();
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.href.replace(/\/$/, '') : '';
  } catch { return ''; }
}
function resetEstimatePanels() {
  fallback.hidden = true;
  formPanel.hidden = false;
  successPanel.hidden = true;
  submitStatus.textContent = '';
  successHeading.textContent = DEFAULT_SUCCESS_HEADING;
  successCopy.textContent = DEFAULT_SUCCESS_COPY;
  $('.assistant-send').disabled = false;
  $('.assistant-send').textContent = 'Request My Free Estimate';
  $('#preview-attachment-note').hidden = !studioPreview;
}
function openEstimate() {
  resetEstimatePanels();
  if (!apiBaseUrl()) { fallback.hidden = false; formPanel.hidden = true; }
  dialog.showModal();
  requestAnimationFrame(() => {
    const focusTarget = fallback.hidden ? estimateForm.elements.name : $('.fallback-phone');
    focusTarget?.focus();
  });
}
$$('.estimate-open').forEach((button) => button.addEventListener('click', openEstimate));
$('.estimate-close').addEventListener('click', () => dialog.close());
$('#estimate-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
$('#use-preview').addEventListener('click', async () => {
  const button = $('#use-preview');
  button.disabled = true;
  const priorText = button.textContent;
  button.textContent = 'Preparing preview…';
  try {
    studioPreview = await Studio.exportPreview();
    if (studioPreview) openEstimate();
  } finally {
    button.textContent = priorText;
    button.disabled = false;
  }
});

function buildSubmission(raw, includePreview) {
  const body = new FormData();
  for (const key of ['name', 'phone', 'service', 'email', 'description', 'website']) {
    body.append(key, String(raw.get(key) || '').trim());
  }
  body.append('lead_source', studioPreview ? 'Cimo Color Studio' : 'Website Estimate');
  body.append('selected_color', studioPreview?.color || '');
  body.append('surface_description', studioPreview?.surface || '');
  body.append('_subject', 'New Cimo estimate request');
  body.append('_template', 'table');
  body.append('_captcha', 'false');
  if (includePreview && studioPreview?.blob) body.append('preview', studioPreview.blob, 'cimo-color-preview.jpg');
  return body;
}

async function postEstimate(endpoint, raw, includePreview) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: buildSubmission(raw, includePreview)
  });
  if (!response.ok) throw new Error(`FormSubmit returned ${response.status}`);
  return response;
}

estimateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  if (!estimateForm.reportValidity()) return;
  const endpoint = apiBaseUrl();
  if (!endpoint) { fallback.hidden = false; formPanel.hidden = true; return; }
  submitting = true;
  const button = $('.assistant-send');
  button.disabled = true;
  button.textContent = 'Sending…';
  submitStatus.textContent = '';
  const raw = new FormData(estimateForm);
  const hasPreviewFile = Boolean(studioPreview?.blob);
  let sentWithoutAttachment = false;

  try {
    if (hasPreviewFile) {
      try {
        await postEstimate(endpoint, raw, true);
      } catch {
        await postEstimate(endpoint, raw, false);
        sentWithoutAttachment = true;
      }
    } else {
      await postEstimate(endpoint, raw, false);
    }

    formPanel.hidden = true;
    successPanel.hidden = false;
    if (sentWithoutAttachment) {
      successHeading.textContent = ATTACHMENT_FALLBACK_MESSAGE;
      successCopy.textContent = 'Cimo received your estimate details, selected color, and surface description.';
    }
    estimateForm.reset();
    studioPreview = null;
    $('#preview-attachment-note').hidden = true;
    $('#estimate-done').focus();
  } catch {
    submitStatus.textContent = 'We couldn’t send your request. Please try again or call 585-305-4365.';
    button.disabled = false;
    button.textContent = 'Request My Free Estimate';
  } finally { submitting = false; }
});
