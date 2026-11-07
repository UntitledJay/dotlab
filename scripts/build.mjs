// Builds both targets from src/:
//   dist/web/dotlab.html   — single-file web editor (Claude artifact page)
//   dist/figma/            — Figma plugin (manifest.json, code.js, ui.html)
// Usage: node scripts/build.mjs [web|figma]   (no argument builds both)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const EDITOR = ['core.js', 'ui.js', 'conv.js', 'ai.js'];

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
  // Figma theme classes (themeColors: true puts figma-dark / figma-light on <html>)
  const light = s.match(/:root\{\n([\s\S]*?)\n  --f-ui/)[1];
  const dark = s.match(/:root\[data-theme="dark"\]\{\n([\s\S]*?)color-scheme:dark \}/)[1];
  const theme = `html.figma-light:root{\n${light}\n  color-scheme:light }\nhtml.figma-dark:root{\n${dark}color-scheme:dark }\n`;
  s = replaceOnce(s, '\nhtml,body{height:100%}', '\n' + theme + 'html,body{height:100%}', 'theme');
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
}
