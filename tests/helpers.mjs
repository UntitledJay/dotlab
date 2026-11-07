import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function launch() {
  const opts = {};
  // CI images sometimes ship Chromium outside Playwright's cache
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) opts.executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(opts);
}

// The web build is published inside a host skeleton (charset, viewport and a small reset).
// Tests wrap it the same way so [hidden] and body margins behave as in production.
export function webTestPage() {
  const dir = join(root, 'dist/test'); mkdirSync(dir, { recursive: true });
  const html = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' +
    readDist('web/dotlab.html') + '</body></html>';
  const p = join(dir, 'web.html'); writeFileSync(p, html); return 'file://' + p;
}

import { readFileSync } from 'node:fs';
export function readDist(p) { return readFileSync(join(root, 'dist', p), 'utf8'); }

export function collectErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|401/.test(m.text())) errs.push('console: ' + m.text()); });
  return errs;
}
