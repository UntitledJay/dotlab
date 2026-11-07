// V1 features: frame tags, linked cels, .aseprite import/export, timelapse, colour style transfer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { join } from 'node:path';
import { launch, webTestPage, collectErrors, root } from './helpers.mjs';

const require = createRequire(import.meta.url);
const Aseprite = require('ase-parser');

// A tiny independent .aseprite writer (RGBA) used only to feed the importer cases our own writer never produces.
function rgbaAseprite() {
  const out = []; const u8 = v => out.push(v & 255), u16 = v => out.push(v & 255, (v >> 8) & 255), u32 = v => out.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
  const str = s => { const b = Buffer.from(s, 'utf8'); u16(b.length); out.push(...b); }; const zero = k => { for (let i = 0; i < k; i++) out.push(0); };
  const patch = (at, v) => { out[at] = v & 255; out[at + 1] = (v >>> 8) & 255; out[at + 2] = (v >>> 16) & 255; out[at + 3] = (v >>> 24) & 255; };
  const W = 8, H = 6;
  u32(0); u16(0xA5E0); u16(2); u16(W); u16(H); u16(32); u32(1); u16(100); u32(0); u32(0); u8(0); zero(3); u16(0); u8(1); u8(1); u16(0); u16(0); u16(16); u16(16); zero(84);
  const frame = (dur, chunks) => { const s = out.length; u32(0); u16(0xF1FA); u16(chunks.length); u16(dur); zero(2); u32(chunks.length); for (const c of chunks) { const cs = out.length; u32(0); c(); patch(cs, out.length - cs); } patch(s, out.length - s); };
  const layer = (name, type, child) => () => { u16(0x2004); u16(1 | 2); u16(type); u16(child); u16(0); u16(0); u16(0); u8(255); zero(3); str(name); };
  const px = (r, g, b, a) => [r, g, b, a];
  const raw = (li, x, y, w, h, pixels) => () => { u16(0x2005); u16(li); u16(x); u16(y); u8(255); u16(0); u16(0); zero(5); u16(w); u16(h); for (const p of pixels) out.push(...p); };
  const comp = (li, x, y, w, h, pixels) => () => { u16(0x2005); u16(li); u16(x); u16(y); u8(255); u16(2); u16(0); zero(5); u16(w); u16(h); out.push(...zlib.deflateSync(Buffer.from(pixels.flat()))); };
  const link = (li, f) => () => { u16(0x2005); u16(li); u16(0); u16(0); u8(255); u16(1); u16(0); zero(5); u16(f); };
  const tags = () => { u16(0x2018); u16(1); zero(8); u16(0); u16(1); u8(2); u16(0); zero(6); u8(200); u8(40); u8(90); u8(0); str('run'); };
  const red = px(220, 40, 60, 255), blue = px(40, 90, 220, 255), half = px(250, 250, 250, 120), clear = px(0, 0, 0, 0);
  // layers: group G > child A, then B
  frame(100, [layer('G', 1, 0), layer('A', 0, 1), layer('B', 0, 0), tags, raw(1, 1, 1, 2, 2, [red, red, red, half]), comp(2, 4, 2, 3, 1, [blue, clear, blue])]);
  frame(150, [link(1, 0), comp(2, 5, 3, 1, 1, [blue])]);
  patch(0, out.length);
  return out;
}


// Hidden group with a child, a visible top layer, and a ping-pong-reverse tag whose colour lives in a user data chunk (Aseprite 1.3+).
function groupAseprite() {
  const out = []; const u8 = v => out.push(v & 255), u16 = v => out.push(v & 255, (v >> 8) & 255), u32 = v => out.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
  const str = s => { const b = Buffer.from(s, 'utf8'); u16(b.length); out.push(...b); }; const zero = k => { for (let i = 0; i < k; i++) out.push(0); };
  const patch = (at, v) => { out[at] = v & 255; out[at + 1] = (v >>> 8) & 255; out[at + 2] = (v >>> 16) & 255; out[at + 3] = (v >>> 24) & 255; };
  u32(0); u16(0xA5E0); u16(1); u16(4); u16(4); u16(32); u32(1); u16(100); u32(0); u32(0); u8(0); zero(3); u16(0); u8(1); u8(1); u16(0); u16(0); u16(16); u16(16); zero(84);
  const chunks = [
    () => { u16(0x2004); u16(2); u16(1); u16(0); u16(0); u16(0); u16(0); u8(255); zero(3); str('숨긴 그룹'); },   // flags 2 = editable, not visible
    () => { u16(0x2004); u16(3); u16(0); u16(1); u16(0); u16(0); u16(0); u8(255); zero(3); str('그룹 안'); },
    () => { u16(0x2004); u16(3); u16(0); u16(0); u16(0); u16(0); u16(0); u8(255); zero(3); str('밖'); },
    () => { u16(0x2005); u16(1); u16(0); u16(0); u8(255); u16(0); u16(0); zero(5); u16(1); u16(1); out.push(10, 20, 30, 255); },
    () => { u16(0x2018); u16(1); zero(8); u16(0); u16(0); u8(3); u16(0); zero(6); u8(0); u8(0); u8(0); u8(0); str('되감기'); },
    () => { u16(0x2020); u32(2); u8(12); u8(34); u8(56); u8(255); }];
  const s = out.length; u32(0); u16(0xF1FA); u16(chunks.length); u16(100); zero(2); u32(chunks.length);
  for (const c of chunks) { const cs = out.length; u32(0); c(); patch(cs, out.length - cs); }
  patch(s, out.length - s); patch(0, out.length);
  return out;
}

test('v1 features', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = collectErrors(page);
    await page.goto(webTestPage());
    await page.waitForTimeout(400);

    // ---- linked cels and tags
    const links = await page.evaluate(() => {
      const r = {};
      r.sampleLinked = doc.frames[0].cels[1] === doc.frames[1].cels[1];
      ui.layer = 0; gotoFrame(1); addFrame('link');                     // frame 3 shares every cel with frame 2
      const id = activeLayer().id; r.newLinked = doc.frames[2].cels[id] === doc.frames[1].cels[id];
      r.tagGrew = doc.tags[0].to;                                         // tag 1-2 should now be 1-3
      beginEdit(); cel()[0] = 12; endEdit(); r.editShared = doc.frames[0].cels[id][0] === 12 && doc.frames[1].cels[id][0] === 12;
      undo(); r.undoShared = doc.frames[0].cels[id][0] === 0 && doc.frames[0].cels[id] === doc.frames[2].cels[id];
      unlinkCel(); r.unlinked = doc.frames[2].cels[id] !== doc.frames[1].cels[id];
      // saved projects keep links and tags
      const d = deserialize(JSON.parse(serialize()));
      r.roundLinks = d.frames[1].cels[id] === d.frames[0].cels[id] && d.frames[2].cels[id] !== d.frames[1].cels[id];
      r.roundTags = JSON.stringify(d.tags);
      // a shared cel is remapped once when a colour is deleted (values above shift by exactly one)
      const before = doc.frames[0].cels[id].filter(v => v === 9).length; deleteColor(5);
      r.remapOnce = doc.frames[0].cels[id].filter(v => v === 8).length === before && doc.frames[0].cels[id] === doc.frames[1].cels[id];
      undo();
      // deleting a frame inside a tag shrinks it
      gotoFrame(2); delFrame(); r.tagAfterDelete = [doc.tags[0].from, doc.tags[0].to];
      r.pingpong = playSequence({ from: 0, to: 3, dir: 'pingpong' }).join(',');
      r.reverse = playSequence({ from: 1, to: 3, dir: 'reverse' }).join(',');
      return r;
    });
    assert.deepEqual(links, { sampleLinked: true, newLinked: true, tagGrew: 2, editShared: true, undoShared: true, unlinked: true, roundLinks: true,
      roundTags: '[{"name":"보글보글","from":0,"to":2,"dir":"forward","color":"#3549d6"}]', remapOnce: true, tagAfterDelete: [0, 1], pingpong: '0,1,2,3,2,1', reverse: '3,2,1' });

    // tag-range GIF has the tag's frame sequence (ping-pong expanded)
    const gifFrames = await page.evaluate(async () => {
      addFrame('dup'); saveTag({ name: '왕복', from: 0, to: 1, dir: 'pingpong', color: TAGCOLORS[1] }, 0);
      const count = async seq => { const dec = new ImageDecoder({ data: buildGIF(1, seq).buffer, type: 'image/gif' }); await dec.tracks.ready; return dec.tracks.selectedTrack.frameCount; };
      return [await count(null), await count(playSequence({ from: 0, to: 2, dir: 'pingpong' }))];
    });
    assert.deepEqual(gifFrames, [3, 4]);

    // ---- .aseprite export: an independent parser reads it, and DotLab reads it back identically
    await page.evaluate(() => { addFrame('link'); ui.layer = 0; beginEdit(); cel()[17] = 3; endEdit(); doc.layers[0].opacity = 0.5; doc.layers[1].visible = false; saveTag({ name: 'run', from: 1, to: 2, dir: 'reverse', color: '#1f9d55' }); });
    const exported = await page.evaluate(async () => Array.from(await docToAseprite()));
    const ase = new Aseprite(Buffer.from(exported), 'x.aseprite'); ase.parse();
    const docInfo = await page.evaluate(() => ({ w: doc.w, frames: doc.frames.map(f => f.dur), layers: doc.layers.map(L => L.name), pal: doc.palette.length, tags: doc.tags.map(t => t.name) }));
    assert.equal(ase.width, docInfo.w); assert.equal(ase.colorDepth, 8);
    assert.deepEqual(ase.frames.map(f => f.frameDuration), docInfo.frames, 'durations');
    assert.deepEqual(ase.layers.map(l => l.name), docInfo.layers, 'layer names');
    assert.equal(ase.palette.colors.length, docInfo.pal + 1, 'palette incl. transparent index');
    assert.deepEqual(ase.tags.map(t => t.name), docInfo.tags, 'tags');
    assert.equal(ase.layers[0].opacity, 128); assert.equal(ase.layers[1].flags.visible, false);
    const linkedCel = ase.frames[1].cels.find(c => c.layerIndex === 0);
    assert.equal(linkedCel.celType, 1, 'shared cel written as a linked cel');
    const back = await page.evaluate(async bytes => {
      const { doc: d, warnings } = await asepriteToDoc(new Uint8Array(bytes), 'back');
      const same = d.frames.every((f, fi) => d.layers.every((L, k) => eqArr(f.cels[L.id], doc.frames[fi].cels[doc.layers[k].id])));
      return { same, pal: d.palette.join() === doc.palette.join(), tags: JSON.stringify(d.tags) === JSON.stringify(doc.tags), link: d.frames[1].cels[1] === d.frames[0].cels[1],
        layers: d.layers.map(L => [L.name, L.visible, Math.round(L.opacity * 100)]), warnings };
    }, exported);
    assert.deepEqual(back, { same: true, pal: true, tags: true, link: true, layers: [['예시 · 병', true, 50], ['예시 · 거품', false, 100]], warnings: [] });

    // ---- .aseprite import of a file saved by Aseprite itself (indexed, with a Background layer)
    const real = readFileSync(join(root, 'node_modules/ase-parser/indexed.aseprite'));
    const ref = new Aseprite(real, 'indexed.aseprite'); ref.parse();
    const expect = ref.layers.map((L, li) => { const c = ref.frames[0].cels.find(x => x.layerIndex === li); const bg = !!L.flags.background; return Array.from(c.rawCelData, k => (k === ref.paletteIndex && !bg) ? null : ref.palette.colors[k]).map(c => c && [c.red, c.green, c.blue]); });
    const got = await page.evaluate(async bytes => { const { doc: d } = await asepriteToDoc(new Uint8Array(bytes), 'indexed'); const p = d.palette.map(hex2rgb); return { w: d.w, layers: d.layers.map(L => L.name), px: d.layers.map(L => Array.from(d.frames[0].cels[L.id], v => v ? p[v - 1] : null)) }; }, Array.from(real));
    assert.equal(got.w, 256); assert.deepEqual(got.layers, ['Background', 'Layer 1']);
    for (let li = 0; li < 2; li++) { let bad = 0; for (let i = 0; i < expect[li].length; i++) if (JSON.stringify(expect[li][i]) !== JSON.stringify(got.px[li][i])) bad++; assert.equal(bad, 0, `layer ${li} pixels match the reference parser`); }

    // ---- .aseprite import: RGBA, group, raw + compressed + linked cels, tag
    const rg = await page.evaluate(async bytes => { const { doc: d, warnings } = await asepriteToDoc(new Uint8Array(bytes), 'rgba');
      const p = d.palette.map(hex2rgb), at = (L, f, x, y) => { const v = d.frames[f].cels[L][y * d.w + x]; return v ? rgb2hex(...p[v - 1]) : null; };
      return { layers: d.layers.map(L => L.name), linked: d.frames[1].cels[1] === d.frames[0].cels[1], a: [at(1, 0, 1, 1), at(1, 0, 2, 2), at(1, 1, 2, 1)], b0: [at(2, 0, 4, 2), at(2, 0, 5, 2), at(2, 0, 6, 2)], b1: at(2, 1, 5, 3),
        durs: d.frames.map(f => f.dur), tags: d.tags, warnings }; }, rgbaAseprite());
    assert.deepEqual(rg.layers, ['A', 'B']); assert.ok(rg.linked, 'linked cel shares data');
    assert.deepEqual(rg.a, ['#dc283c', null, '#dc283c'], 'alpha 120 (< half) becomes transparent'); assert.deepEqual(rg.b0, ['#285adc', null, '#285adc']); assert.equal(rg.b1, '#285adc');
    assert.deepEqual(rg.durs, [100, 150]);
    assert.deepEqual(rg.tags, [{ name: 'run', from: 0, to: 1, dir: 'pingpong', color: '#c8285a' }]);
    assert.deepEqual(rg.warnings, ['그룹은 풀어서 가져왔습니다', '반투명 픽셀은 불투명도 절반을 기준으로 불투명하거나 투명하게 바꿨습니다']);

    // ---- timelapse records each step and encodes a GIF with one frame per step
    const tl = await page.evaluate(async () => { replaceDoc(makeDoc(16, 16, PRESETS['PICO-8 (16색)'], 'tl')); for (let i = 0; i < 5; i++) { beginEdit(); cel()[i * 17] = 8; endEdit(); }
      const dec = new ImageDecoder({ data: buildTimelapseGIF(2).buffer, type: 'image/gif' }); await dec.tracks.ready; return [TL.snaps.length, dec.tracks.selectedTrack.frameCount]; });
    assert.deepEqual(tl, [6, 6]);

    // ---- colour style transfer keeps brightness order and is undoable
    const xf = await page.evaluate(async () => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16; const c = cv.getContext('2d'); ['#061a40', '#0353a4', '#006daa', '#b9d6f2'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 16, 0, 16, 16); });
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = cv.toDataURL(); }); await setRefImage(im);
      const before = doc.palette.slice(); applyXfer();
      const rank = pal => pal.map(hex2rgb).map((c, i) => [lum(c), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).join();
      const blueish = doc.palette.map(hex2rgb).filter(([r, g, b]) => b >= r).length;
      const r = { sameOrder: rank(before) === rank(doc.palette), blueish, n: doc.palette.length }; undo(); r.undone = doc.palette.join() === before.join(); return r;
    });
    assert.ok(xf.sameOrder, 'brightness order kept'); assert.ok(xf.blueish >= xf.n - 2, 'palette takes the blue mood'); assert.ok(xf.undone);

    // ---- sprite sheet JSON carries tags
    const tagsJson = await page.evaluate(() => { doc.tags = [{ name: 'walk', from: 0, to: 0, dir: 'forward', color: '#3549d6' }]; return doc.tags.map(t => ({ name: t.name, from: t.from, to: t.to, direction: t.dir, color: t.color + 'ff' })); });
    assert.equal(tagsJson[0].direction, 'forward');

    // ---- .aseprite: hidden groups hide their layers, tag colour from user data, ping-pong reverse
    const grp = await page.evaluate(async bytes => { const { doc: d } = await asepriteToDoc(new Uint8Array(bytes), 'g'); return { layers: d.layers.map(L => `${L.name}:${L.visible}`), tag: d.tags[0] }; }, groupAseprite());
    assert.deepEqual(grp, { layers: ['그룹 안:false', '밖:true'], tag: { name: '되감기', from: 0, to: 0, dir: 'pingpong_reverse', color: '#0c2238' } });
    assert.equal(await page.evaluate(() => playSequence({ from: 0, to: 3, dir: 'pingpong_reverse' }).join(',')), '3,2,1,0,1,2');

    // ---- .aseprite export: tag colours and ping-pong reverse survive, an empty linked cel stays linked
    const out2 = await page.evaluate(async () => {
      replaceDoc(makeDoc(8, 8, PRESETS['PICO-8 (16색)'], 'link')); addLayer(); ui.layer = 0; beginEdit(); cel()[9] = 2; endEdit();
      ui.layer = 1; addFrame('link');                                   // layer 2 is empty and linked across both frames
      saveTag({ name: '되감기', from: 0, to: 1, dir: 'pingpong_reverse', color: '#d6345a' });
      const bytes = await docToAseprite(); const { doc: d } = await asepriteToDoc(bytes, 'b');
      return { bytes: Array.from(bytes), tags: d.tags, emptyLinked: d.frames[0].cels[2] === d.frames[1].cels[2], drawnLinked: d.frames[0].cels[1] === d.frames[1].cels[1] };
    });
    assert.deepEqual(out2.tags, [{ name: '되감기', from: 0, to: 1, dir: 'pingpong_reverse', color: '#d6345a' }]);
    assert.ok(out2.emptyLinked && out2.drawnLinked, 'linked cels, empty or not, stay linked');
    const ase2 = new Aseprite(Buffer.from(out2.bytes), 'y.aseprite'); ase2.parse();
    assert.equal(ase2.tags[0].name, '되감기'); assert.equal(ase2.tags[0].color, 'd6345a');
    assert.equal(ase2.frames[1].cels.filter(c => c.celType === 1).length, 2, 'both layers linked in frame 2');

    // ---- timelapse marks AI steps with a badge in the corner
    const aiStep = await page.evaluate(async () => {
      replaceDoc(makeDoc(16, 16, PRESETS['PICO-8 (16색)'], 'ai')); ui.layer = 0; beginEdit(); cel()[100] = 8; endEdit();
      candApply({ x: 4, y: 4, w: 2, h: 1, data: new Uint8Array([3, 3]) });
      const flags = TL.snaps.map(s => s.ai);
      const dec = new ImageDecoder({ data: buildTimelapseGIF(8).buffer, type: 'image/gif' }); await dec.tracks.ready;
      const px = async i => { const { image } = await dec.decode({ frameIndex: i }); const c = new OffscreenCanvas(image.displayWidth, image.displayHeight).getContext('2d'); c.drawImage(image, 0, 0); image.close(); return Array.from(c.getImageData(1, 1, 1, 1).data); };
      return { flags, last: await px(flags.length - 1), first: await px(0) };
    });
    assert.deepEqual(aiStep.flags, [false, false, true]);
    assert.deepEqual(aiStep.last, [40, 40, 48, 255], 'AI badge on the AI step');
    assert.equal(aiStep.first[3], 0, 'no badge on hand-drawn steps');

    // ---- colour transfer 'mood' mode: previews the art and keeps each colour's role
    const mood = await page.evaluate(() => {
      replaceDoc(sampleDoc()); $('#xferMode').value = 'mood'; renderXfer();
      const previews = document.querySelectorAll('#xferPrev .xarts canvas').length, before = doc.palette.slice();
      const blue = pal => pal.map(hex2rgb).reduce((s, [r, , b]) => s + b - r, 0) / pal.length;
      applyXfer(); const r = { previews, bluer: blue(doc.palette) > blue(before) + 30, darkest: lum(hex2rgb(doc.palette[0])) < 60 };
      undo(); r.undone = doc.palette.join() === before.join(); $('#xferMode').value = 'rank'; return r;
    });
    assert.deepEqual(mood, { previews: 2, bluer: true, darkest: true, undone: true });
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
