// Checks the Figma plugin build before publishing to the Community.
// Usage: node scripts/check-figma-release.mjs [--allow-dev-id]
//   --allow-dev-id  accept the placeholder id (tests and CI); publishing needs the id Figma issues
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildFigma } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function pngSize(file) { const b = readFileSync(file); if (b.toString('ascii', 1, 4) !== 'PNG') return null; return [b.readUInt32BE(16), b.readUInt32BE(20)]; }

export function checkFigmaRelease({ allowDevId = false } = {}) {
  buildFigma();
  const errors = [], warnings = [];
  const m = JSON.parse(readFileSync(join(root, 'figma/manifest.json'), 'utf8'));
  // manifest
  if (!/^\d{6,}$/.test(String(m.id))) (allowDevId ? warnings : errors).push(`manifest id "${m.id}"는 임시 값입니다. Figma 데스크톱 앱에서 New plugin…으로 받은 숫자 ID를 node scripts/set-figma-id.mjs <ID>로 넣으세요.`);
  for (const k of ['name', 'api', 'main', 'ui', 'editorType']) if (!m[k]) errors.push(`manifest에 ${k}가 없습니다`);
  for (const f of [m.main, m.ui]) if (f && !existsSync(join(root, 'dist/figma', f))) errors.push(`dist/figma/${f} 파일이 없습니다`);
  const allowed = (m.networkAccess && m.networkAccess.allowedDomains) || [];
  if (!m.networkAccess) errors.push('manifest에 networkAccess가 없습니다. 쓰는 도메인만 allowedDomains에 적어야 합니다.');
  for (const d of allowed) if (d !== 'none' && !/^https:\/\//.test(d)) errors.push(`allowedDomains의 ${d}는 https://로 시작해야 합니다`);
  if (allowed.includes('*')) errors.push('allowedDomains에 "*"를 쓰지 마세요. 실제로 호출하는 도메인만 적습니다.');
  if (m.networkAccess && !m.networkAccess.reasoning) warnings.push('networkAccess.reasoning이 비어 있습니다. Community 페이지에 공개되는 설명이라 적어 두는 편이 좋습니다.');
  // every place the UI or main thread reaches the network must be an allowed https domain
  const ui = readFileSync(join(root, 'dist/figma', m.ui), 'utf8'), code = readFileSync(join(root, 'dist/figma', m.main), 'utf8');
  const reqs = new Set();
  for (const src of [ui, code]) for (const mm of src.matchAll(/(?:fetch\(|src=|href=|url\()\s*['"`]?(https?:\/\/[^'"`)\s>]+)/g)) reqs.add(mm[1]);
  for (const u of reqs) {
    if (!u.startsWith('https://')) errors.push(`HTTPS가 아닌 요청: ${u}`);
    const host = new URL(u).origin;
    if (!allowed.some(d => d === host || u.startsWith(d))) errors.push(`allowedDomains에 없는 주소로 요청합니다: ${u}`);
  }
  if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/i.test(ui)) errors.push('ui.html이 외부 스크립트나 스타일시트를 불러옵니다. 플러그인 창에는 모두 넣어서 빌드해야 합니다.');
  // the main thread runs in Figma's sandbox: keep to conservative syntax
  if (/\?\.|\?\?|\{\s*\.\.\./.test(code)) errors.push('code.js에 ?., ??, 객체 전개가 있습니다. Figma 샌드박스 호환을 위해 빼 주세요.');
  // listing images
  const want = { 'icon.png': [128, 128], 'cover.png': [1920, 1080] };
  for (const [f, sz] of Object.entries(want)) { const p = join(root, 'figma/publish', f); if (!existsSync(p)) { errors.push(`figma/publish/${f}가 없습니다. node scripts/figma-assets.mjs로 만드세요.`); continue; } const s = pngSize(p); if (!s || s[0] !== sz[0] || s[1] !== sz[1]) errors.push(`figma/publish/${f} 크기가 ${s} 입니다. ${sz.join('×')}이어야 합니다.`); }
  for (let i = 1; i <= 9; i++) { const p = join(root, `figma/publish/carousel-${i}.png`); if (!existsSync(p)) break; const s = pngSize(p); if (!s || s[0] !== 1920 || s[1] !== 1080) warnings.push(`carousel-${i}.png 크기가 ${s} 입니다 (권장 1920×1080)`); }
  if (!existsSync(join(root, 'figma/publish/listing.md'))) errors.push('figma/publish/listing.md(게시 문구)가 없습니다');
  return { errors, warnings, id: m.id, requests: [...reqs] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = checkFigmaRelease({ allowDevId: process.argv.includes('--allow-dev-id') });
  for (const w of r.warnings) console.log('주의  ' + w);
  for (const e of r.errors) console.log('오류  ' + e);
  console.log(r.errors.length ? `\n게시 전에 고칠 것 ${r.errors.length}개` : `\n게시 준비 완료 (id ${r.id}, 외부 요청: ${r.requests.join(', ') || '없음'})`);
  process.exit(r.errors.length ? 1 : 0);
}
