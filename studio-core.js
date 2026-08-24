const Studio = (() => {
  const canvas = $('#studio-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d', { willReadFrequently: true });
  const paintLayer = document.createElement('canvas');
  const paintCtx = paintLayer.getContext('2d');
  const selectionLayer = document.createElement('canvas');
  const selectionCtx = selectionLayer.getContext('2d');
  const proxy = document.createElement('canvas');
  const proxyCtx = proxy.getContext('2d', { willReadFrequently: true });
  const proxyMask = document.createElement('canvas');
  const proxyMaskCtx = proxyMask.getContext('2d', { willReadFrequently: true });

  let source = null;
  let original = null;
  let color = '#a85e49';
  let colorName = 'Terracotta';
  let tool = 'smart';
  let drawing = false;
  let history = [];
  let previewBlob = null;
  let renderQueued = false;
  let showSelection = false;
  let hasMask = false;

  function status(message) { $('#studio-status').textContent = message; }
  function resizeAuxiliary(width, height) {
    for (const c of [mask, paintLayer, selectionLayer]) { c.width = width; c.height = height; }
  }
  function configureProxy() {
    const max = 700;
    const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
    proxy.width = Math.max(1, Math.round(canvas.width * scale));
    proxy.height = Math.max(1, Math.round(canvas.height * scale));
    proxyMask.width = proxy.width;
    proxyMask.height = proxy.height;
    proxyCtx.clearRect(0, 0, proxy.width, proxy.height);
    proxyCtx.drawImage(source, 0, 0, proxy.width, proxy.height);
    proxyMaskCtx.clearRect(0, 0, proxy.width, proxy.height);
  }
  function setControlsEnabled(enabled) {
    $('#studio-controls').disabled = !enabled;
    $('#studio-controls').classList.toggle('ready', enabled);
    $('.studio-disabled-hint').hidden = enabled;
    if (enabled) $('#mobile-studio-bar').hidden = false;
  }
  function snapshot() {
    if (!source) return;
    const scale = 0.5;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(mask.width * scale));
    c.height = Math.max(1, Math.round(mask.height * scale));
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(mask, 0, 0, c.width, c.height);
    history.push({ width: c.width, height: c.height, data: cctx.getImageData(0, 0, c.width, c.height) });
    if (history.length > 6) history.shift();
    $('#undo').disabled = history.length < 2;
  }
  function restoreSnapshot(snapshotData) {
    const c = document.createElement('canvas');
    c.width = snapshotData.width;
    c.height = snapshotData.height;
    c.getContext('2d').putImageData(snapshotData.data, 0, 0);
    mctx.clearRect(0, 0, mask.width, mask.height);
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(c, 0, 0, mask.width, mask.height);
  }
  function buildPaintLayer() {
    paintCtx.clearRect(0, 0, paintLayer.width, paintLayer.height);
    paintCtx.globalCompositeOperation = 'source-over';
    paintCtx.globalAlpha = 1;
    paintCtx.filter = 'none';
    paintCtx.fillStyle = color;
    paintCtx.fillRect(0, 0, paintLayer.width, paintLayer.height);
    paintCtx.globalCompositeOperation = 'destination-in';
    paintCtx.filter = 'blur(1.5px)';
    paintCtx.drawImage(mask, 0, 0);
    paintCtx.filter = 'none';
    paintCtx.globalCompositeOperation = 'source-over';
  }
  function buildSelectionLayer() {
    selectionCtx.clearRect(0, 0, selectionLayer.width, selectionLayer.height);
    selectionCtx.globalCompositeOperation = 'source-over';
    selectionCtx.fillStyle = '#25c9e8';
    selectionCtx.fillRect(0, 0, selectionLayer.width, selectionLayer.height);
    selectionCtx.globalCompositeOperation = 'destination-in';
    selectionCtx.drawImage(mask, 0, 0);
    selectionCtx.globalCompositeOperation = 'source-over';
  }
  function renderInto(targetCtx, split = Number($('#compare-range').value), includeSelection = showSelection) {
    if (!source) return;
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.globalAlpha = 1;
    targetCtx.clearRect(0, 0, canvas.width, canvas.height);
    targetCtx.drawImage(source, 0, 0);
    if (!hasMask || split <= 0) return;
    buildPaintLayer();
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(0, 0, canvas.width * (Math.max(0, Math.min(100, split)) / 100), canvas.height);
    targetCtx.clip();
    targetCtx.globalCompositeOperation = 'color';
    targetCtx.globalAlpha = 1;
    targetCtx.drawImage(paintLayer, 0, 0);
    targetCtx.globalCompositeOperation = 'multiply';
    targetCtx.globalAlpha = 0.18;
    targetCtx.drawImage(paintLayer, 0, 0);
    targetCtx.restore();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.globalAlpha = 1;
    if (includeSelection) {
      buildSelectionLayer();
      targetCtx.save();
      targetCtx.globalAlpha = 0.4;
      targetCtx.drawImage(selectionLayer, 0, 0);
      targetCtx.restore();
    }
  }
  function render(split = Number($('#compare-range').value)) { renderInto(ctx, split, showSelection); }
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * canvas.width / rect.width))),
      y: Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)))
    };
  }
  function updateActionState() {
    $('#reset').disabled = !hasMask;
    $('#use-preview').disabled = !hasMask;
    $('.compare-controls').hidden = !hasMask;
    $('.canvas-empty').hidden = hasMask;
  }
  function applyProxyMask(mode = 'replace') {
    if (mode === 'replace') mctx.clearRect(0, 0, mask.width, mask.height);
    mctx.save();
    mctx.imageSmoothingEnabled = true;
    mctx.globalCompositeOperation = mode === 'subtract' ? 'destination-out' : 'source-over';
    mctx.drawImage(proxyMask, 0, 0, mask.width, mask.height);
    mctx.restore();
    hasMask = maskHasPixels();
    updateActionState();
  }
  function maskHasPixels() {
    const data = mctx.getImageData(0, 0, mask.width, mask.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  }
  async function smart(x, y, event = {}) {
    if (!original) return;
    status('Finding the surface…');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const px = Math.max(0, Math.min(proxy.width - 1, Math.round(x * proxy.width / canvas.width)));
    const py = Math.max(0, Math.min(proxy.height - 1, Math.round(y * proxy.height / canvas.height)));
    const image = proxyCtx.getImageData(0, 0, proxy.width, proxy.height);
    const data = image.data;
    const start = (py * proxy.width + px) * 4;
    const target = [data[start], data[start + 1], data[start + 2]];
    const tolerance = Number($('#tolerance').value);
    const threshold = Math.pow(tolerance * 2.35, 2);
    const seen = new Uint8Array(proxy.width * proxy.height);
    const stackX = new Int32Array(proxy.width * proxy.height * 4);
    const stackY = new Int32Array(proxy.width * proxy.height * 4);
    let top = 0;
    stackX[top] = px; stackY[top] = py; top++;
    const out = proxyMaskCtx.createImageData(proxy.width, proxy.height);
    while (top) {
      top--;
      const cx = stackX[top];
      const cy = stackY[top];
      if (cx < 0 || cy < 0 || cx >= proxy.width || cy >= proxy.height) continue;
      const q = cy * proxy.width + cx;
      if (seen[q]) continue;
      seen[q] = 1;
      const i = q * 4;
      const dr = data[i] - target[0];
      const dg = data[i + 1] - target[1];
      const db = data[i + 2] - target[2];
      const dist = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
      if (dist > threshold) continue;
      out.data[i] = 255; out.data[i + 1] = 255; out.data[i + 2] = 255; out.data[i + 3] = 255;
      if (top + 4 >= stackX.length) continue;
      stackX[top] = cx + 1; stackY[top++] = cy;
      stackX[top] = cx - 1; stackY[top++] = cy;
      stackX[top] = cx; stackY[top++] = cy + 1;
      stackX[top] = cx; stackY[top++] = cy - 1;
    }
    proxyMaskCtx.clearRect(0, 0, proxy.width, proxy.height);
    proxyMaskCtx.putImageData(out, 0, 0);
    const mode = event.altKey ? 'subtract' : (event.shiftKey ? 'add' : 'replace');
    applyProxyMask(mode);
    snapshot();
    render();
    status(mode === 'subtract' ? 'Selection removed. Refine it if needed.' : 'Surface selected. Pick a color or refine the selection.');
  }
  function paintAt(event) {
    if (!original) return;
    const p = point(event);
    mctx.save();
    mctx.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.arc(p.x, p.y, Number($('#brush-size').value) / 2, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
    hasMask = true;
    updateActionState();
    scheduleRender();
  }
  async function load(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { status('Please choose a JPEG, PNG or WebP image.'); return; }
    if (file.size > 10 * 1024 * 1024) { status('That photo is larger than 10 MB. Please choose a smaller image.'); return; }
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      resizeAuxiliary(canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      source = document.createElement('canvas');
      source.width = canvas.width; source.height = canvas.height;
      source.getContext('2d').drawImage(canvas, 0, 0);
      original = ctx.getImageData(0, 0, canvas.width, canvas.height);
      mctx.clearRect(0, 0, mask.width, mask.height);
      history = []; hasMask = false; snapshot(); configureProxy();
      $('.canvas-wrap').hidden = false;
      $('#upload-zone').classList.add('compact');
      setControlsEnabled(true); updateActionState(); render();
      status('Photo ready. Tap a wall to select a surface.');
    } catch { status('We couldn’t open that photo. Please try another JPEG, PNG or WebP image.'); }
  }
  function setColor(name, hex) {
    colorName = name; color = hex.toLowerCase();
    $$('.swatch').forEach((button) => button.classList.toggle('selected', button.dataset.color === color));
    $$('.mobile-swatch').forEach((button) => button.classList.toggle('selected', button.dataset.color === color));
    $('.active-color-swatch').style.background = color;
    $('#active-color strong').textContent = colorName;
    $('#active-color small').textContent = color.toUpperCase();
    $('.mobile-active-color span').style.background = color;
    render();
  }
  function setTool(nextTool) {
    tool = nextTool;
    $$('.tool').forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $$('[data-mobile-tool]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mobileTool === tool)));
  }
  function setView(value) {
    $('#compare-range').value = String(value);
    $('#show-original').setAttribute('aria-pressed', String(value === 0));
    $('#show-preview').setAttribute('aria-pressed', String(value === 100));
    render(value);
  }
  function setSelectionVisible(value) { showSelection = value; render(); }
  function undo() {
    if (history.length < 2) return;
    history.pop(); restoreSnapshot(history.at(-1));
    hasMask = maskHasPixels(); updateActionState();
    $('#undo').disabled = history.length < 2; render();
  }
  function reset() {
    mctx.clearRect(0, 0, mask.width, mask.height);
    proxyMaskCtx.clearRect(0, 0, proxyMask.width, proxyMask.height);
    history = []; hasMask = false; snapshot(); updateActionState();
    $('#undo').disabled = true; $('#show-selection').checked = false; showSelection = false;
    setView(100); status('Selection cleared. Tap a wall to start again.');
  }
  async function exportPreview() {
    if (!hasMask) return null;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = canvas.width; previewCanvas.height = canvas.height;
    renderInto(previewCanvas.getContext('2d'), 100, false);
    const max = 1600;
    const width = Math.min(max, canvas.width * 2);
    const half = Math.floor(width / 2);
    const height = Math.max(1, Math.round(canvas.height * (half / canvas.width)));
    const output = document.createElement('canvas');
    output.width = width; output.height = height;
    const out = output.getContext('2d');
    out.drawImage(source, 0, 0, half, height);
    out.drawImage(previewCanvas, half, 0, half, height);
    out.fillStyle = 'rgba(20,19,17,.82)'; out.fillRect(0, 0, 94, 30); out.fillRect(half, 0, 94, 30);
    out.fillStyle = '#fff'; out.font = '700 12px sans-serif'; out.fillText('ORIGINAL', 12, 20); out.fillText('PREVIEW', half + 12, 20);
    previewBlob = await new Promise((resolve) => output.toBlob(resolve, 'image/jpeg', 0.84));
    return { blob: previewBlob, color: `${colorName} / ${color.toUpperCase()}`, surface: $('#surface-notes').value.trim() };
  }

  canvas.addEventListener('pointerdown', async (event) => {
    if (!original) return;
    if (tool === 'smart') { const p = point(event); await smart(p.x, p.y, event); return; }
    drawing = true; canvas.classList.add('editing'); canvas.setPointerCapture(event.pointerId); snapshot(); paintAt(event);
  });
  canvas.addEventListener('pointermove', (event) => drawing && tool !== 'smart' && paintAt(event));
  const endDrawing = () => {
    if (drawing && tool !== 'smart') snapshot();
    drawing = false; canvas.classList.remove('editing');
  };
  canvas.addEventListener('pointerup', endDrawing);
  canvas.addEventListener('pointercancel', endDrawing);
  canvas.addEventListener('dragover', (event) => event.preventDefault());
  canvas.addEventListener('drop', async (event) => {
    event.preventDefault();
    try {
      const dropped = JSON.parse(event.dataTransfer.getData('text/plain'));
      setColor(dropped.name, dropped.color);
      const p = point(event); await smart(p.x, p.y, event);
    } catch { status('Choose a color from the palette, then try again.'); }
  });

  return { load, setColor, setTool, setView, setSelectionVisible, render, undo, reset, exportPreview };
})();
