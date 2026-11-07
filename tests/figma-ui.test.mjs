// The plugin window inside a fake Figma host page: message protocol, SVG fidelity, re-open, import, AI over a mocked API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, root } from './helpers.mjs';

test('figma plugin UI', async () => {
  const dir = join(root, 'dist/test'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'figma-host.html'), `<!doctype html><html><body style="margin:0">
<iframe id="f" src="../figma/ui.html" style="width:1180px;height:780px;border:0;display:block"></iframe>
<script>
window.msgs=[]; const f=document.getElementById('f');
window.toUI=m=>f.contentWindow.postMessage({pluginMessage:m},'*');
addEventListener('message',e=>{ const m=e.data&&e.data.pluginMessage; if(!m) return; msgs.push(m);
  if(m.type==='ready'){ toUI({type:'init',autosave:null,apiKey:'sk-ant-test-abcd'}); toUI({type:'selection',count:1,name:'Rectangle 1',dotlab:false}); } });
</script></body></html>`);
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 780 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    let mode = 'ok', lastReq = null;
    await page.route('https://api.anthropic.com/**', route => {
      const req = route.request(); const hd = req.headers(); const body = JSON.parse(req.postData());
      lastReq = { model: body.model, stream: body.stream, key: hd['x-api-key'], cors: hd['anthropic-dangerous-direct-browser-access'], ver: hd['anthropic-version'] };
      if (mode === '401') return route.fulfill({ status: 401, headers: { 'access-control-allow-origin': '*' }, body: '{"type":"error"}' });
      const rows = []; for (let y = 0; y < 16; y++) rows.push(y < 2 || y > 13 ? '................' : '..' + '0'.repeat(12) + '..');
      let sse = 'data: {"type":"message_start"}\n\n';
      for (const c of JSON.stringify({ rows }).match(/.{1,40}/g)) sse += 'data: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c } }) + '\n\n';
      sse += 'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n';
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: sse });
    });
    await page.goto('file://' + join(dir, 'figma-host.html'));
    await page.waitForTimeout(800);
    const fr = page.frames().find(f => f.url().endsWith('ui.html'));

    const boot = await fr.evaluate(() => ({ w: doc.w, key: apiKey, sel: $('#fgSel').textContent, btn: $('#bFgImport').disabled }));
    assert.deepEqual(boot, { w: 16, key: 'sk-ant-test-abcd', sel: 'Figma 선택: Rectangle 1', btn: false });

    const svgBad = await fr.evaluate(async () => {
      let bad = 0;
      for (let fi = 0; fi < doc.frames.length; fi++) {
        const s = 3, { svg } = frameSVG(fi, s); const im = new Image();
        await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); });
        const c = document.createElement('canvas').getContext('2d'); c.canvas.width = doc.w * s; c.canvas.height = doc.h * s; c.drawImage(im, 0, 0);
        const d = c.getImageData(0, 0, c.canvas.width, c.canvas.height).data, comp = composite(fi);
        for (let y = 0; y < doc.h; y++) for (let x = 0; x < doc.w; x++) { const j = (y * doc.w + x) * 4, k = ((y * s + 1) * c.canvas.width + x * s + 1) * 4; for (let ch = 0; ch < 4; ch++) if (Math.abs(d[k + ch] - comp[j + ch]) > 2) { bad++; break; } }
      }
      return bad;
    });
    assert.equal(svgBad, 0, 'vector SVG renders pixel-identical to the editor');

    await fr.evaluate(() => figmaInsert({ mode: 'vector', all: true, scale: 4, styles: true, replace: false }));
    await fr.evaluate(() => figmaInsert({ mode: 'image', all: false, scale: 4, styles: false, replace: false }));
    await page.waitForTimeout(300);
    const ins = await page.evaluate(() => msgs.filter(m => m.type === 'insert').map(m => ({ mode: m.mode, frames: m.frames.length, w: m.w, palette: !!m.palette, png: !!m.frames[0].png })));
    assert.deepEqual(ins, [{ mode: 'vector', frames: 2, w: 64, palette: true, png: false }, { mode: 'image', frames: 1, w: 64, palette: false, png: true }]);

    await page.evaluate(() => { const i = msgs.find(m => m.type === 'insert'); toUI({ type: 'open-project', data: i.project, nodeId: '12:34', name: '물약' }); });
    await page.waitForTimeout(200);
    assert.deepEqual(await fr.evaluate(() => [FG.linkedId, doc.layers.length, doc.frames.length]), ['12:34', 2, 2], 're-open restores layers and frames');

    await page.evaluate(() => { const i = msgs.filter(m => m.type === 'insert')[1]; toUI({ type: 'import-image', bytes: i.frames[0].png, name: 'Rectangle 1' }); });
    await page.waitForTimeout(800);
    assert.deepEqual(await fr.evaluate(() => [conv.det.kind, conv.det.px]), ['grid', 4], 'imported Figma layer: grid detected');

    await fr.evaluate(() => { beginEdit(); cel()[0] = 1; endEdit(); });
    await page.waitForTimeout(1100);
    assert.ok(await page.evaluate(() => msgs.some(m => m.type === 'autosave')), 'autosave goes to clientStorage');

    await fr.evaluate(() => { $('#aiPrompt').value = '파란 상자'; $('#aiSize').value = '16x16'; aiGenerate(); });
    await page.waitForTimeout(1200);
    const ai = await fr.evaluate(() => ({ filled: cands[0].data.filter(v => v).length, pending: cands[0].pending }));
    assert.deepEqual(ai, { filled: 144, pending: false }, 'streamed AI result fills a candidate');
    assert.deepEqual(lastReq, { model: 'claude-sonnet-5-5', stream: true, key: 'sk-ant-test-abcd', cors: 'true', ver: '2023-06-01' });
    mode = '401';
    await fr.evaluate(() => aiGenerate());
    await page.waitForTimeout(800);
    assert.match(await fr.evaluate(() => $('#aiStatus').textContent), /API 키가 올바르지 않습니다/);

    // UI component mode: every state goes to Figma as a variant
    await fr.evaluate(() => { setMode('comp'); startTemplate('button'); figmaInsert({ mode: 'vector', scale: 2, asComponents: true }); });
    await page.waitForTimeout(300);
    const cm = await page.evaluate(() => { const m = msgs.filter(x => x.type === 'insert').pop(); return { names: m.frameNames, comp: m.asComponents, frames: m.frames.length, note: /9-slice/.test(m.note) }; });
    assert.deepEqual(cm, { names: ['상태=기본', '상태=호버', '상태=누름', '상태=비활성'], comp: true, frames: 4, note: true });
    // the component library lives in figma.clientStorage
    await fr.evaluate(() => libSave(false));
    const lib = await page.evaluate(() => { const m = msgs.filter(x => x.type === 'library').pop(); return m && JSON.parse(m.data).map(e => e.name); });
    assert.deepEqual(lib, ['버튼']);
    // language and theme also go to figma.clientStorage, and come back with init
    assert.equal(await fr.evaluate(() => document.documentElement.dataset.theme), 'light', 'light by default inside Figma too');
    await fr.evaluate(() => { setLang('en'); setTheme('dark'); });
    const pref = await page.evaluate(() => JSON.parse(msgs.filter(x => x.type === 'prefs').pop().data));
    assert.equal(pref.lang, 'en'); assert.equal(pref.theme, 'dark');
    assert.equal(await fr.evaluate(() => $('#bFgInsert').textContent), 'Insert into Figma');
    assert.deepEqual(await fr.evaluate(p => { FG.init.prefs = p; return prefLoad(); }, JSON.stringify(pref)), pref);
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
