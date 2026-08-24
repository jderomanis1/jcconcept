'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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

const serviceImages = [
  {
    id: 'photo-1652829069629-959f8927f608',
    alt: 'Professional painter working on an interior wall'
  },
  {
    id: 'photo-1742900280864-bcc27353ceba',
    alt: 'Professional painter coating the exterior of a house from a ladder'
  },
  {
    id: 'photo-1768839725085-829e6ac7ac26',
    alt: 'Wall repair and surface preparation with putty knives'
  },
  {
    id: 'photo-1652829069834-2c05031199c5',
    alt: 'Professional painter preparing a roller at an active job site'
  }
];
$$('.service-card img').forEach((img, index) => {
  const replacement = serviceImages[index];
  if (!replacement) return;
  const base = `https://images.unsplash.com/${replacement.id}`;
  img.src = `${base}?auto=format&fit=crop&w=1000&q=82`;
  img.srcset = `${base}?auto=format&fit=crop&w=640&q=80 640w, ${base}?auto=format&fit=crop&w=1000&q=82 1000w, ${base}?auto=format&fit=crop&w=1400&q=84 1400w`;
  img.alt = replacement.alt;
});

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
