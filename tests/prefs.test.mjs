// Language (한국어 / English), the light default theme and the palette shelf (팔레트 모음).
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, webTestPage, collectErrors } from './helpers.mjs';

// visible Korean text and attributes, outside user-named things (data-i18n="off")
const koreanLeft = () => {
  const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.currentNode; n; n = w.nextNode()) {
    if (n.nodeType === 3) { const el = n.parentElement; if (el.closest('[data-i18n="off"],script,style,textarea,[hidden]')) continue; if (/[가-힣]/.test(n.nodeValue)) out.push(n.nodeValue.trim()); }
    else if (!n.closest('[data-i18n="off"],[hidden]')) for (const a of ['title', 'aria-label', 'placeholder']) { const v = n.getAttribute(a); if (v && /[가-힣]/.test(v)) out.push(`@${a}: ${v}`); }
  }
  return out;
};

test('language, theme and palette shelf', async () => {
  const browser = await launch();
  try {
    // a dark system theme: the editor still opens light
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage(); const errs = collectErrors(page);
    await page.goto(webTestPage()); await page.waitForTimeout(500);
    let st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor, lang: I18N.lang, title: $('#bNew').textContent }));
    assert.equal(st.theme, 'light'); assert.equal(st.bg, 'rgb(232, 232, 235)', 'light background on a dark system'); assert.equal(st.lang, 'ko'); assert.equal(st.title, '새로 만들기');

    // the top bar fits on one line at 1400px
    const mids = await page.evaluate(() => [...document.querySelector('.top').children].filter(c => c.offsetWidth).map(c => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; }));
    assert.ok(Math.max(...mids) - Math.min(...mids) < 8, 'top bar on one row: ' + mids);

    // theme button switches to dark and canvas colours follow
    await page.click('#bTheme');
    st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor, stage: tok.stage }));
    assert.equal(st.theme, 'dark'); assert.equal(st.bg, 'rgb(11, 11, 13)'); assert.equal(st.stage.trim(), '#0f0f12');

    // English: everything visible is translated, including panels, dialogs and later toasts
    await page.click('#langSwitch [data-lang="en"]');
    st = await page.evaluate(() => ({ lang: document.documentElement.lang, nw: $('#bNew').textContent, undo: $('#bUndo').title, ph: $('#aiEdit').placeholder, status: $('#stSize').textContent }));
    assert.deepEqual(st, { lang: 'en', nw: 'New', undo: 'Undo (Ctrl+Z)', ph: 'e.g. turn the sword into an axe', status: '16×16 · 2 layers · 2 frames' });
    const left = [];
    for (const t of ['pAI', 'pConv', 'pRef']) { await page.evaluate(t => showTab(t), t); await page.waitForTimeout(50); left.push(...await page.evaluate(koreanLeft)); }
    await page.evaluate(() => toggleShelf(true));
    for (const d of ['newDialog()', 'exportDialog()', 'helpDialog()', 'presetDialog()', 'tagDialog()']) {
      await page.evaluate(d => eval(d), d); await page.waitForTimeout(50); left.push(...await page.evaluate(koreanLeft).then(a => a.map(x => d + ' ' + x)));
      await page.evaluate(() => { $('#modal').hidden = true; });
    }
    await page.evaluate(() => { setMode('comp'); startTemplate('button'); showTab('pComp'); }); await page.waitForTimeout(50);
    left.push(...await page.evaluate(koreanLeft));
    await page.evaluate(() => { exportDialog(); }); await page.waitForTimeout(50); left.push(...await page.evaluate(koreanLeft));
    await page.evaluate(() => { $('#modal').hidden = true; setMode('dot'); addLayer(); toast('잠긴 레이어입니다. 레이어 목록에서 자물쇠를 풀어 주세요.'); });
    await page.waitForTimeout(50);
    assert.deepEqual(left, [], 'no Korean left in English mode');
    st = await page.evaluate(() => ({ toast: $('#toast').textContent, layer: doc.layers.at(-1).name, state: stateName(0) }));
    assert.equal(st.toast, 'This layer is locked. Unlock it in the layer list.');
    assert.match(st.layer, /^Layer \d+$/, 'new layers get English names');

    // user text is left alone: a layer named in Korean stays Korean
    await page.evaluate(() => { doc.layers[0].name = '레이어 원숭이'; renderLayers(); });
    assert.equal(await page.evaluate(() => $$('#layerList .lname').at(-1).textContent), '레이어 원숭이');

    // switching back restores the Korean originals, also for text rendered while English was on
    await page.click('#langSwitch [data-lang="ko"]');
    st = await page.evaluate(() => ({ nw: $('#bNew').textContent, ph: $('#aiEdit').placeholder, tab: $('[data-tab="pComp"]').textContent, status: $('#stSize').textContent }));
    assert.equal(st.nw, '새로 만들기'); assert.equal(st.ph, '예: 칼을 도끼로 바꿔줘'); assert.equal(st.tab, '컴포넌트'); assert.match(st.status, /레이어 \d+개 · 프레임 \d+개/);

    // preferences survive a reload
    await page.click('#langSwitch [data-lang="en"]');
    await page.reload(); await page.waitForTimeout(500);
    st = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, lang: I18N.lang, nw: $('#bNew').textContent, shelf: !$('#palShelf').hidden }));
    assert.deepEqual(st, { theme: 'dark', lang: 'en', nw: 'New', shelf: true });

    // palette shelf: the open palette, saved palettes and presets side by side
    await page.evaluate(() => { setLang('ko'); setTheme('light'); });
    let sh = await page.evaluate(() => ({ rows: $$('#palShelf .shelfrow').length, first: $('#palShelf .shelfrow b').textContent }));
    assert.equal(sh.rows, 1 + Object.keys(await page.evaluate(() => PRESETS)).length, 'current palette + presets');
    assert.equal(sh.first, '지금 팔레트');
    // save the current palette, then pick a colour from a preset that the open palette lacks
    await page.evaluate(() => shelfSave('내 팔레트', doc.palette.slice()));
    sh = await page.evaluate(() => { const pal = doc.palette.length; const gb = $$('#palShelf .shelfrow').find(r => r.querySelector('b').textContent.startsWith('휴대용'));
      gb.querySelector('.shelfsw button').click(); return { pal, after: doc.palette.length, pri: doc.palette[ui.primary - 1], saved: shelfList().map(p => p.name), rows: $$('#palShelf .shelfrow').length }; });
    assert.equal(sh.after, sh.pal + 1, 'a missing colour is appended'); assert.equal(sh.pri, '#0f380f', 'and becomes the primary colour');
    assert.deepEqual(sh.saved, ['내 팔레트']);
    await page.evaluate(() => undo()); assert.equal(await page.evaluate(() => doc.palette.length), sh.pal, 'adding the colour is undoable');
    // a colour already in the palette is just selected
    await page.evaluate(() => { const row = $$('#palShelf .shelfrow')[1]; row.querySelectorAll('.shelfsw button')[3].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })); });
    assert.equal(await page.evaluate(() => [ui.secondary, doc.palette.length]).then(a => a.join()), `4,${sh.pal}`);
    // 바꾸기 opens the apply dialog with that palette; deleting removes it from the shelf
    await page.evaluate(() => $$('#palShelf .shelfrow')[1].querySelector('.btn').click());
    assert.equal(await page.evaluate(() => $('#mTitle').textContent), '내 팔레트');
    await page.evaluate(() => { $('#modal').hidden = true; $$('#palShelf .shelfrow')[1].querySelector('.mini').click(); });
    await page.evaluate(() => [...$$('#mActions button')].find(b => b.textContent === '삭제').click());
    assert.deepEqual(await page.evaluate(() => shelfList()), []);
    assert.deepEqual(errs, []);
    await ctx.close();
  } finally { await browser.close(); }
});
