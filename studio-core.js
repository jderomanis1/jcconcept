/* Cimo Color Studio: deterministic, local-only image operations.
 * Selection is color/edge assisted, not semantic AI. Unselected pixels are never changed.
 * UMD keeps the same engine testable in Node and usable without a bundler in browsers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CimoPaint = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  function hexRGB(hex) {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new TypeError('Use a six-digit hex color.');
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  }
  function luminance(data, i) { return .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]; }
  function referenceLight(data, mask) {
    const bins = new Uint32Array(256); let count = 0;
    for (let p = 0; p < mask.length; p++) if (mask[p] > 127) { bins[Math.round(luminance(data, p * 4))]++; count++; }
    if (!count) return 180;
    let sum = 0;
    for (let i = 0; i < 256; i++) { sum += bins[i]; if (sum >= count * .6) return Math.max(12, i); }
    return 180;
  }
  /** Rebuild from original every time. No destructive cumulative blending. */
  function recolor(data, surfaces) {
    const out = new Uint8ClampedArray(data);
    for (const surface of surfaces) {
      if (!surface.enabled) continue;
      if (surface.mask.length * 4 !== data.length) throw new RangeError('Mask dimensions do not match the image.');
      const rgb = hexRGB(surface.color);
      const ref = surface.reference || referenceLight(data, surface.mask);
      for (let p = 0; p < surface.mask.length; p++) {
        const alpha = surface.mask[p] / 255;
        if (!alpha) continue; // Strict outside-mask invariant, including alpha.
        const i = p * 4;
        const shade = clamp((luminance(data, i) + 12) / (ref + 12), .22, 1.45);
        for (let c = 0; c < 3; c++) out[i + c] = out[i + c] * (1 - alpha) + clamp(rgb[c] * shade, 0, 255) * alpha;
      }
    }
    return out;
  }
  /** Three opponent-color components. Chroma gets more weight than brightness.
   * A fixed seed bound prevents gradual drift; a local edge gate stops hard borders. */
  function colorFeatures(data, width, height) {
    const n = width * height;
    if (data.length !== n * 4) throw new RangeError('Image dimensions do not match its data.');
    const out = new Float32Array(n * 3);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const i = (yy * width + xx) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      r /= count; g /= count; b /= count;
      const j = (y * width + x) * 3;
      out[j] = .2126 * r + .7152 * g + .0722 * b;
      out[j + 1] = r - g; out[j + 2] = b - g;
    }
    return out;
  }
  function selectRegion(features, width, height, x, y, tolerance = 18) {
    const n = width * height;
    if (features.length !== n * 3) throw new RangeError('Selection features do not match dimensions.');
    const start = clamp(Math.floor(y), 0, height - 1) * width + clamp(Math.floor(x), 0, width - 1);
    const seed = start * 3, mask = new Uint8Array(n), seen = new Uint8Array(n), queue = new Int32Array(n);
    let head = 0, tail = 1, count = 0;
    queue[0] = start; seen[start] = 1;
    const limit = clamp(tolerance, 5, 45), edgeLimit = Math.max(5, limit * .7);
    const distance = (a, b) => {
      const l = (features[a] - features[b]) * .46;
      const u = features[a + 1] - features[b + 1], v = features[a + 2] - features[b + 2];
      return l * l + u * u + v * v;
    };
    while (head < tail) {
      const p = queue[head++]; mask[p] = 255; count++;
      const px = p % width;
      for (const q of [px ? p - 1 : -1, px < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < n - width ? p + width : -1]) {
        if (q < 0 || seen[q]) continue;
        if (distance(q * 3, seed) > limit * limit) { seen[q] = 1; continue; }
        // Do not mark an edge-rejected pixel seen: another same-surface route may reach it.
        if (distance(q * 3, p * 3) > edgeLimit * edgeLimit) continue;
        seen[q] = 1; queue[tail++] = q;
      }
    }
    return { mask, count, fraction: count / n };
  }
  function combineMask(target, other, subtract = false) {
    if (target.length !== other.length) throw new RangeError('Mask sizes differ.');
    for (let i = 0; i < target.length; i++) target[i] = subtract ? Math.round(target[i] * (1 - other[i] / 255)) : Math.max(target[i], other[i]);
    return target;
  }
  function hasPixels(mask) { return mask.some(a => a > 0); }
  function cloneScene(scene) {
    return { active: scene.active, surfaces: scene.surfaces.map(s => ({ ...s, mask: s.mask.slice() })) };
  }
  return Object.freeze({ clamp, hexRGB, luminance, referenceLight, recolor, colorFeatures, selectRegion, combineMask, hasPixels, cloneScene });
});
