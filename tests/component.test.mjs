// UI component mode: templates, states, 9-slice (math, guides, undo), save format, export files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

test('ui component mode', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = collectErrors(page);
    await page.goto(webTestPage());
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.saved = []; window.offerFiles = async files => { window.saved.push(...files); }; });

    // switching mode shows the component tab; a template builds one frame per state
    await page.click('#modeSwitch [data-mode=comp]');
    const ui0 = await page.evaluate(() => ({ mode: ui.mode, tab: !$('#tabComp').hidden && !$('#pComp').hidden, kinds: document.querySelectorAll('#pComp .compkind').length, asks: !!document.querySelector('#pComp .btn.primary') }));
    assert.deepEqual(ui0, { mode: 'comp', tab: true, kinds: 8, asks: true });
    await page.click('#pComp .compkind >> nth=0');
    const btn = await page.evaluate(() => ({ w: doc.w, h: doc.h, states: doc.frames.map(f => f.name), slice: doc.comp.slice, kind: doc.comp.kind,
      labels: [...document.querySelectorAll('#frameList .fn.st')].map(e => e.textContent), previews: document.querySelectorAll('#compPrev canvas').length,
      // every state is drawn, and differs from the others
      distinct: new Set(doc.frames.map((f, i) => Array.from(composite(i)).join())).size }));
    assert.deepEqual(btn, { w: 24, h: 12, states: ['기본', '호버', '누름', '비활성'], slice: { l: 3, t: 2, r: 3, b: 3 }, kind: 'button', labels: ['기본', '호버', '누름', '비활성'], previews: 4, distinct: 4 });

    // 9-slice keeps corners and edge thickness exactly
    const ns = await page.evaluate(() => {
      const src = composite(0), s = doc.comp.slice, out = nineSlice(src, doc.w, doc.h, s, 60, 30);
      const px = (d, w, x, y) => Array.from(d.slice((y * w + x) * 4, (y * w + x) * 4 + 4)).join();
      let corners = 0; for (let y = 0; y < s.t; y++) for (let x = 0; x < s.l; x++) {
        if (px(out.data, 60, x, y) === px(src, doc.w, x, y)) corners++;                                   // top-left
        if (px(out.data, 60, 59 - x, 29 - y) === px(src, doc.w, doc.w - 1 - x, doc.h - 1 - y)) corners++; } // bottom-right mirror
      const bottomEdge = [...Array(60).keys()].slice(s.l, 60 - s.r).every(x => px(out.data, 60, x, 29) === px(src, doc.w, s.l, doc.h - 1));
      return { size: [out.w, out.h], corners, want: s.t * s.l * 2, bottomEdge };
    });
    assert.deepEqual(ns.size, [60, 30]); assert.equal(ns.corners, ns.want, 'corners copied 1:1'); assert.ok(ns.bottomEdge, 'bottom edge stretched, not scaled');

    // dragging the left guide on the canvas changes the slice; one undo restores it
    const g = await page.evaluate(() => { const r = view.getBoundingClientRect(); return { x: r.left + ui.panX + doc.comp.slice.l * ui.zoom, y: r.top + ui.panY + doc.h * ui.zoom / 2, z: ui.zoom }; });
    await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x + g.z * 3, g.y, { steps: 5 }); await page.mouse.up();
    const drag = await page.evaluate(() => { const after = doc.comp.slice.l; undo(); return { after, undone: doc.comp.slice.l }; });
    assert.deepEqual(drag, { after: 6, undone: 3 }, 'guide drag is one undo step and does not paint');
    assert.equal(await page.evaluate(() => doc.frames[0].cels[1].filter(v => v).length), await page.evaluate(() => compTemplateDoc('button', compBase()).frames[0].cels[1].filter(v => v).length), 'no pixels drawn by the guide drag');

    // number inputs, state rename, save format (version 3) round trip, version 2 files still open
    const fmt = await page.evaluate(() => {
      setSlice('t', 4); const t = doc.comp.slice.t;
      docChange(() => { doc.frames[1].name = '마우스 올림'; }); ui.frame = 1; addFrame('empty');
      const o = JSON.parse(serialize()); const d = deserialize(o);
      const v2 = JSON.parse(serialize()); v2.version = 2; delete v2.comp; v2.frames.forEach(f => delete f.name); const old = deserialize(v2);
      return { t, version: o.version, comp: d.comp, names: d.frames.map(f => f.name), oldComp: 'comp' in old, oldNames: old.frames.map(f => f.name || null) };
    });
    assert.deepEqual(fmt, { t: 4, version: 3, comp: { kind: 'button', slice: { l: 3, t: 4, r: 3, b: 3 }, label: '버튼' }, names: ['기본', '마우스 올림', '상태 5', '누름', '비활성'],
      oldComp: false, oldNames: [null, null, null, null, null] });

    // export: one PNG per state, JSON with the slice, CSS with border-image and state selectors
    const ex = await page.evaluate(async () => {
      undo(); undo(); undo();   // back to the four template states and slice t=2
      saved.length = 0; await exportComponent(4);
      const json = JSON.parse(saved.find(f => f.filename.endsWith('.ui.json')).data), css = saved.find(f => f.filename.endsWith('.css')).data;
      return { files: saved.map(f => f.filename), slice: json.sliceScaled, states: json.states.map(s => s.selector), css };
    });
    assert.deepEqual(ex.files, ['버튼-기본@4x.png', '버튼-호버@4x.png', '버튼-누름@4x.png', '버튼-비활성@4x.png', '버튼.ui.json', '버튼.css']);
    assert.deepEqual(ex.slice, { left: 12, top: 8, right: 12, bottom: 12 });
    assert.deepEqual(ex.states, [null, ':hover', ':active', ':disabled']);
    assert.match(ex.css, /\.px-button\{border-style:solid;border-width:8px 12px 12px 12px;border-image:url\("버튼-기본@4x\.png"\) 8 12 12 12 fill stretch/);
    assert.match(ex.css, /\.px-button:hover\{border-image-source:url\("버튼-호버@4x\.png"\)\}/);
    assert.match(ex.css, /\.px-button:disabled\{/);

    // a fixed-size template (checkbox) exports a plain background, the export dialog offers the component first
    const fixed = await page.evaluate(async () => {
      startTemplate('checkbox'); saved.length = 0; await exportComponent(2); const css = saved.find(f => f.filename.endsWith('.css')).data;
      exportDialog(); const first = document.querySelector('input[name=ex]:checked').value; closeModal();
      return { slice: doc.comp.slice, css: /width:20px;height:20px;border:0;background:url/.test(css) && /\[aria-checked="true"\]/.test(css), first };
    });
    assert.deepEqual(fixed, { slice: null, css: true, first: 'component' });

    // "use the current drawing" turns any art into a component; switching back hides the tab
    const conv = await page.evaluate(() => { replaceDoc(sampleDoc()); const before = !!doc.comp; makeComponentFromArt(); const c = doc.comp; setMode('dot');
      return { before, slice: c.slice, names: doc.frames.map(f => f.name), tabHidden: $('#tabComp').hidden, mode: document.documentElement.dataset.mode }; });
    assert.deepEqual(conv, { before: false, slice: { l: 4, t: 4, r: 4, b: 4 }, names: ['기본', '상태 2'], tabHidden: true, mode: 'dot' });

    await page.evaluate(() => setMode('comp'));
    await page.setViewportSize({ width: 400, height: 860 }); await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no horizontal scroll at phone width in component mode');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
