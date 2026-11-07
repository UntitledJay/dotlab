// Several open canvases (tabs): each keeps its own document, undo history and view; autosave keeps them all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

test('open canvases (tabs)', async () => {
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage(); const errs = collectErrors(page);
    await page.goto(webTestPage()); await page.waitForTimeout(500);
    const tabs = () => page.evaluate(() => ({ n: TABS.list.length, cur: TABS.cur, names: $$('#docTabs .dtab .tname').map(e => e.textContent), on: $$('#docTabs .dtab').findIndex(e => e.classList.contains('on')), doc: doc.name }));
    assert.deepEqual(await tabs(), { n: 1, cur: 0, names: ['물약 (예시)'], on: 0, doc: '물약 (예시)' });

    // 새 캔버스 (the + button) opens a second tab; the sample stays in the first
    await page.click('#docTabs .tadd');
    await page.evaluate(() => { $$('#mBody .sizes .btn').find(b => b.textContent === '32×32').click(); [...$$('#mActions button')].find(b => b.textContent === '만들기').click(); });
    let t = await tabs(); assert.equal(t.n, 2); assert.equal(t.cur, 1); assert.equal(t.on, 1); assert.deepEqual(t.names, ['물약 (예시)', '새 작품']);
    assert.equal(await page.evaluate(() => [doc.w, hist.length].join()), '32,0', 'a new tab starts with its own empty history');

    // edits stay in their own tab, undo too
    await page.evaluate(() => { beginEdit(); cel()[0] = 3; endEdit(); docChange(() => { doc.name = '둘째'; }); });
    await page.evaluate(() => switchTab(0));
    let st = await page.evaluate(() => ({ name: doc.name, w: doc.w, hist: hist.length, undoOff: $('#bUndo').disabled, input: $('#docName').value }));
    assert.deepEqual(st, { name: '물약 (예시)', w: 16, hist: 0, undoOff: true, input: '물약 (예시)' });
    await page.evaluate(() => { beginEdit(); cel()[5] = 2; endEdit(); ui.userView = true; ui.zoom = 12; ui.panX = 7; ui.panY = 9; });
    await page.evaluate(() => switchTab(1));
    st = await page.evaluate(() => ({ name: doc.name, px: cel(0, doc.layers[0].id)[0], hist: hist.length, tab: $$('#docTabs .tname')[1].textContent }));
    assert.deepEqual(st, { name: '둘째', px: 3, hist: 2, tab: '둘째' }, 'tab name follows the document name');
    await page.evaluate(() => { undo(); undo(); });
    assert.equal(await page.evaluate(() => cel(0, doc.layers[0].id)[0]), 0, 'undo works inside the tab');
    await page.evaluate(() => switchTab(0));
    st = await page.evaluate(() => ({ px: cel()[5], hist: hist.length, zoom: ui.zoom, pan: [ui.panX, ui.panY] }));
    assert.deepEqual(st, { px: 2, hist: 1, zoom: 12, pan: [7, 9] }, 'the first tab kept its edit, history and view');

    // opening a project file and converting an image also open tabs
    await page.evaluate(() => { const d = makeDoc(8, 8, ['#000000', '#ffffff'], '파일'); const keep = doc; doc = d; const s = serialize(); doc = keep;
      return handleFile(new File([s], 'file.dotlab.json', { type: 'application/json' })); });
    t = await tabs(); assert.equal(t.n, 3); assert.equal(t.cur, 1, 'opens next to the active tab'); assert.equal(t.doc, '파일');

    // autosave keeps every tab and which one is active
    await page.waitForTimeout(900);
    await page.reload(); await page.waitForTimeout(500);
    t = await tabs(); assert.deepEqual(t.names, ['물약 (예시)', '파일', '새 작품'], 'the second tab was undone back to its first name'); assert.equal(t.cur, 1);
    // an autosave from before tabs (one project) still opens
    await page.evaluate(() => localStorage.setItem('dotlab.autosave', withDoc(makeDoc(4, 4, ['#123456'], '예전 저장'), serialize)));
    await page.reload(); await page.waitForTimeout(500);
    t = await tabs(); assert.deepEqual(t.names, ['예전 저장']);

    // closing: a tab with history asks first; the last tab is replaced by a blank canvas
    await page.evaluate(() => { openDoc(makeDoc(8, 8, ['#000000'], 'A')); beginEdit(); cel()[0] = 1; endEdit(); });
    await page.click('#docTabs .dtab.on .tclose');
    assert.equal(await page.evaluate(() => $('#modal').hidden ? '' : $('#mTitle').textContent), '캔버스 닫기');
    await page.evaluate(() => [...$$('#mActions button')].find(b => b.textContent === '닫기').click());
    t = await tabs(); assert.deepEqual(t.names, ['예전 저장']); assert.equal(t.cur, 0);
    await page.click('#docTabs .dtab.on .tclose');
    t = await tabs(); assert.equal(t.n, 1); assert.equal(t.doc, '새 작품'); assert.equal(await page.evaluate(() => doc.w), 4, 'same size as before');

    // a component template from pixel art opens its own tab; templates then replace each other
    await page.evaluate(() => { setMode('comp'); startTemplate('button'); startTemplate('panel'); });
    t = await tabs(); assert.equal(t.n, 2); assert.equal(await page.evaluate(() => doc.comp.kind), 'panel');
    await page.evaluate(() => switchTab(0)); assert.equal(await page.evaluate(() => ui.mode), 'comp', 'switching tabs keeps the screen mode');
    await page.evaluate(() => switchTab(1)); assert.equal(await page.evaluate(() => !!doc.comp), true);

    // phone width: the strip scrolls on its own, the page does not
    await page.evaluate(() => { for (let i = 0; i < 6; i++) openDoc(makeDoc(8, 8, ['#000000'], '탭 ' + i)); });
    await page.setViewportSize({ width: 400, height: 800 }); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 400);
    assert.deepEqual(errs, []);
    await ctx.close();
  } finally { await browser.close(); }
});
