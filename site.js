'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function applyContentRefresh() {
  const phone = '585-305-4365';
  const tel = 'tel:5853054365';
  const sms = 'sms:5853054365';

  const headerCall = $('.header-call');
  if (headerCall) {
    const contact = document.createElement('div');
    contact.className = 'header-contact';
    contact.setAttribute('aria-label', `Call or text Cimo at ${phone}`);
    contact.innerHTML = `<a href="${tel}">Call</a><span aria-hidden="true">/</span><a href="${sms}">Text ${phone}</a>`;
    headerCall.replaceWith(contact);
  }

  const navCall = $('.nav-call');
  if (navCall) {
    const contact = document.createElement('div');
    contact.className = 'nav-contact';
    contact.innerHTML = `<a href="${tel}">Call ${phone}</a><a href="${sms}">Text ${phone}</a>`;
    navCall.replaceWith(contact);
  }

  const heroCopy = $('.hero-content > p:not(.eyebrow)');
  if (heroCopy) {
    heroCopy.textContent = 'Professional painting for Rochester-area homes and small businesses, with careful prep, clean lines and direct service from the first conversation through the final walk-through.';
  }

  const trustFirst = $('.trust div:first-child strong');
  if (trustFirst) trustFirst.innerHTML = 'Rochester Area<br>Locally Owned';

  const serviceHeading = $('#services .section-heading');
  if (serviceHeading) {
    const eyebrow = $('.eyebrow', serviceHeading);
    const heading = $('h2', serviceHeading);
    const copy = serviceHeading.querySelector(':scope > p');
    if (eyebrow) eyebrow.textContent = 'Painting without the runaround';
    if (heading) heading.innerHTML = 'You do not need a remodel.<br>You need the right refresh.';
    if (copy) copy.textContent = 'From one room or a worn garage to an exterior or small-business space, Cimo gives Rochester-area projects the prep, clean lines and finish that make the whole place feel better. Call or text Justin directly and tell him what you want to change.';
  }

  const serviceImages = [
    { src: 'assets/cimo-interior.webp', alt: 'Cimo painter applying a fresh interior wall color in a Rochester-area home' },
    { src: 'assets/cimo-exterior-garage.webp', alt: 'Cimo painter finishing exterior trim beside a residential garage' },
    { src: 'assets/cimo-surface-prep.webp', alt: 'Cimo painter repairing and smoothing a wall before painting' },
    { src: 'assets/cimo-small-business.webp', alt: 'Cimo painter refreshing a small-business interior' }
  ];
  $$('.service-card img').forEach((img, index) => {
    const replacement = serviceImages[index];
    if (!replacement) return;
    img.src = replacement.src;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.alt = replacement.alt;
  });

  const serviceDescriptions = $$('.service-card p');
  const descriptions = [
    'Walls, ceilings and trim with crisp edges, even coverage and a finish that makes the room feel new again.',
    'Exterior and garage surfaces prepared carefully for a durable, clean-looking finish.',
    'Sanding, patching, minor repair and priming where needed, because the finish is only as good as the surface underneath.',
    'Professional painting for offices, shops and other right-sized commercial spaces that need to look cared for.'
  ];
  serviceDescriptions.forEach((node, index) => { if (descriptions[index]) node.textContent = descriptions[index]; });

  const canvasEmpty = $('.canvas-empty');
  if (canvasEmpty) canvasEmpty.textContent = 'Tap an area to select what you want to change.';
  const smartTool = $('[data-tool="smart"]');
  if (smartTool) {
    smartTool.textContent = 'Tap Area';
    smartTool.setAttribute('aria-label', 'Tap an area to select it');
  }

  const why = $('#why-cimo');
  if (why) {
    why.innerHTML = `
      <div><p class="eyebrow">Why Cimo</p></div>
      <div class="manifesto-copy">
        <h2>Professional results.<br>Without feeling like a number.</h2>
        <p>Careful work, direct communication and the details that make a refresh feel finished.</p>
        <ul>
          <li>Locally owned and operated</li>
          <li>Direct contact with Justin</li>
          <li>Small-to-medium projects welcome</li>
          <li>Residential + small-business work</li>
          <li>Prep before paint</li>
          <li>Clean work areas and cleanup</li>
          <li>Clear scope and expectations</li>
          <li>Quality without big-contractor overhead</li>
        </ul>
      </div>`;
  }

  const standard = $('#standard');
  if (standard) {
    standard.innerHTML = `
      <div class="standard-heading reveal">
        <div>
          <p class="eyebrow">The Cimo Standard</p>
          <h2>From “this space feels tired”<br>to “this feels right.”</h2>
        </div>
        <p>The transformation is not just the paint color. It is the sequence: understand the goal, prepare the surface, apply the finish carefully, respect the space and leave you with a result that feels complete.</p>
      </div>
      <div class="standard-flow" aria-label="The five parts of the Cimo Standard">
        <article class="standard-step"><span>01 / LISTEN</span><h3>Start with the feeling.</h3><p>What looks off now, what needs to change and what would make the room or property feel better?</p></article>
        <article class="standard-step"><span>02 / PREP</span><h3>Fix what paint cannot hide.</h3><p>Protect, sand, patch, repair and prime where the surface calls for it.</p></article>
        <article class="standard-step"><span>03 / PAINT</span><h3>Make the change visible.</h3><p>Clean edges, consistent coverage and attention to the details people actually notice.</p></article>
        <article class="standard-step"><span>04 / RESPECT</span><h3>Treat the space like it matters.</h3><p>Keep the work area controlled, communicate clearly and clean up as the project moves.</p></article>
        <article class="standard-step"><span>05 / REVIEW</span><h3>Leave it feeling finished.</h3><p>Walk the agreed scope, address the details and make sure the refresh lands the way it should.</p></article>
      </div>
      <div class="feel-shift" aria-label="Cimo moves a space from tired to refreshed">
        <span>Tired</span><div class="feel-bar" aria-hidden="true"></div><span>Refreshed</span>
      </div>`;
  }

  const more = $('.secondary-services');
  if (more) {
    more.innerHTML = `
      <div class="refresh-intro">
        <p class="eyebrow">Finish the refresh</p>
        <h2>Paint changes the space.<br>A deep clean can complete the reset.</h2>
        <p>When the project needs more than a new color, Cimo can help leave the space feeling finished instead of halfway done.</p>
      </div>
      <div class="secondary-list">
        <article><span>01</span><h3>Deep Cleaning</h3><p>For the built-up dust, grime and overlooked details that keep a freshly updated space from feeling truly fresh.</p></article>
        <article><span>02</span><h3>Move-In / Move-Out</h3><p>A cleaner handoff before the boxes come in, after they go out or when a property needs a real reset.</p></article>
      </div>`;
  }

  const closing = $('#contact');
  if (closing) {
    closing.innerHTML = `
      <p class="eyebrow light">Free Rochester-area estimate</p>
      <h2>What do you want<br>to feel different?</h2>
      <p class="closing-copy">Tell Cimo what you want to change. Justin will follow up directly to talk through the project, timing and the best next step.</p>
      <button class="button button-light estimate-open">Get My Free Estimate ↗</button>
      <div class="closing-contact"><a href="${tel}">Call ${phone}</a><span>or</span><a href="${sms}">Text ${phone}</a></div>`;
  }

  const footerContact = $('footer > div:nth-child(4)');
  if (footerContact) {
    footerContact.innerHTML = `<strong>Contact</strong><button class="link-button estimate-open">Get a Free Estimate</button><a href="${tel}">Call ${phone}</a><a href="${sms}">Text ${phone}</a>`;
  }

  const mobileConversion = $('.mobile-conversion');
  if (mobileConversion) {
    mobileConversion.innerHTML = `<a href="${tel}">Call</a><a href="${sms}">Text</a><button type="button" class="estimate-open">Free Estimate</button>`;
  }

  const guardrail = $('.assistant-guardrail');
  if (guardrail) guardrail.innerHTML = `Prefer to talk? <a href="${tel}">Call</a> or <a href="${sms}">text ${phone}</a>.`;

  const fallback = $('.estimate-config-fallback');
  if (fallback) {
    const title = $('h3', fallback);
    const phoneLink = $('.fallback-phone', fallback);
    const copy = $('p', fallback);
    if (title) title.textContent = 'Call or Text Cimo for a Free Estimate';
    if (phoneLink) phoneLink.textContent = phone;
    if (copy) copy.innerHTML = `Online requests are not connected yet. <a href="${tel}">Call</a> or <a href="${sms}">text Cimo</a> directly and we’ll get you taken care of.`;
  }
}

applyContentRefresh();

const menuToggle = $('.menu-toggle');
const nav = $('#site-nav');
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});
$$('#site-nav a, #site-nav button').forEach((item) => item.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));
$('#year').textContent = new Date().getFullYear();

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
  }, { threshold: 0.08 });
  $$('.reveal').forEach((el) => reveal.observe(el));
} else {
  $$('.reveal').forEach((el) => el.classList.add('visible'));
}

$$('img').forEach((img) => img.addEventListener('error', () => img.classList.add('image-unavailable')));

const palette = [
  ['Warm Whites', 'Soft Ivory', '#eee8dc'],
  ['Warm Whites', 'Warm Linen', '#ddd1bd'],
  ['Warm Whites', 'Porcelain', '#f3eee4'],
  ['Cool Whites', 'Cloud White', '#e7ebea'],
  ['Cool Whites', 'Quiet Frost', '#dce3e2'],
  ['Cool Whites', 'Pale Mist', '#d9dfdc'],
  ['Neutrals', 'Stone', '#aaa091'],
  ['Neutrals', 'Mushroom', '#918476'],
  ['Neutrals', 'Pewter', '#777773'],
  ['Neutrals', 'Sand', '#c3af91'],
  ['Warm Earth', 'Terracotta', '#a85e49'],
  ['Warm Earth', 'Clay', '#bd8068'],
  ['Warm Earth', 'Canyon', '#855142'],
  ['Warm Earth', 'Ochre', '#aa7b43'],
  ['Greens', 'Sage', '#89927a'],
  ['Greens', 'Olive', '#687052'],
  ['Greens', 'Forest', '#394c3d'],
  ['Blues', 'Coastal Blue', '#66899a'],
  ['Blues', 'Slate Blue', '#526b7a'],
  ['Blues', 'Deep Navy', '#263947'],
  ['Deep Colors', 'Charcoal', '#343534'],
  ['Deep Colors', 'Brick', '#853b32'],
  ['Deep Colors', 'Plum', '#59404f'],
  ['Deep Colors', 'Ink', '#252a30']
];
