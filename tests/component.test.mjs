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
    assert.deepEqual(fmt, { t: 4, version: 3, comp: { kind: 'button', slice: { l: 3, t: 4, r: 3, b: 3 }, label: '버튼', lock: true, fill: 'stretch', padAuto: true, pad: { l: 4, t: 2, r: 4, b: 3 }, opts: { w: 24, h: 12, radius: 1, border: 1, depth: 2, base: '#3d7be0' } }, names: ['기본', '마우스 올림', '상태 5', '누름', '비활성'],
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

    /* ---------- corners locked, inside editable ---------- */
    const lock = await page.evaluate(() => {
      setMode('comp'); startTemplate('button'); ui.layer = 0; ui.frame = 0; const c = () => cel(); const before = c().slice();
      beginEdit(); for (const [x, y] of [[0, 0], [1, 5], [23, 11], [12, 0], [12, 11]]) plot(c(), x, y, 5); endEdit();
      const edgesKept = eqArr(c(), before);
      beginEdit(); plot(c(), 10, 6, 5); endEdit(); const inside = c()[6 * 24 + 10] === 5;
      // flood fill from the inside cannot leak into the edges either
      beginEdit(); flood(10, 6, 7, true); endEdit(); const s = doc.comp.slice; let leaked = 0;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 24; x++) { const out = x < s.l || y < s.t || x >= 24 - s.r || y >= 12 - s.b; if (out && c()[y * 24 + x] !== before[y * 24 + x]) leaked++; }
      setCompFlag('lock', false); beginEdit(); plot(c(), 12, 0, 5); endEdit(); const unlocked = c()[12] === 5;
      // the lock only applies in component mode
      setCompFlag('lock', true); setMode('dot'); beginEdit(); plot(c(), 13, 0, 5); endEdit(); const dotMode = c()[13] === 5; setMode('comp');
      return { edgesKept, inside, leaked, unlocked, dotMode };
    });
    assert.deepEqual(lock, { edgesKept: true, inside: true, leaked: 0, unlocked: true, dotMode: true });

    /* ---------- generation options redraw every state, one undo step ---------- */
    const gen = await page.evaluate(() => {
      startTemplate('button'); docChange(() => { doc.comp.label = '확인'; doc.frames[1].name = '호버'; });
      regenComp({ w: 40, h: 16, radius: 3 });
      const a = { size: [doc.w, doc.h], states: doc.frames.length, slice: doc.comp.slice, pad: doc.comp.pad, label: doc.comp.label, cornerEmpty: doc.frames[0].cels[1][0] === 0 && doc.frames[0].cels[1][41] === 0 };
      regenComp({ border: 2 }); const ink = doc.frames[0].cels[1][8 * 40 + 0], ink2 = doc.frames[0].cels[1][8 * 40 + 1];
      a.border2 = ink === ink2 && ink !== doc.frames[0].cels[1][8 * 40 + 2];
      undo(); undo(); a.undone = [doc.w, doc.h, doc.comp.opts.radius];
      // a hand-set content area survives a redraw; 「모양에 맞게」 resets it
      setPad('l', 7); regenComp({ depth: 0 }); a.keptPad = [doc.comp.pad.l, doc.comp.padAuto];
      return a;
    });
    assert.deepEqual(gen, { size: [40, 16], states: 4, slice: { l: 5, t: 4, r: 5, b: 4 }, pad: { l: 6, t: 4, r: 6, b: 4 }, label: '확인', cornerEmpty: true, border2: true, undone: [24, 12, 1], keptPad: [7, false] });

    /* ---------- tiled middle, content area in CSS ---------- */
    const tile = await page.evaluate(async () => {
      startTemplate('panel'); const s = doc.comp.slice;
      const src = new Uint8ClampedArray(doc.w * doc.h * 4); for (let x = 0; x < doc.w; x++) src[(s.t * doc.w + x) * 4] = x;   // red channel = source x
      const t = nineSlice(src, doc.w, doc.h, s, 60, 40, 'tile'), st = nineSlice(src, doc.w, doc.h, s, 60, 40, 'stretch');
      const row = o => Array.from({ length: 60 }, (_, x) => o.data[(s.t * 60 + x) * 4]);
      const cn = doc.w - s.l - s.r, tr = row(t), sr = row(st);
      const repeats = tr.slice(s.l, s.l + cn).join() === tr.slice(s.l + cn, s.l + 2 * cn).join(), stretched = sr[s.l] === sr[s.l + 1];
      setCompFlag('fill', 'tile'); setPad('l', 6); saved.length = 0; await exportComponent(2);
      const css = saved.find(f => f.filename.endsWith('.css')).data, json = JSON.parse(saved.find(f => f.filename.endsWith('.ui.json')).data);
      return { repeats, stretched, round: / fill round;/.test(css), padding: css.match(/padding:([^;}]+)/)[1], content: json.content, fill: json.fill };
    });
    assert.deepEqual(tile, { repeats: true, stretched: true, round: true, padding: '0px 2px 0px 6px', content: { left: 6, top: 2, right: 4, bottom: 2 }, fill: 'tile' });

    /* ---------- 「내 컴포넌트」 library ---------- */
    const lib = await page.evaluate(async () => {
      localStorage.removeItem('dotlab.library'); renderComp();
      startTemplate('button'); docChange(() => { doc.name = '확인 버튼'; }); libSave(false);
      const a = { n1: libLoad().length, btn: [...document.querySelectorAll('#pComp .btn.primary')].map(b => b.textContent).includes('덮어 저장') };
      beginEdit(); plot(cel(), 10, 6, 5); endEdit(); libSave(false); a.n2 = libLoad().length;                               // overwrite
      const saved1 = deserialize(JSON.parse(libLoad()[0].data)); a.overwrote = saved1.frames[0].cels[1][6 * 24 + 10] === 5;
      docChange(() => { doc.name = '취소 버튼'; }); libSave(true); a.n3 = libLoad().length; a.names = libLoad().map(e => e.name);
      a.items = document.querySelectorAll('#pComp .libitem').length;
      startTemplate('panel'); libOpen(libLoad()[1].id); a.opened = [doc.name, doc.w, doc.comp.libId === libLoad()[1].id, cel()[6 * 24 + 10]];
      // file round trip: export, then import adds copies with new ids
      saved.length = 0; libExport(); const file = JSON.parse(saved[0].data); a.file = [saved[0].filename, file.format, file.items.length];
      libImport(file); a.n4 = libLoad().length; a.unique = new Set(libLoad().map(e => e.id)).size;
      // opening the library file through 「열기」 imports it too
      await handleFile(new File([JSON.stringify(file)], 'dotlab-components.json')); a.n5 = libLoad().length;
      // delete through the dialog
      libDelete(libLoad()[0].id); [...document.querySelectorAll('#mActions button')].find(b => b.textContent === '삭제').click(); a.n6 = libLoad().length;
      return a;
    });
    assert.deepEqual(lib, { n1: 1, btn: true, n2: 1, overwrote: true, n3: 2, names: ['취소 버튼', '확인 버튼'], items: 2, opened: ['확인 버튼', 24, true, 5], file: ['dotlab-components.json', 'dotlab-library', 2], n4: 4, unique: 4, n5: 6, n6: 5 });

    await page.evaluate(() => setMode('comp'));
    await page.setViewportSize({ width: 400, height: 860 }); await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no horizontal scroll at phone width in component mode');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
