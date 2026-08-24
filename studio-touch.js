'use strict';

(() => {
  const canvas = document.querySelector('#studio-canvas');
  const wrap = document.querySelector('.canvas-wrap');
  const status = document.querySelector('#studio-status');
  if (!canvas || !wrap || typeof Studio === 'undefined') return;

  if (typeof window.createImageBitmap !== 'function') {
    window.createImageBitmap = async (file) => {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.decoding = 'async';
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = url;
        });
        return image;
      } finally {
        URL.revokeObjectURL(url);
      }
    };
  }

  const originalLoad = Studio.load.bind(Studio);
  Studio.load = async (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      if (status) status.textContent = 'Please choose a photo from your camera roll or files.';
      return;
    }
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return originalLoad(file);

    let url = '';
    try {
      url = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = 'async';
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      const max = 1800;
      const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
      const temp = document.createElement('canvas');
      temp.width = Math.max(1, Math.round(image.naturalWidth * scale));
      temp.height = Math.max(1, Math.round(image.naturalHeight * scale));
      temp.getContext('2d').drawImage(image, 0, 0, temp.width, temp.height);
      const blob = await new Promise((resolve) => temp.toBlob(resolve, 'image/jpeg', .92));
      if (!blob) throw new Error('conversion failed');
      return originalLoad(new File([blob], 'cimo-upload.jpg', { type: 'image/jpeg' }));
    } catch {
      if (status) status.textContent = 'That photo format could not be opened. Try exporting it as JPEG, PNG or WebP.';
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  let scale = 1;
  let x = 0;
  let y = 0;
  let mode = 'smart';
  const pointers = new Map();
  let gestureStart = null;

  function clampView() {
    const maxX = Math.max(0, canvas.clientWidth * (scale - 1) / 2);
    const maxY = Math.max(0, canvas.clientHeight * (scale - 1) / 2);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
  }
  function applyView() {
    clampView();
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  function resetView() {
    scale = 1; x = 0; y = 0; pointers.clear(); gestureStart = null; applyView();
    if (status && !wrap.hidden) status.textContent = 'View reset. Choose Select, Add or Remove to continue.';
  }
  function setMode(next) {
    mode = next;
    canvas.style.touchAction = next === 'smart' ? 'pan-y' : 'none';
    if (next === 'pan' && status) status.textContent = 'Move mode: drag to pan. Pinch with two fingers to zoom.';
  }

  document.querySelectorAll('[data-mobile-tool], .tool').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mobileTool || button.dataset.tool || 'smart')));
  document.querySelector('[data-mobile-action="undo"]')?.addEventListener('click', () => document.querySelector('#undo')?.click());
  document.querySelector('[data-mobile-action="reset"]')?.addEventListener('click', () => document.querySelector('#reset')?.click());
  document.querySelector('[data-mobile-action="fit"]')?.addEventListener('click', resetView);

  const desktopUndo = document.querySelector('#undo');
  const desktopReset = document.querySelector('#reset');
  const mobileUndo = document.querySelector('[data-mobile-action="undo"]');
  const mobileReset = document.querySelector('[data-mobile-action="reset"]');
  const mirrorDisabled = () => {
    if (mobileUndo && desktopUndo) mobileUndo.disabled = desktopUndo.disabled;
    if (mobileReset && desktopReset) mobileReset.disabled = desktopReset.disabled;
  };
  mirrorDisabled();
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(mirrorDisabled);
    if (desktopUndo) observer.observe(desktopUndo, { attributes: true, attributeFilter: ['disabled'] });
    if (desktopReset) observer.observe(desktopReset, { attributes: true, attributeFilter: ['disabled'] });
    new MutationObserver(resetView).observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
  }

  function metrics() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return { distance: Math.hypot(b.x - a.x, b.y - a.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (mode !== 'pan' || event.pointerType !== 'touch') return;
    event.preventDefault(); event.stopImmediatePropagation();
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const m = metrics();
    gestureStart = m ? { ...m, scale, x, y } : { oneX: event.clientX, oneY: event.clientY, x, y, scale };
  }, true);
  canvas.addEventListener('pointermove', (event) => {
    if (mode !== 'pan' || event.pointerType !== 'touch' || !pointers.has(event.pointerId)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const m = metrics();
    if (m && gestureStart?.distance) {
      scale = Math.max(1, Math.min(4, gestureStart.scale * (m.distance / gestureStart.distance)));
      x = gestureStart.x + (m.midX - gestureStart.midX);
      y = gestureStart.y + (m.midY - gestureStart.midY);
    } else if (pointers.size === 1 && gestureStart?.oneX != null) {
      x = gestureStart.x + (event.clientX - gestureStart.oneX);
      y = gestureStart.y + (event.clientY - gestureStart.oneY);
    }
    applyView();
  }, true);
  function endPointer(event) {
    if (mode !== 'pan' || event.pointerType !== 'touch') return;
    event.preventDefault(); event.stopImmediatePropagation();
    pointers.delete(event.pointerId);
    const remaining = [...pointers.values()][0];
    gestureStart = remaining ? { oneX: remaining.x, oneY: remaining.y, x, y, scale } : null;
  }
  canvas.addEventListener('pointerup', endPointer, true);
  canvas.addEventListener('pointercancel', endPointer, true);
  setMode('smart');
})();
