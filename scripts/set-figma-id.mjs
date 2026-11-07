// Puts the plugin ID that Figma issued into figma/manifest.json.
// Usage: node scripts/set-figma-id.mjs 1234567890123456789
// Get the ID in the Figma desktop app: Plugins → Development → New plugin… — the generated manifest.json has an "id"; copy it here.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'figma/manifest.json');
const id = String(process.argv[2] || '').trim();
if (!/^\d{6,}$/.test(id)) {
  console.error('Figma가 발급한 숫자 ID를 넣어 주세요. 예: node scripts/set-figma-id.mjs 1234567890123456789');
  process.exit(1);
}
const m = JSON.parse(readFileSync(file, 'utf8'));
const before = m.id; m.id = id;
writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log(`figma/manifest.json id: ${before} → ${id}`);
