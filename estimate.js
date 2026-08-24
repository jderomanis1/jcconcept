(() => {
  const dialog = $('#estimate-dialog');
  if (!dialog) return;

  const estimateForm = $('#estimate-form');
  const fallback = $('.estimate-config-fallback');
  const fallbackHeading = fallback?.querySelector('h3');
  const fallbackCopy = fallback?.querySelector('p');
  const formPanel = $('.estimate-form-panel');
  const successPanel = $('.estimate-success');
  const successHeading = successPanel?.querySelector('h3');
  const successCopy = successPanel?.querySelector('p');
  const submitStatus = $('.assistant-status');
  const submitButton = $('.assistant-send');
  const previewNote = $('#preview-attachment-note');
  const estimateDone = $('#estimate-done');
  const usePreview = $('#use-preview');
  const closeButton = $('.estimate-close');

  let studioPreview = null;
  let submitting = false;
  let lastTrigger = null;

  const DEFAULT_SUCCESS_HEADING = 'Thank you. Your estimate request was sent to Cimo.';
  const DEFAULT_SUCCESS_COPY = 'Cimo will follow up using the information you provided.';
  const ATTACHMENT_FALLBACK_MESSAGE = "Sent. Your color choice was included — we couldn't attach the photo, so mention it when we call.";

  function apiBaseUrl() {
    const candidate = window.CIMO_CONFIG?.contactApiUrl?.trim();
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === 'https:' ? parsed.href.replace(/\/$/, '') : '';
    } catch {
      return '';
    }
  }

  function showConfigFallback() {
    if (fallbackHeading) fallbackHeading.textContent = 'Call or text 585-305-4365';
    if (fallbackCopy) fallbackCopy.textContent = 'Online requests are unavailable right now. Call or text Cimo directly for your free estimate.';
    if (fallback) fallback.hidden = false;
    if (formPanel) formPanel.hidden = true;
  }

  function addWhatHappensNext() {
    if (!formPanel || !estimateForm || formPanel.querySelector('.estimate-next-steps')) return;
    const note = document.createElement('div');
    note.className = 'estimate-next-steps';
    note.innerHTML = '<strong>What happens next</strong><span>Send your details → Cimo follows up to talk through the project → arrange the estimate.</span>';
    estimateForm.before(note);
  }

  addWhatHappensNext();

  function resetEstimatePanels() {
    if (fallback) fallback.hidden = true;
    if (formPanel) formPanel.hidden = false;
    if (successPanel) successPanel.hidden = true;
    if (submitStatus) submitStatus.textContent = '';
    if (successHeading) successHeading.textContent = DEFAULT_SUCCESS_HEADING;
    if (successCopy) successCopy.textContent = DEFAULT_SUCCESS_COPY;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Request My Free Estimate';
    }
    if (previewNote) previewNote.hidden = !studioPreview;
  }

  function openEstimate(event) {
    lastTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : document.activeElement;
    resetEstimatePanels();
    if (!apiBaseUrl()) showConfigFallback();
    dialog.showModal();
    requestAnimationFrame(() => {
      const focusTarget = fallback?.hidden !== false ? estimateForm?.elements?.name : $('.fallback-phone');
      focusTarget?.focus();
    });
  }

  $$('.estimate-open').forEach((button) => button.addEventListener('click', openEstimate));
  closeButton?.addEventListener('click', () => dialog.close());
  estimateDone?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('close', () => {
    if (lastTrigger instanceof HTMLElement && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  });

  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dialog.close();
    }
  });

  usePreview?.addEventListener('click', async () => {
    usePreview.disabled = true;
    const priorText = usePreview.textContent;
    usePreview.textContent = 'Preparing preview…';
    try {
      studioPreview = await Studio.exportPreview();
      if (studioPreview) openEstimate({ currentTarget: usePreview });
    } finally {
      usePreview.textContent = priorText;
      usePreview.disabled = false;
    }
  });

  function submissionFields(raw) {
    const website = String(raw.get('website') || '').trim();
    const email = String(raw.get('email') || '').trim();
    const fields = {
      name: String(raw.get('name') || '').trim(),
      phone: String(raw.get('phone') || '').trim(),
      service: String(raw.get('service') || '').trim(),
      email,
      description: String(raw.get('description') || '').trim(),
      lead_source: studioPreview ? 'Cimo Color Studio' : 'Website Estimate',
      selected_color: studioPreview?.color || '',
      surface_description: studioPreview?.surface || '',
      _subject: 'New Cimo estimate request',
      _template: 'table',
      _captcha: 'false',
      _honey: website,
      _url: window.location.href
    };
    if (email) fields._replyto = email;
    return fields;
  }

  function buildMultipartSubmission(raw) {
    const body = new FormData();
    Object.entries(submissionFields(raw)).forEach(([key, value]) => body.append(key, value));
    if (studioPreview?.blob) body.append('preview', studioPreview.blob, 'cimo-color-preview.jpg');
    return body;
  }

  async function parseFormSubmitResponse(response) {
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false || result?.success === 'false') {
      throw new Error(result?.message || `FormSubmit returned ${response.status}`);
    }
    return result;
  }

  async function postEstimate(endpoint, raw, includePreview) {
    if (includePreview && studioPreview?.blob) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: buildMultipartSubmission(raw)
      });
      return parseFormSubmitResponse(response);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(submissionFields(raw))
    });
    return parseFormSubmitResponse(response);
  }

  estimateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !estimateForm) return;
    if (!estimateForm.reportValidity()) return;

    const endpoint = apiBaseUrl();
    if (!endpoint) {
      showConfigFallback();
      return;
    }

    submitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    if (submitStatus) submitStatus.textContent = '';

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

      if (formPanel) formPanel.hidden = true;
      if (successPanel) successPanel.hidden = false;

      if (sentWithoutAttachment) {
        if (successHeading) successHeading.textContent = ATTACHMENT_FALLBACK_MESSAGE;
        if (successCopy) successCopy.textContent = 'Cimo received your estimate details, selected color, and surface description.';
      }

      estimateForm.reset();
      studioPreview = null;
      if (previewNote) previewNote.hidden = true;
      estimateDone?.focus();
    } catch (error) {
      console.error('Estimate submission failed', error);
      if (submitStatus) submitStatus.textContent = 'We couldn’t send your request. Please try again or call 585-305-4365.';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Request My Free Estimate';
      }
    } finally {
      submitting = false;
    }
  });
})();
