const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
  toggle.querySelector('.sr-only').textContent = open ? 'Open menu' : 'Close menu';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
}));

const compare = document.querySelector('.compare');
compare.querySelector('input').addEventListener('input', event => compare.style.setProperty('--position', `${event.target.value}%`));

// Preserve each visual frame if a remote concept image is temporarily unavailable.
document.querySelectorAll('img').forEach(image => {
  const markUnavailable = () => image.classList.add('image-unavailable');
  image.addEventListener('error', markUnavailable);
  if (image.complete && image.naturalWidth === 0) markUnavailable();
});

const dialog = document.querySelector('#estimate-dialog');
document.querySelectorAll('.estimate-open').forEach(button => button.addEventListener('click', () => dialog.showModal()));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
} else document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
document.querySelector('#year').textContent = new Date().getFullYear();
