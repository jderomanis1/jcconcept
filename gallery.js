(() => {
  'use strict';

  const dialog = document.querySelector('#photo-dialog');
  const cards = [...document.querySelectorAll('.gallery-card')];
  const filters = document.querySelector('.gallery-filters');
  const results = document.querySelector('#gallery-results');
  if (!dialog || !cards.length || !filters || !results) return;

  const links = cards.map(card => card.querySelector('.gallery-photo')).filter(Boolean);
  const photos = links.map(link => ({
    id: link.dataset.id,
    themes: (link.dataset.themes || '').split(/\s+/).filter(Boolean),
    title: link.dataset.title,
    status: link.dataset.status,
    caption: link.dataset.caption,
    alt: link.querySelector('img')?.alt || link.dataset.title,
    src: link.getAttribute('href'),
    link,
    card: link.closest('.gallery-card')
  }));
  const byId = new Map(photos.map(photo => [photo.id, photo]));
  const allowedThemes = new Set(['all', ...photos.flatMap(photo => photo.themes)]);
  const hasTheme = (photo, value) => value === 'all' || photo.themes.includes(value);

  const image = dialog.querySelector('#viewer-image');
  const loading = dialog.querySelector('#viewer-loading');
  const error = dialog.querySelector('#viewer-error');
  const original = dialog.querySelector('#viewer-original');
  const title = dialog.querySelector('#viewer-title');
  const description = dialog.querySelector('#viewer-description');
  const status = dialog.querySelector('#viewer-status');
  const count = dialog.querySelector('#viewer-count');
  const prev = dialog.querySelector('#photo-prev');
  const next = dialog.querySelector('#photo-next');
  const close = dialog.querySelector('#photo-close');
  const home = dialog.querySelector('#viewer-home');
  const stage = dialog.querySelector('#viewer-stage');

  let theme = 'all';
  let visible = photos.slice();
  let current = -1;
  let opener = null;
  let savedScroll = 0;
  let locked = false;
  let imageToken = 0;
  let touchStartX = null;
  let touchStartY = null;

  function urlTheme() {
    const value = new URL(location.href).searchParams.get('theme') || 'all';
    return allowedThemes.has(value) ? value : 'all';
  }

  function photoFromHash() {
    const match = location.hash.match(/^#photo=(.+)$/);
    if (!match) return null;
    try { return byId.get(decodeURIComponent(match[1])) || null; }
    catch { return null; }
  }

  function updateTheme(nextTheme, { updateUrl = false } = {}) {
    theme = allowedThemes.has(nextTheme) ? nextTheme : 'all';
    visible = photos.filter(photo => hasTheme(photo, theme));
    cards.forEach(card => {
      const cardThemes = (card.dataset.themes || '').split(/\s+/).filter(Boolean);
      card.hidden = theme !== 'all' && !cardThemes.includes(theme);
    });
    filters.querySelectorAll('[data-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.theme === theme));
    });
    const label = filters.querySelector(`[data-theme="${CSS.escape(theme)}"]`)?.dataset.label || 'All work';
    results.textContent = `${visible.length} photo${visible.length === 1 ? '' : 's'} · ${label}`;
    if (updateUrl) {
      const url = new URL(location.href);
      if (theme === 'all') url.searchParams.delete('theme');
      else url.searchParams.set('theme', theme);
      url.hash = '';
      history.replaceState(history.state, '', url);
    }
  }

  function lockPage() {
    if (locked) return;
    savedScroll = window.scrollY;
    document.body.style.top = `-${savedScroll}px`;
    document.body.classList.add('gallery-open');
    locked = true;
  }

  function unlockPage({ restoreFocus = true } = {}) {
    if (!locked) return;
    document.body.classList.remove('gallery-open');
    document.body.style.top = '';
    locked = false;
    window.scrollTo(0, savedScroll);
    if (restoreFocus && opener?.isConnected) {
      requestAnimationFrame(() => {
        opener.focus({ preventScroll: true });
        window.scrollTo(0, savedScroll);
      });
    }
  }

  function render(index) {
    if (!visible.length) return;
    current = ((index % visible.length) + visible.length) % visible.length;
    const photo = visible[current];
    const token = ++imageToken;
    title.textContent = photo.title;
    description.textContent = photo.caption;
    status.textContent = photo.status;
    status.dataset.progress = String(photo.status === 'In progress');
    count.textContent = `${current + 1} / ${visible.length}`;
    const only = visible.length < 2;
    prev.disabled = only;
    next.disabled = only;
    original.href = photo.src;
    image.alt = photo.alt;
    image.hidden = true;
    loading.hidden = false;
    error.hidden = true;
    image.onload = () => {
      if (token !== imageToken) return;
      loading.hidden = true;
      error.hidden = true;
      image.hidden = false;
    };
    image.onerror = () => {
      if (token !== imageToken) return;
      loading.hidden = true;
      image.hidden = true;
      error.hidden = false;
    };
    image.src = photo.src;
  }

  function openPhoto(photo, { push = false, focusClose = true } = {}) {
    if (!photo) return;
    if (theme !== 'all' && !hasTheme(photo, theme)) updateTheme(photo.themes[0] || 'all');
    visible = photos.filter(item => hasTheme(item, theme));
    const index = visible.findIndex(item => item.id === photo.id);
    if (index < 0) return;
    if (!dialog.open) {
      lockPage();
      dialog.showModal();
    }
    render(index);
    if (push) {
      const url = new URL(location.href);
      url.hash = `photo=${encodeURIComponent(photo.id)}`;
      history.pushState({ ...(history.state || {}), cimoGalleryPhoto: true, photo: photo.id }, '', url);
    }
    if (focusClose) requestAnimationFrame(() => close.focus({ preventScroll: true }));
  }

  function closeDirect({ restoreFocus = true } = {}) {
    ++imageToken;
    image.onload = null;
    image.onerror = null;
    if (dialog.open) dialog.close();
    current = -1;
    unlockPage({ restoreFocus });
  }

  function requestClose() {
    if (history.state?.cimoGalleryPhoto && /^#photo=/.test(location.hash)) {
      history.back();
      return;
    }
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(history.state, '', url);
    closeDirect();
  }

  function move(delta) {
    if (!dialog.open || visible.length < 2) return;
    render(current + delta);
    const url = new URL(location.href);
    url.hash = `photo=${encodeURIComponent(visible[current].id)}`;
    const state = history.state?.cimoGalleryPhoto
      ? { ...(history.state || {}), cimoGalleryPhoto: true, photo: visible[current].id }
      : history.state;
    history.replaceState(state, '', url);
  }

  filters.hidden = false;
  updateTheme(urlTheme());

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-theme]');
    if (!button) return;
    if (dialog.open) closeDirect();
    updateTheme(button.dataset.theme, { updateUrl: true });
  });

  links.forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const photo = byId.get(link.dataset.id);
      openPhoto(photo, { push: true, focusClose: true });
    });
  });

  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  close.addEventListener('click', requestClose);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); return; }
    if (event.key === 'Escape') { event.preventDefault(); requestClose(); return; }
    if (event.key === 'Tab') {
      if (!event.shiftKey && document.activeElement === next) {
        event.preventDefault();
        home.focus();
      } else if (event.shiftKey && document.activeElement === home) {
        event.preventDefault();
        next.focus();
      }
    }
  });

  stage.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    touchStartX = touch?.clientX ?? null;
    touchStartY = touch?.clientY ?? null;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (touchStartX == null || touchStartY == null) return;
    const touch = event.changedTouches[0];
    const dx = (touch?.clientX ?? touchStartX) - touchStartX;
    const dy = (touch?.clientY ?? touchStartY) - touchStartY;
    touchStartX = touchStartY = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    move(dx < 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('popstate', () => {
    updateTheme(urlTheme());
    const photo = photoFromHash();
    if (photo) {
      if (!opener || !opener.isConnected) opener = photo.link;
      openPhoto(photo, { push: false, focusClose: false });
    } else {
      closeDirect();
    }
  });

  const initial = photoFromHash();
  if (initial) {
    opener = initial.link;
    openPhoto(initial, { push: false, focusClose: true });
  } else if (location.hash.startsWith('#photo=')) {
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(history.state, '', url);
  }
})();
