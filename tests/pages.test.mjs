// GitHub Pages build: a complete page that works on its own (no Claude runtime): loads, saves as real downloads, AI explained.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import { launch, root, collectErrors } from './helpers.mjs';

test('github pages build', async () => {
  const file = join(root, 'dist/pages/index.html');
  const html = readFileSync(file, 'utf8');
  assert.match(html, /^<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">/, 'a complete document');
  assert.ok(html.includes('<link rel="icon" type="image/png" href="icon.png">') && html.includes('<link rel="apple-touch-icon" href="icon.png">'), 'favicon and app icon');
  assert.deepEqual(readFileSync(join(root, 'dist/pages/icon.png')), readFileSync(join(root, 'assets/icon.png')), 'icon copied next to the page');
  assert.ok(html.indexOf('<title>') < html.indexOf('</head>') && html.indexOf('<style>') < html.indexOf('</head>'), 'title and styles in <head>');

  // served over HTTP like GitHub Pages (file:// pages have an opaque origin, which makes Chromium ignore download names)
  const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const errs = collectErrors(page);
    await page.goto(`http://127.0.0.1:${server.address().port}/dotlab/`);
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => ({ w: doc.w, note: $('#aiNote').textContent, aiOff, hiddenCount: [...document.querySelectorAll('[hidden]')].filter(e => getComputedStyle(e).display !== 'none').length }));
    assert.equal(st.w, 16, 'sample document loads');
    assert.match(st.note, /웹 배포판에서는 AI 생성을 쓸 수 없습니다/);
    assert.equal(st.aiOff, true);
    assert.equal(st.hiddenCount, 0, '[hidden] elements stay hidden without the artifact host reset');

    // saving and exporting become ordinary browser downloads
    // (this test Chromium replaces non-ASCII download names with "download"; desktop browsers keep Korean names)
    await page.evaluate(() => { doc.name = 'potion'; });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
    assert.equal(dl.suggestedFilename(), 'potion.dotlab.json');
    const saved = JSON.parse(readFileSync(await dl.path(), 'utf8'));
    assert.deepEqual([saved.format, saved.w, saved.frames.length], ['dotlab', 16, 2], 'the download is the project');
    const [png] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportPNG(4))]);
    assert.equal(png.suggestedFilename(), 'potion-1@4x.png');

    await page.setViewportSize({ width: 400, height: 860 }); await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no horizontal scroll at phone width');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); server.close(); }
});
