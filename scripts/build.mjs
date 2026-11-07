// Builds both targets from src/:
//   dist/web/dotlab.html   — single-file web editor (Claude artifact page)
//   dist/figma/            — Figma plugin (manifest.json, code.js, ui.html)
//   dist/pages/index.html  — the same editor as a complete web page for GitHub Pages (plain downloads, no AI)
// Usage: node scripts/build.mjs [web|figma|pages]   (no argument builds all three)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const EDITOR = ['core.js', 'i18n.js', 'palettes.js', 'ui.js', 'aseprite.js', 'timelapse.js', 'conv.js', 'recolor.js', 'comp.js', 'ai.js'];

function editorJs(extra = []) {
  return [...EDITOR.map(f => read('src/editor/' + f)), ...extra.map(f => read(f)), read('src/editor/init.js')].join('');
}

export function buildWeb() {
  const shell = read('src/shell.html');
  const html = shell + '<script>\n' + editorJs() + '</script>\n';
  mkdirSync(join(root, 'dist/web'), { recursive: true });
  writeFileSync(join(root, 'dist/web/dotlab.html'), html);
  return html;
}

const FAVICON = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'><path fill='#18181c' d='M1 0h6v1h1v6h-1v1H1v-1H0V1h1z'/><path fill='#3d7be0' d='M1 1h6v6H1z'/><path fill='#9cc0f5' d='M2 2h2v2H2z'/></svg>");

// A complete document: the shell's <title>, fonts and styles go in <head>, the app in <body>.
// The artifact host normally adds the reset ([hidden], margins); here the page carries it.
export function buildPages() {
  const shell = read('src/shell.html');
  const at = shell.indexOf('<div id="app">');
  if (at < 0) throw new Error('build: marker not found (app)');
  const html = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    '<meta name="description" content="직접 찍고 다듬는 픽셀아트 에디터 — 레이어·애니메이션·.aseprite·타임랩스·픽셀 UI 컴포넌트">\n' +
    `<link rel="icon" href="${FAVICON}">\n` + shell.slice(0, at) +
    '<style>[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n' + shell.slice(at) +
    '<script>\n' + editorJs(['src/platform/pages.js']) + '</script>\n</body>\n</html>\n';
  const out = join(root, 'dist/pages');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), html);
  writeFileSync(join(out, '.nojekyll'), '');
  return html;
}

function replaceOnce(s, from, to, label) {
  const i = s.indexOf(from);
  if (i < 0) throw new Error(`build: marker not found (${label})`);
  return s.slice(0, i) + to + s.slice(i + from.length);
}

export function buildFigma() {
  let s = read('src/shell.html');
  // no external fonts inside the plugin window; the system font stacks take over
  s = s.replace(/<link rel="preconnect"[^>]*>\n/, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, '');
  s = replaceOnce(s, '<title>도트랩 에디터</title>', '<title>도트랩</title>', 'title');
  // theme: light by default like the web build, whatever Figma's theme is; the top-bar button switches (data-theme)
  s = replaceOnce(s, 'padding-inline:16px;padding-block:12px;', 'padding-inline:8px;padding-block:8px;', 'padding');
  s = replaceOnce(s, '\n@media (max-width:980px){', '\n' + read('src/platform/figma.css') + '@media (max-width:980px){', 'css');
  // top bar: Figma actions
  s = replaceOnce(s, '<button class="btn primary" id="bExport">내보내기</button>', '<button class="btn" id="bExport">파일로 내보내기</button>', 'export');
  s = replaceOnce(s, '    <div class="group">\n      <button class="btn ic" id="bUndo"',
    '    <div class="group">\n      <button class="btn" id="bFgImport" disabled>선택 가져오기</button>\n      <button class="btn primary" id="bFgInsert">Figma에 넣기</button>\n    </div>\n    <div class="group">\n      <button class="btn ic" id="bUndo"', 'figma buttons');
  // AI tab: API key box
  s = replaceOnce(s, '<p class="note" id="aiNote">AI 기능을 준비하는 중입니다…</p>',
    '<p class="note" id="aiNote">AI 기능을 준비하는 중입니다…</p>\n' + read('src/platform/figma-keybox.html').trimEnd(), 'keybox');
  // status bar + resize handle
  s = replaceOnce(s, '<span id="stHint"></span></div>', '<span id="stHint"></span><span id="fgSel"></span></div>', 'status');
  s = replaceOnce(s, '<div class="toast" id="toast"', '<div id="resizer" title="창 크기 조절" aria-hidden="true"></div>\n<div class="toast" id="toast"', 'resizer');

  let js = editorJs(['src/platform/figma.js']);
  const i = js.trimEnd().lastIndexOf('init();');
  js = js.slice(0, i) + 'boot();\n';
  const html = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
    replaceOnce(s, '<div id="app">', '</head>\n<body>\n<div id="app">', 'body') +
    '\n<script>\n' + js + '</script>\n</body>\n</html>\n';
  const out = join(root, 'dist/figma');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'ui.html'), html);
  for (const f of ['manifest.json', 'code.js', 'README.md']) copyFileSync(join(root, 'figma', f), join(out, f));
  return html;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = process.argv[2];
  if (!t || t === 'web') console.log('dist/web/dotlab.html', buildWeb().length, 'bytes');
  if (!t || t === 'figma') console.log('dist/figma/ui.html', buildFigma().length, 'bytes');
  if (!t || t === 'pages') console.log('dist/pages/index.html', buildPages().length, 'bytes');
}
