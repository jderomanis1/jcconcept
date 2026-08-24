const config = window.CIMO_CONFIG || {};
const endpointConfigured = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(config.formspreeEndpoint || '') && !config.formspreeEndpoint.includes('REPLACE_');

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
  toggle.querySelector('.sr-only').textContent = open ? 'Open menu' : 'Close menu';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

const compare = document.querySelector('.compare');
compare.querySelector('input').addEventListener('input', event => compare.style.setProperty('--position', `${event.target.value}%`));
document.querySelectorAll('img').forEach(image => {
  const unavailable = () => image.classList.add('image-unavailable');
  image.addEventListener('error', unavailable);
  if (image.complete && image.naturalWidth === 0) unavailable();
});

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
}

const estimateDialog = document.querySelector('#estimate-dialog');
document.querySelectorAll('.estimate-open').forEach(button => button.addEventListener('click', () => openDialog(estimateDialog)));
estimateDialog.querySelector('.dialog-close').addEventListener('click', () => estimateDialog.close());
estimateDialog.querySelector('.dialog-done').addEventListener('click', () => estimateDialog.close());
estimateDialog.addEventListener('click', event => { if (event.target === estimateDialog) estimateDialog.close(); });

async function submitLead(formData) {
  if (!endpointConfigured) throw new Error('setup');
  const response = await fetch(config.formspreeEndpoint, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error('delivery');
}

const estimateForm = document.querySelector('#estimate-form');
estimateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!estimateForm.reportValidity()) return;
  const button = estimateForm.querySelector('.submit-button');
  const status = estimateForm.querySelector('.form-status');
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = '';
  try {
    await submitLead(new FormData(estimateForm));
    estimateForm.hidden = true;
    estimateDialog.querySelector('.form-success').hidden = false;
  } catch (error) {
    status.textContent = error.message === 'setup'
      ? 'Online requests are being connected. Please call 585-305-4365 to request your free estimate.'
      : 'We couldn’t send your request. Please try again or call 585-305-4365.';
  } finally {
    button.disabled = false;
    button.textContent = 'Send Estimate Request';
  }
});

const assistantDialog = document.querySelector('#assistant-dialog');
const assistantForm = document.querySelector('#assistant-form');
const assistantMessage = assistantDialog.querySelector('.assistant-message');
const progressText = assistantDialog.querySelector('.progress-text');
const progressBar = assistantDialog.querySelector('.progress-track i');
let assistantStep = 0;
let assistantData = {};

const steps = [
  { key: 'project_type', prompt: 'First, is this project for a home or a small business?', type: 'choices', options: ['Residential', 'Small Business'] },
  { key: 'paint_area', prompt: 'What would you like painted?', placeholder: 'Example: living room walls and ceiling', type: 'text' },
  { key: 'service', prompt: 'Which kind of project best fits?', type: 'choices', options: ['Interior Painting', 'Exterior Painting', 'Garage Painting', 'Other'] },
  { key: 'project_size', prompt: 'About how large is the project?', placeholder: 'Example: two rooms, one exterior side, or one garage', type: 'text' },
  { key: 'surface_condition', prompt: 'How would you describe the current surface condition?', type: 'choices', options: ['Generally sound', 'Some wear or marks', 'Peeling or visible damage', 'Not sure'] },
  { key: 'prep_needed', prompt: 'Is there visible peeling, damage, patching or other preparation you want us to know about?', type: 'choices', options: ['No visible concerns', 'Minor patching or repair', 'Peeling or damage', 'Not sure'] },
  { key: 'timing', prompt: 'When would you ideally like the project considered?', type: 'choices', options: ['As soon as practical', 'Within one month', 'Within 1–3 months', 'Planning ahead'] },
  { key: 'name', prompt: 'Who should Cimo follow up with?', placeholder: 'Your name', autocomplete: 'name', type: 'text' },
  { key: 'phone', prompt: 'What phone number should we include?', placeholder: '(585) 000-0000', autocomplete: 'tel', inputType: 'tel', type: 'text' },
  { key: 'email', prompt: 'What email address should we include?', placeholder: 'you@example.com', autocomplete: 'email', inputType: 'email', type: 'text' },
  { key: 'preferred_contact', prompt: 'How would you prefer Cimo to respond?', type: 'choices', options: ['Phone Call', 'Email'] },
  { key: 'additional_details', prompt: 'Anything else Justin should know or confirm? This is optional.', placeholder: 'Questions, access details, or other helpful context', type: 'textarea', optional: true },
  { key: 'review', prompt: 'Here’s what will be sent. Please review your project request.', type: 'review' }
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderAssistant() {
  const step = steps[assistantStep];
  const progress = Math.round((assistantStep / (steps.length - 1)) * 100);
  progressBar.style.width = `${progress}%`;
  progressText.textContent = step.type === 'review' ? 'Ready to review' : `Step ${assistantStep + 1} of ${steps.length - 1}`;
  assistantMessage.innerHTML = `<p>${step.prompt}</p>`;
  let control = '';
  if (step.type === 'choices') {
    control = `<div class="assistant-choices">${step.options.map(option => `<button type="button" data-value="${escapeHtml(option)}" class="assistant-choice${assistantData[step.key] === option ? ' selected' : ''}">${escapeHtml(option)}</button>`).join('')}</div>`;
  } else if (step.type === 'review') {
    const rows = [['PROJECT TYPE', 'project_type'], ['SERVICE', 'service'], ['WHAT TO PAINT', 'paint_area'], ['SIZE', 'project_size'], ['SURFACE', 'surface_condition'], ['PREP', 'prep_needed'], ['TIMING', 'timing'], ['CONTACT', 'contact'], ['PREFERRED RESPONSE', 'preferred_contact'], ['ADDITIONAL DETAILS', 'additional_details']];
    const values = { ...assistantData, contact: `${assistantData.name || ''} · ${assistantData.phone || ''} · ${assistantData.email || ''}` };
    control = `<dl class="assistant-summary">${rows.filter(([, key]) => values[key]).map(([label, key]) => `<div><dt>${label}</dt><dd>${escapeHtml(values[key])}</dd></div>`).join('')}</dl><button class="button assistant-send" type="submit">Send Project Request</button><p class="assistant-status" role="status" aria-live="polite"></p>`;
  } else {
    const tag = step.type === 'textarea' ? 'textarea' : 'input';
    const attributes = tag === 'input' ? `type="${step.inputType || 'text'}"` : 'rows="4"';
    control = `<label class="sr-only" for="assistant-input">${step.prompt}</label><${tag} id="assistant-input" ${attributes} placeholder="${escapeHtml(step.placeholder)}" ${step.autocomplete ? `autocomplete="${step.autocomplete}"` : ''}>${tag === 'textarea' ? escapeHtml(assistantData[step.key] || '') : ''}</${tag === 'textarea' ? 'textarea' : 'input'}><button class="button assistant-next" type="submit">Continue</button>`;
  }
  assistantForm.innerHTML = `${control}<div class="assistant-nav">${assistantStep > 0 ? '<button type="button" class="assistant-back">← Back / Edit</button>' : ''}<button type="button" class="assistant-restart">Restart</button></div>`;
  if (step.type === 'text' && step.type !== 'textarea') assistantForm.querySelector('#assistant-input').value = assistantData[step.key] || '';
  assistantForm.querySelectorAll('.assistant-choice').forEach(button => button.addEventListener('click', () => {
    assistantData[step.key] = button.dataset.value;
    assistantStep += 1;
    renderAssistant();
  }));
  assistantForm.querySelector('.assistant-back')?.addEventListener('click', () => { assistantStep -= 1; renderAssistant(); });
  assistantForm.querySelector('.assistant-restart').addEventListener('click', restartAssistant);
  assistantForm.querySelector('#assistant-input')?.focus();
}

function restartAssistant() {
  assistantStep = 0;
  assistantData = {};
  renderAssistant();
}

assistantForm.addEventListener('submit', async event => {
  event.preventDefault();
  const step = steps[assistantStep];
  if (step.type !== 'review') {
    const input = assistantForm.querySelector('#assistant-input');
    const value = input.value.trim();
    if (!value && !step.optional) { input.setCustomValidity('Please complete this step.'); input.reportValidity(); return; }
    if (step.inputType === 'email' && !input.validity.valid) { input.reportValidity(); return; }
    assistantData[step.key] = value;
    assistantStep += 1;
    renderAssistant();
    return;
  }
  const send = assistantForm.querySelector('.assistant-send');
  const status = assistantForm.querySelector('.assistant-status');
  send.disabled = true;
  send.textContent = 'Sending…';
  const payload = new FormData();
  payload.set('lead_source', 'Cimo Project Assistant');
  Object.entries(assistantData).forEach(([key, value]) => payload.set(key, value));
  payload.set('project_summary', Object.entries(assistantData).map(([key, value]) => `${key}: ${value}`).join('\n'));
  try {
    await submitLead(payload);
    assistantMessage.innerHTML = '<h3>Your project details have been sent to Cimo.</h3><p>Justin will review the request and follow up using your preferred contact method.</p>';
    assistantForm.innerHTML = '<button class="button assistant-finish" type="button">Done</button><button class="assistant-restart success-restart" type="button">Start another request</button>';
    assistantForm.querySelector('.assistant-finish').addEventListener('click', () => assistantDialog.close());
    assistantForm.querySelector('.success-restart').addEventListener('click', restartAssistant);
  } catch (error) {
    status.textContent = error.message === 'setup' ? 'Online requests are being connected. Please call 585-305-4365 for a free estimate.' : 'We couldn’t send this request. Please try again or call 585-305-4365.';
    send.disabled = false;
    send.textContent = 'Send Project Request';
  }
});

document.querySelectorAll('.assistant-open').forEach(button => button.addEventListener('click', () => { openDialog(assistantDialog); renderAssistant(); }));
assistantDialog.querySelector('.assistant-close').addEventListener('click', () => assistantDialog.close());
assistantDialog.addEventListener('click', event => { if (event.target === assistantDialog) assistantDialog.close(); });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
} else document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
document.querySelector('#year').textContent = new Date().getFullYear();
