// V1 features in the web build: linked cels, frame tags, .aseprite import/export, timelapse, colour transfer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

test('v1 features', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = collectErrors(page);
    await page.goto(webTestPage());
    await page.waitForTimeout(400);
    // capture files instead of saving them
    await page.evaluate(() => { window.saved = []; window.offerFiles = async files => { window.saved.push(...files); }; });

    /* ---------- linked cels ---------- */
    const link = await page.evaluate(() => {
      ui.frame = 0; ui.layer = 0; renderLayers();
      document.getElementById('frLink').click();               // frame 0 → linked copy at 1
      const shared = doc.frames.length === 3 && doc.frames[0].cels[1] === doc.frames[1].cels[1] && doc.frames[0].cels[2] === doc.frames[1].cels[2];
      const marks = document.querySelectorAll('#frameList .fcell .lk').length;
      ui.frame = 1; beginEdit(); cel()[0] = 5; endEdit();
      const drawnBoth = doc.frames[0].cels[1][0] === 5 && doc.frames[2].cels[1][0] === 0;
      undo(); const undone = doc.frames[0].cels[1][0] === 0 && doc.frames[0].cels[1] === doc.frames[1].cels[1];
      const rt = deserialize(JSON.parse(serialize()));
      const keptLink = rt.frames[0].cels[1] === rt.frames[1].cels[1] && rt.frames[0].cels[1] !== rt.frames[2].cels[1] && eqArr(rt.frames[1].cels[1], doc.frames[1].cels[1]);
      // deleting an unused colour remaps a shared cel only once
      const before = Array.from(composite(0)); deleteColor(2); const remapOk = eqArr(before, Array.from(composite(0))); undo();
      // merging keeps frames 0 and 1 linked
      ui.layer = 1; mergeDown(); const mergedLinked = doc.frames[0].cels[1] === doc.frames[1].cels[1] && doc.frames[1].cels[1] !== doc.frames[2].cels[1]; undo();
      ui.frame = 1; ui.layer = 0; unlinkCel(); const unlinked = doc.frames[0].cels[1] !== doc.frames[1].cels[1] && eqArr(doc.frames[0].cels[1], doc.frames[1].cels[1]); undo();
      // version 1 files still open
      const v1 = JSON.parse(serialize()); v1.version = 1; delete v1.tags; v1.frames = v1.frames.map(f => ({ dur: f.dur, cels: Object.fromEntries(Object.entries(f.cels).map(([k, v]) => [k, typeof v === 'number' ? rle(doc.frames[v].cels[k]) : v])) }));
      const old = deserialize(v1); const v1ok = old.frames.length === 3 && Array.isArray(old.tags) && old.tags.length === 0 && eqArr(old.frames[1].cels[1], doc.frames[1].cels[1]);
      return { shared, marks, drawnBoth, undone, keptLink, remapOk, mergedLinked, unlinked, v1ok };
    });
    assert.deepEqual(link, { shared: true, marks: 2, drawnBoth: true, undone: true, keptLink: true, remapOk: true, mergedLinked: true, unlinked: true, v1ok: true });

    /* ---------- frame tags ---------- */
    const tags = await page.evaluate(async () => {
      docChange(() => { doc.tags = [{ name: '걷기', from: 1, to: 2, dir: 'forward', color: '#3d8be8' }]; });
      const bar = document.querySelectorAll('#frameList .tagbar').length;
      ui.frame = 0; addFrame(false); const grew = JSON.stringify([doc.tags[0].from, doc.tags[0].to]);   // insert before → shifts
      ui.frame = 2; addFrame(false); const inside = doc.tags[0].to;                                      // insert inside → grows
      ui.frame = 3; delFrame(); const shrunk = doc.tags[0].to;
      const rt = deserialize(JSON.parse(serialize())).tags[0];
      for (const f of doc.frames) f.dur = 20;
      ui.frame = 2; const seen = new Set(); play(); await new Promise(r => { const t = setInterval(() => seen.add(ui.playFrame), 5); setTimeout(() => { clearInterval(t); r(); }, 300); }); stopPlay();
      saved.length = 0; await exportSheet(1); const meta = JSON.parse(saved.find(f => f.filename.endsWith('.json')).data).meta;
      return { bar, grew, inside, shrunk, rt: rt.name + rt.from + rt.to, loop: [...seen].sort().join(','), sheet: meta.frameTags.map(t => `${t.name}:${t.from}-${t.to}`).join() };
    });
    assert.deepEqual(tags, { bar: 1, grew: '[2,3]', inside: 4, shrunk: 3, rt: '걷기23', loop: '2,3', sheet: '걷기:2-3' });

    /* ---------- .aseprite ---------- */
    const ase = await page.evaluate(async () => {
      doc.layers[0].name = '몸통 레이어'; doc.layers[1].opacity = 0.5; doc.layers[1].visible = false; doc.frames[1].dur = 250;
      const bytes = await writeAseprite();
      const { doc: d } = await readAseprite(bytes.buffer.slice(0), 'x');
      const same = d.frames.every((f, i) => doc.layers.every((L, li) => eqArr(f.cels[d.layers[li].id], doc.frames[i].cels[L.id])));
      const links = doc.frames.map((f, i) => doc.layers.map(L => linkSource(i, L.id)).join()).join('|');
      const dlinks = d.frames.map((f, i) => d.layers.map(L => { const c = f.cels[L.id]; return d.frames.findIndex(g => g.cels[L.id] === c); }).join()).join('|');
      return { same, pal: d.palette.join() === doc.palette.join(), names: d.layers.map(L => L.name).join(), vis: d.layers.map(L => L.visible).join(), op: Math.round(d.layers[1].opacity * 100),
        durs: d.frames.map(f => f.dur).join() === doc.frames.map(f => f.dur).join(), tags: JSON.stringify(d.tags) === JSON.stringify(doc.tags), links: links === dlinks, magic: bytes[4] | bytes[5] << 8 };
    });
    assert.deepEqual(ase, { same: true, pal: true, names: '몸통 레이어,예시 · 거품', vis: 'true,false', op: 50, durs: true, tags: true, links: true, magic: 0xA5E0 });

    // an RGBA file written independently: hidden group, raw and compressed cels, negative offsets, a linked cel, tag colour in user data
    const rgba = await page.evaluate(async () => {
      const te = new TextEncoder(); const B = () => { const a = []; const o = { b: v => (a.push(v & 255), o), w: v => o.b(v).b(v >> 8), d: v => o.w(v).w(v >>> 16), z: n => { for (let i = 0; i < n; i++) a.push(0); return o; }, s: t => { const e = te.encode(t); o.w(e.length); a.push(...e); return o; }, raw: u => (a.push(...u), o), a }; return o; };
      const chunk = (type, body) => [...B().d(body.a.length + 6).w(type).a, ...body.a];
      const red = [255, 0, 0, 255], blue = [0, 0, 255, 255];
      const px = (w, h, c) => { const u = []; for (let i = 0; i < w * h; i++) u.push(...c); return u; };
      const f0 = [chunk(0x2004, B().w(0).w(1).w(0).w(0).w(0).w(0).b(255).z(3).s('그룹')),            // hidden group
        chunk(0x2004, B().w(3).w(0).w(1).w(0).w(0).w(0).b(255).z(3).s('안쪽')),                         // child of the group
        chunk(0x2004, B().w(3).w(0).w(0).w(0).w(0).w(0).b(128).z(3).s('위')),
        chunk(0x2005, B().w(1).w(-1 & 0xffff).w(0).b(255).w(0).w(0).z(5).w(3).w(2).raw(px(3, 2, red))),  // raw, x=-1
        chunk(0x2005, B().w(2).w(4).w(4).b(255).w(2).w(0).z(5).w(2).w(2).raw(await zlibDeflate(new Uint8Array(px(2, 2, blue))))),
        chunk(0x2018, B().w(1).z(8).w(0).w(1).b(2).w(0).z(6).b(0).b(0).b(0).b(0).s('idle')),
        chunk(0x2020, B().d(2).b(10).b(200).b(30).b(255))];
      const f1 = [chunk(0x2005, B().w(2).w(0).w(0).b(255).w(1).w(0).z(5).w(0))];                     // linked to frame 0
      const frame = (cs, dur) => { const body = cs.flat(); return [...B().d(16 + body.length).w(0xF1FA).w(cs.length).w(dur).z(2).d(cs.length).a, ...body]; };
      const frames = [...frame(f0, 90), ...frame(f1, 110)];
      const hd = B().d(128 + frames.length).w(0xA5E0).w(2).w(8).w(8).w(32).d(1).w(100).d(0).d(0).b(0).z(3).w(0).b(1).b(1).w(0).w(0).w(16).w(16).z(84);
      const file = new Uint8Array([...hd.a, ...frames]);
      const { doc: d } = await readAseprite(file.buffer, 'rgba');
      const at = (f, li, x, y) => { const v = d.frames[f].cels[d.layers[li].id][y * 8 + x]; return v ? d.palette[v - 1] : '-'; };
      let tooBig = ''; const big = file.slice(); big[8] = 44; big[9] = 1; try { await readAseprite(big.buffer, 'b'); } catch (e) { tooBig = e.message; }
      // open through the normal file path
      await handleFile(new File([file], '가져온.aseprite'));
      return { layers: d.layers.map(L => `${L.name}:${L.visible}`).join(), op: Math.round(d.layers[1].opacity * 100), red: [at(0, 0, 0, 0), at(0, 0, 1, 1), at(0, 0, 2, 0)].join(),
        blue: at(0, 1, 5, 5), linked: d.frames[0].cels[d.layers[1].id] === d.frames[1].cels[d.layers[1].id], durs: d.frames.map(f => f.dur).join(),
        tag: `${d.tags[0].name}:${d.tags[0].dir}:${d.tags[0].color}`, tooBig: /300×8/.test(tooBig), opened: doc.name + doc.frames.length };
    });
    assert.deepEqual(rgba, { layers: '안쪽:false,위:true', op: 50, red: '#ff0000,#ff0000,-', blue: '#0000ff', linked: true, durs: '90,110', tag: 'idle:pingpong:#0ac81e', tooBig: true, opened: '가져온2' });

    /* ---------- timelapse ---------- */
    const tl = await page.evaluate(async () => {
      replaceDoc(sampleDoc()); tlReset(); ui.layer = 0; ui.frame = 0;
      for (let i = 0; i < 3; i++) { beginEdit(); cel()[i] = 1; endEdit(); }
      candApply({ x: 0, y: 0, w: 2, h: 1, data: new Uint8Array([3, 3]) });
      const n = TL.steps.length, aiLast = TL.steps[n - 1].ai, aiFirst = TL.steps[0].ai;
      const g = buildTimelapseGIF(2, 100);
      // walk the GIF blocks and count frames
      let p = 13 + 3 * (2 << (g[10] & 7)), frames = 0;
      while (p < g.length && g[p] !== 0x3B) { if (g[p] === 0x21) { p += 2; while (g[p]) p += g[p] + 1; p++; } else if (g[p] === 0x2C) { frames++; p += 10; p++; while (g[p]) p += g[p] + 1; p++; } else break; }
      const im = new Image(); await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = URL.createObjectURL(new Blob([g], { type: 'image/gif' })); });
      saved.length = 0; exportTimelapse(2, 100); const file = saved[0]?.filename;
      return { n, aiLast, aiFirst, frames, size: [im.width, im.height].join(), file };
    });
    assert.deepEqual(tl, { n: 4, aiLast: true, aiFirst: false, frames: 4, size: '32,32', file: '물약 (예시)-timelapse.gif' });

    /* ---------- colour transfer ---------- */
    const ct = await page.evaluate(async () => {
      const cv = document.createElement('canvas'); cv.width = 40; cv.height = 20; const c = cv.getContext('2d');
      const gr = c.createLinearGradient(0, 0, 40, 0); gr.addColorStop(0, '#061a40'); gr.addColorStop(1, '#7fd8ff'); c.fillStyle = gr; c.fillRect(0, 0, 40, 20);
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = cv.toDataURL(); });
      await setRefImage(im);
      const blueness = pal => pal.map(hex2rgb).reduce((s, [r, , b]) => s + b - r, 0) / pal.length;
      const b0 = blueness(doc.palette), samples = refSamples(im);
      const mood = transferPalette(samples, 'mood', 1), swap = transferPalette(samples, 'swap', 1);
      const original = doc.palette.slice();
      document.getElementById('refColor').click();
      const preview = document.querySelectorAll('.ctprev canvas').length;
      [...document.querySelectorAll('#mActions button')].find(b => b.textContent === '적용').click();
      const applied = doc.palette.join() !== original.join(); undo(); const restored = doc.palette.join() === original.join();
      return { moodBluer: blueness(mood) > b0 + 40, swapBluer: blueness(swap) > b0 + 40, sameLength: mood.length === original.length, preview, applied, restored };
    });
    assert.deepEqual(ct, { moodBluer: true, swapBluer: true, sameLength: true, preview: 2, applied: true, restored: true });

    /* ---------- export dialog offers the new formats ---------- */
    const dlg = await page.evaluate(async () => {
      exportDialog(); const has = ['aseprite', 'timelapse'].every(v => document.querySelector(`input[name=ex][value=${v}]`));
      document.querySelector('input[name=ex][value=aseprite]').checked = true; saved.length = 0;
      [...document.querySelectorAll('#mActions button')].find(b => b.textContent === '내보내기').click();
      await new Promise(r => setTimeout(r, 300)); return { has, file: saved[0]?.filename };
    });
    assert.deepEqual(dlg, { has: true, file: '물약 (예시).aseprite' });

    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
