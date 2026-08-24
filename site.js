'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const menuToggle = $('.menu-toggle');
const menuText = menuToggle?.querySelector('.sr-only');
const nav = $('#site-nav');

function setMenuState(open) {
  menuToggle?.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('open', open);
  if (menuText) menuText.textContent = open ? 'Close menu' : 'Open menu';
}

menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  setMenuState(!open);
});

$$('#site-nav a, #site-nav button').forEach((item) => item.addEventListener('click', () => setMenuState(false)));

const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
  }, { threshold: 0.08 });
  $$('.reveal').forEach((el) => reveal.observe(el));
} else {
  $$('.reveal').forEach((el) => el.classList.add('visible'));
}

$$('img').forEach((img) => img.addEventListener('error', () => img.classList.add('image-unavailable')));

const studioStatus = $('#studio-status');
if (studioStatus && 'MutationObserver' in window) {
  const normalizeStudioLanguage = () => {
    if (/\bwall\b/i.test(studioStatus.textContent)) {
      studioStatus.textContent = studioStatus.textContent.replace(/\bwall\b/gi, 'area');
    }
  };
  normalizeStudioLanguage();
  new MutationObserver(normalizeStudioLanguage).observe(studioStatus, { childList: true, characterData: true, subtree: true });
}

const navLinks = $$('#site-nav a[href^="#"]');
const observedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && navLinks.length && observedSections.length) {
  const activeNav = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${visible.target.id}`;
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5] });

  observedSections.forEach((section) => activeNav.observe(section));
}

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
