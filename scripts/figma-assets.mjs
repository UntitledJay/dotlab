// Builds the Figma Community listing images from the real plugin UI:
//   figma/publish/icon.png        128×128   copy of assets/icon.png (the app icon)
//   figma/publish/cover.png       1920×1080 thumbnail
//   figma/publish/carousel-N.png  1920×1080 feature images
// Usage: node scripts/figma-assets.mjs   (needs Playwright's Chromium; CHROMIUM_PATH works as in the tests)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildFigma } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'figma/publish');
mkdirSync(out, { recursive: true });
buildFigma();

// a stand-in for Figma's main thread, as in tests/figma-ui.test.mjs
const tmp = join(root, 'dist/publish-tmp'); mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, 'host.html'), `<!doctype html><html><body style="margin:0;background:#fff">
<iframe id="f" src="../figma/ui.html" style="width:1180px;height:780px;border:0;display:block"></iframe>
<script>const f=document.getElementById('f'); const toUI=m=>f.contentWindow.postMessage({pluginMessage:m},'*');
addEventListener('message',e=>{ const m=e.data&&e.data.pluginMessage; if(m&&m.type==='ready'){ toUI({type:'init',autosave:null,apiKey:'',library:null}); toUI({type:'selection',count:1,name:'Frame 12',dotlab:false}); } });</script></body></html>`);

const opts = {}; if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) opts.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(opts);
try {
  // ---- screenshots of the plugin window (2× for crisp downscaling)
  async function shot(setup) {
    const p = await browser.newPage({ viewport: { width: 1180, height: 780 }, deviceScaleFactor: 2 });
    await p.goto('file://' + join(tmp, 'host.html')); await p.waitForTimeout(1500);
    const fr = p.frames()[1];
    await fr.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    if (setup) await fr.evaluate(setup);
    await p.waitForTimeout(500);
    await fr.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    const png = await p.locator('#f').screenshot(); await p.close();
    return 'data:image/png;base64,' + png.toString('base64');
  }
  const main = await shot(() => { ui.frame = 1; renderTimeline(); setTool('pencil'); });
  const comp = await shot(() => { setMode('comp'); startTemplate('button'); regenComp({ w: 32, h: 14, radius: 2 }); docChange(() => { doc.name = '확인 버튼'; doc.comp.label = '확인'; });
    const box = document.getElementById('pComp'); box.scrollTop = box.scrollHeight; });
  const conv = await shot(async () => {
    // a small sprite, blown up 12× and saved as a lossy JPG: what people usually find online
    const d = sampleDoc(); const keep = [doc, palRGB]; doc = d; palRGB = d.palette.map(hex2rgb); const rgba = composite(0); doc = keep[0]; palRGB = keep[1];
    const s = document.createElement('canvas'); s.width = s.height = 16; s.getContext('2d').putImageData(new ImageData(rgba, 16, 16), 0, 0);
    const big = document.createElement('canvas'); big.width = big.height = 192; const c = big.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 192, 192); c.imageSmoothingEnabled = false; c.drawImage(s, 0, 0, 192, 192);
    const blob = await new Promise(r => big.toBlob(r, 'image/jpeg', 0.7));
    showTab('pConv'); await setConvImage(new File([blob], 'potion.jpg', { type: 'image/jpeg' }));
    document.getElementById('convBg').checked = true; runConvert();
  });
  const insert = await shot(() => { setMode('comp'); startTemplate('toggle'); figmaInsertDialog(); });

  // ---- slides
  const ICONURI = 'data:image/png;base64,' + readFileSync(join(root, 'assets/icon.png')).toString('base64');
  const slide = async (file, { eyebrow, title, body, img }) => {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box} body{margin:0;width:1920px;height:1080px;background:#e8e8eb;font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;color:#18181c;overflow:hidden}
      .frame{position:absolute;inset:28px;border-radius:44px;background:#f6f6f7;box-shadow:0 0 0 1px #e6e6ea}
      .copy{position:absolute;left:110px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:26px}
      .eyebrow{display:flex;align-items:center;gap:14px;font:600 26px/1 "Silkscreen","JetBrains Mono",monospace;letter-spacing:.12em;color:#18181c}
      .eyebrow img{width:44px;height:44px;image-rendering:pixelated;border-radius:10px}
      h1{margin:0;font-size:68px;line-height:1.18;font-weight:700;letter-spacing:-.01em;word-break:keep-all}
      p{margin:0;font-size:29px;line-height:1.55;color:#5d5d68;word-break:keep-all}
      .shot{position:absolute;right:90px;top:50%;transform:translateY(-50%);width:1080px;border-radius:26px;box-shadow:0 2px 6px rgba(16,16,24,.06),0 30px 80px rgba(16,16,24,.18),0 0 0 1px rgba(16,16,24,.06);overflow:hidden;background:#fff}
      .shot img{display:block;width:100%}
    </style></head><body><div class="frame"></div>
      <div class="copy"><div class="eyebrow"><img src="${ICONURI}"><span>${eyebrow}</span></div><h1>${title}</h1><p>${body}</p></div>
      <div class="shot"><img src="${img}"></div></body></html>`);
    await p.waitForTimeout(300); await p.screenshot({ path: join(out, file) }); await p.close();
  };
  await slide('cover.png', { eyebrow: 'DOTLAB', title: 'Figma 안에서<br>찍고, 만들고,<br>바로 넣는 픽셀아트', body: '도트 에디터 · AI 생성 · 이미지 → 도트 · 픽셀 UI 컴포넌트를 플러그인 하나로.', img: main });
  await slide('carousel-1.png', { eyebrow: 'EDITOR', title: '한 칸씩 찍는<br>진짜 도트 에디터', body: '픽셀 퍼펙트 연필, 레이어, 인덱스 팔레트, 애니메이션과 어니언 스킨, 프레임 태그, .aseprite 열기·저장까지.', img: main });
  await slide('carousel-2.png', { eyebrow: 'UI COMPONENTS', title: '픽셀 UI 컴포넌트를<br>상태별로', body: '버튼·패널·입력칸 같은 템플릿에서 시작해 모서리는 잠그고 안쪽만 다듬습니다. 9-slice로 늘리고, Figma에는 변형(Variant)으로 넣습니다.', img: comp });
  await slide('carousel-3.png', { eyebrow: 'IMAGE → PIXEL', title: '흐릿한 확대본도<br>원래 도트로', body: '확대되고 JPG로 뭉개진 도트 이미지에서 원래 픽셀 격자를 자동으로 찾아 깨끗한 도트로 되돌립니다. 배경 제거와 색 정리도 함께.', img: conv });
  await slide('carousel-4.png', { eyebrow: 'FIGMA', title: '벡터로 넣고,<br>다시 열어 고치기', body: '레이어마다 그룹, 색마다 도형으로 넣어 크게 키워도 선명합니다. 넣은 개체는 언제든 도트랩에서 다시 열어 제자리에 교체할 수 있습니다.', img: insert });

  // ---- icon: the app icon (assets/icon.png, 128×128)
  copyFileSync(join(root, 'assets/icon.png'), join(out, 'icon.png'));
  console.log('figma/publish: icon.png, cover.png, carousel-1..4.png');
} finally { await browser.close(); }
