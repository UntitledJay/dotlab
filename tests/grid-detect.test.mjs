// Image → pixel: the original pixel grid must be recovered exactly from upscaled, shifted and JPEG-compressed copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

test('grid detection recovers original pixel art', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = collectErrors(page);
    await page.goto(webTestPage());
    await page.waitForTimeout(400);
    const res = await page.evaluate(async () => {
      function art(w, h, seed, alpha) {
        let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        const pal = [[20, 20, 30], [230, 60, 70], [250, 210, 90], [60, 140, 220], [90, 200, 120], [245, 245, 240]];
        const g = new Array(w * h).fill(alpha ? -1 : 0);
        for (let k = 0; k < 14; k++) { const x0 = Math.floor(rnd() * w), y0 = Math.floor(rnd() * h), ww = 1 + Math.floor(rnd() * w / 3), hh = 1 + Math.floor(rnd() * h / 3), c = Math.floor(rnd() * 6); for (let y = y0; y < Math.min(h, y0 + hh); y++) for (let x = x0; x < Math.min(w, x0 + ww); x++) g[y * w + x] = c; }
        for (let k = 0; k < w * h / 6; k++) g[Math.floor(rnd() * w * h)] = Math.floor(rnd() * 6);
        return { w, h, g, pal };
      }
      async function render(a, scale, cropX, cropY, type, q) {
        const W = Math.round(a.w * scale), H = Math.round(a.h * scale);
        const cv = document.createElement('canvas'); cv.width = W - cropX; cv.height = H - cropY; const c = cv.getContext('2d');
        if (type === 'image/jpeg') { c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); }
        for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const v = a.g[y * a.w + x]; if (v < 0) continue; c.fillStyle = `rgb(${a.pal[v]})`; const x0 = Math.round(x * scale) - cropX, y0 = Math.round(y * scale) - cropY, x1 = Math.round((x + 1) * scale) - cropX, y1 = Math.round((y + 1) * scale) - cropY; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
        const blob = await new Promise(r => cv.toBlob(r, type, q)); return new File([blob], 't.' + (type === 'image/jpeg' ? 'jpg' : 'png'), { type });
      }
      function score(a) {
        const c = doc.frames[0].cels[doc.layers[0].id]; let ok = 0, n = 0; const ox = a.w - doc.w, oy = a.h - doc.h;
        for (let y = 0; y < doc.h; y++) for (let x = 0; x < doc.w; x++) { const ov = a.g[(y + oy) * a.w + x + ox], v = c[y * doc.w + x]; n++; if (ov < 0) { if (!v) ok++; continue; } if (v && cdist(palRGB[v - 1], a.pal[ov]) < 2500) ok++; }
        return ok / n;
      }
      const cases = [
        ['x7 PNG, cropped 3px', art(24, 18, 11), 7, 3, 3, 'image/png'],
        ['x8 JPEG q0.75', art(32, 32, 5), 8, 0, 0, 'image/jpeg', .75],
        ['x2.5 non-integer', art(40, 30, 9), 2.5, 0, 0, 'image/png'],
        ['x4 transparent', art(20, 20, 3, true), 4, 0, 0, 'image/png'],
        ['x1 native', art(48, 40, 21), 1, 0, 0, 'image/png'],
        ['x12 JPEG q0.6 cropped 5px', art(16, 16, 77), 12, 5, 0, 'image/jpeg', .6],
      ];
      const out = [];
      for (const [name, a, sc, cx, cy, type, q] of cases) {
        await setConvImage(await render(a, sc, cx, cy, type, q)); convOpenNew();
        out.push({ name, size: doc.w + 'x' + doc.h, expect: a.w + 'x' + a.h, acc: score(a), colors: doc.palette.length });
      }
      const cv = document.createElement('canvas'); cv.width = 900; cv.height = 600; const c = cv.getContext('2d');
      const gr = c.createLinearGradient(0, 0, 900, 600); gr.addColorStop(0, '#2a6'); gr.addColorStop(1, '#e83'); c.fillStyle = gr; c.fillRect(0, 0, 900, 600);
      for (let i = 0; i < 300; i++) { c.fillStyle = `hsl(${i * 37 % 360},60%,${30 + i % 50}%)`; c.beginPath(); c.arc((i * 97) % 900, (i * 53) % 600, 5 + i % 30, 0, 7); c.fill(); }
      await setConvImage(new File([await new Promise(r => cv.toBlob(r, 'image/jpeg', .85))], 'photo.jpg', { type: 'image/jpeg' }));
      return { cases: out, photo: conv.det.kind };
    });
    for (const c of res.cases) {
      assert.equal(c.size, c.expect, c.name + ': size');
      assert.equal(c.acc, 1, c.name + ': every pixel matches');
      assert.ok(c.colors <= 8, c.name + ': palette stays small (' + c.colors + ')');
    }
    assert.equal(res.photo, 'photo', 'a photo falls back to photo mode');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
