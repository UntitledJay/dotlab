// Core editor behaviour in the web build: drawing, pixel-perfect, undo, shapes, save/load, GIF, conversion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

test('editor core', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = collectErrors(page);
    await page.goto(webTestPage());
    await page.waitForTimeout(400);

    const init = await page.evaluate(() => ({ w: doc.w, layers: doc.layers.length, frames: doc.frames.length }));
    assert.deepEqual(init, { w: 16, layers: 2, frames: 2 }, 'sample document loads');

    const pt = (x, y) => page.evaluate(([x, y]) => { const r = view.getBoundingClientRect(); return [r.left + ui.panX + (x + .5) * ui.zoom, r.top + ui.panY + (y + .5) * ui.zoom]; }, [x, y]);
    await page.evaluate(() => { ui.primary = 12; });
    // L-shaped stroke: pixel-perfect removes the corner pixel (7 -> 6)
    let [ax, ay] = await pt(1, 1); let [bx, by] = await pt(1, 4); let [cx, cy] = await pt(4, 4);
    await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 6 }); await page.mouse.move(cx, cy, { steps: 6 }); await page.mouse.up();
    const painted = await page.evaluate(() => cel().filter(v => v === 12).length);
    assert.equal(painted, 6, 'pixel-perfect stroke');
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(() => cel().filter(v => v === 12).length), 0, 'undo clears stroke');

    // diagonal stays one pixel wide
    [ax, ay] = await pt(0, 15); [bx, by] = await pt(6, 9);
    await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 30 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => cel().filter(v => v === 12).length), 7, 'clean diagonal');

    const ops = await page.evaluate(() => {
      addLayer(); setTool('ellipse');
      beginEdit(); drag = { start: { x: 2, y: 2 }, v: 3, pts: [] }; drawShape('ellipse', { x: 10, y: 8 }, false); endEdit(); drag = null;
      const ellipse = cel().filter(v => v === 3).length;
      beginEdit(); flood(6, 5, 4, false); endEdit(); const filled = cel().filter(v => v === 4).length;
      setSel(rectMask({ x: 2, y: 2 }, { x: 10, y: 8 })); drag = { start: { x: 0, y: 0 } }; beginEdit(); drag.src = cel().slice(); drag.mask = ui.sel.slice(); applyMove(3, 3); endEdit(); drag = null;
      const moved = cel()[(5 + 3) * 16 + 6]; setSel(null);
      return { ellipse, filled, moved };
    });
    assert.ok(ops.ellipse > 10, 'ellipse drawn');
    assert.ok(ops.filled > 10, 'flood fill inside ellipse');
    assert.equal(ops.moved, 4, 'selection moved with its pixels');

    const round = await page.evaluate(() => { const d = deserialize(JSON.parse(serialize())); return d.frames.every((f, i) => d.layers.every(L => eqArr(f.cels[L.id], doc.frames[i].cels[L.id]))); });
    assert.ok(round, 'project save/load round trip');

    const gif = await page.evaluate(async () => {
      const u8 = buildGIF(4); const im = new Image();
      await new Promise((res, rej) => { im.onload = res; im.onerror = () => rej('decode'); im.src = URL.createObjectURL(new Blob([u8], { type: 'image/gif' })); });
      return [im.width, im.height];
    });
    assert.deepEqual(gif, [64, 64], 'GIF decodes at 4x');

    const lzwBad = await page.evaluate(async () => {
      const N = 64 * 64; const idx = new Uint8Array(N); for (let i = 0; i < N; i++) idx[i] = (i * 7 + (i >> 6)) % 63;
      const cols = Array.from({ length: 64 }, (_, i) => [i * 4, 255 - i * 4, (i * 37) % 256]);
      const im = new Image(); await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = URL.createObjectURL(new Blob([encodeGIF(64, 64, cols, [{ idx, delay: 10 }])])); });
      const c = document.createElement('canvas').getContext('2d'); c.canvas.width = c.canvas.height = 64; c.drawImage(im, 0, 0); const d = c.getImageData(0, 0, 64, 64).data;
      let bad = 0; for (let i = 0; i < N; i++) { const v = idx[i]; if (!v) continue; const e = cols[v]; if (d[i * 4] !== e[0] || d[i * 4 + 1] !== e[1] || d[i * 4 + 2] !== e[2]) bad++; } return bad;
    });
    assert.equal(lzwBad, 0, 'GIF LZW encoder is lossless with 63 colours');

    const undone = await page.evaluate(() => { while (hist.length) undo(); return { layers: doc.layers.length, painted: doc.frames[0].cels[2].filter(v => v === 12).length }; });
    assert.deepEqual(undone, { layers: 2, painted: 0 }, 'undo all returns to the sample');

    await page.setViewportSize({ width: 400, height: 860 });
    await page.waitForTimeout(200);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(sw <= 0, 'no horizontal scroll at phone width');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
