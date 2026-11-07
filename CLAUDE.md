# 도트랩 (DotLab) — Claude Code 작업 안내

직접 찍고 AI로 생성하는 픽셀아트 에디터입니다. 같은 소스에서 세 가지 결과물을 빌드합니다.

- **웹 버전** `dist/web/dotlab.html`: 파일 하나로 된 페이지. Claude 아티팩트로 게시해 쓰며, AI는 아티팩트 런타임(`window.claude.use('sample')`)으로 호출합니다.
- **Figma 플러그인** `dist/figma/`: `manifest.json`, `code.js`, `ui.html`. AI는 사용자가 입력한 Anthropic API 키로 호출합니다.
- **GitHub Pages** `dist/pages/index.html`: 같은 에디터를 완전한 웹 페이지로 만든 것. 파일 저장은 일반 다운로드, AI는 꺼져 있습니다(Claude 런타임이 없음). https://untitledjay.github.io/dotlab/

기획서는 `docs/plan.html`(v0.2, 경쟁 분석 포함)에 있습니다.

## 명령

```bash
npm install                 # playwright (테스트용)
npx playwright install chromium   # 처음 한 번
npm run build               # dist/web, dist/figma, dist/pages 셋 다
npm test                    # 빌드 후 테스트 9개 파일 실행
```

- Chromium을 따로 설치한 환경이면 `CHROMIUM_PATH=/path/to/chrome npm test`로 실행합니다.
- 코드를 바꾸면 커밋 전에 `npm test`를 통과시킵니다.
- **배포**: `main`에 푸시하면 `.github/workflows/pages.yml`이 테스트를 돌린 뒤 `dist/pages`를 `gh-pages` 브랜치에 올립니다(저장소 Settings → Pages → Deploy from a branch → `gh-pages` / root). 웹 아티팩트는 `dist/web/dotlab.html`을 Artifact로 다시 게시합니다.
- **Figma Community 게시**: 절차는 `figma/README.md`의 「Figma Community에 게시하기」. `npm run figma:id -- <ID>`(Figma가 발급한 ID 넣기), `npm run figma:assets`(게시 이미지 `figma/publish/*.png`를 실제 화면으로 생성), `npm run figma:check`(manifest·허용 도메인·외부 리소스·샌드박스 문법·이미지 크기 점검). 게시 문구와 보안 공개 답변은 `figma/publish/listing.md`에 있고, 네트워크 요청을 바꾸면 이 문서와 manifest의 `reasoning`도 함께 고칩니다.
- Figma 플러그인은 Figma 데스크톱 앱에서 Plugins → Development → Import plugin from manifest…로 `dist/figma/manifest.json`을 불러와 확인합니다.

## 폴더 구조

```
src/shell.html          화면 마크업 + CSS 전체 (디자인 토큰, 기본 라이트 + data-theme="dark")
src/editor/core.js      유틸, 상태, 문서 모델, 합성·렌더, 히스토리, 그리기 도구, 선택, 레이어·프레임·팔레트 연산, 저장 형식
src/editor/i18n.js      한국어/English: 영어 사전(I18N.en, 패턴 I18N.pats)과 화면 번역기(MutationObserver), setLang, L()
src/editor/palettes.js  설정 저장(prefGet/prefSet), 테마(setTheme), 팔레트 모음(저장한 팔레트·프리셋을 나란히)
src/editor/ui.js        패널 렌더링, 대화상자(태그 편집 포함), 파일 열기/내보내기, GIF 인코더
src/editor/aseprite.js  .aseprite 읽기(인덱스·RGBA·그레이스케일)·쓰기(인덱스)
src/editor/timelapse.js 작업 과정 기록과 타임랩스 GIF. AI 결과를 넣는 곳은 그 직전에 `TL.mark='ai'`를 두어 그 단계에 AI 표시가 붙게 합니다
src/editor/conv.js      이미지 → 도트 (격자 자동 감지, 색 정리, 배경 제거)
src/editor/recolor.js   색감 옮기기 (밝기 순서대로 바꾸기 / Lab 색공간에서 분위기만 맞추기)
src/editor/comp.js      UI 컴포넌트 모드: 템플릿 8종과 모양 옵션, 상태, 9-slice(계산·캔버스 가이드)·모서리 잠금·안쪽 영역, 늘린 미리보기, 내 컴포넌트 라이브러리, 내보내기(PNG·JSON·CSS)
src/editor/tabs.js      열린 캔버스 여러 개(탭): 탭마다 문서·실행 취소·타임랩스·화면 위치·색 선택, 탭 띠, 전체 자동 저장(workspaceData)
src/editor/ai.js        AI 생성 (후보, 부분 다시 그리기, 팔레트 생성) + 웹 버전 기능 연결(initCapabilities)
src/editor/init.js      이벤트 연결, 단축키, init()
src/platform/figma.js   Figma 전용: postMessage 브리지, clientStorage 저장, 파일 다운로드, Anthropic API 호출, 캔버스 넣기·가져오기
src/platform/figma.css  플러그인 창 전용 CSS
src/platform/figma-keybox.html  AI 탭의 API 키 입력 칸
src/platform/pages.js   GitHub Pages 전용: 파일 저장을 일반 다운로드(anchorDownload)로, AI는 안내 문구와 함께 끔
assets/icon.png         앱 아이콘(128×128). Pages 파비콘·apple-touch-icon(dist/pages/icon.png로 복사), Figma 게시 아이콘(figma:assets가 figma/publish/icon.png로 복사)
figma/                  플러그인 manifest.json, code.js(Figma 메인 스레드), README.md
scripts/build.mjs       두 결과물 빌드
tests/                  node:test + Playwright 테스트
docs/plan.html          기획서
```

## 구조에서 꼭 알아야 할 점

**모듈 시스템이 없습니다.** 빌드는 파일들을 순서대로 이어 붙여 `<script>` 하나로 만듭니다. 순서는 `scripts/build.mjs`의 `EDITOR` 목록(`core → i18n → palettes → ui → aseprite → timelapse → conv → recolor → comp → tabs → ai`) 다음에 Figma는 `platform/figma`, Pages는 `platform/pages`, 마지막에 `init`입니다. Pages 빌드는 shell의 `<div id="app">` 앞부분(제목·폰트·스타일)을 `<head>`에 넣고, 아티팩트 호스트가 대신 넣어 주던 `[hidden]` 리셋을 직접 넣습니다. 새 파일을 만들면 이 목록에 추가합니다. 모든 이름이 전역을 공유하므로 새 이름이 기존 것과 겹치지 않게 합니다. 예를 들어 `h()`는 DOM 헬퍼이므로 높이 변수는 `H`나 `hh`로 씁니다.

**플랫폼 차이는 함수 재선언으로 바꿉니다.** 같은 스크립트 안에서는 나중에 선언된 `function`이 이깁니다. `platform/figma.js`는 다음을 다시 선언합니다.

| 함수 | 웹 | Figma |
| --- | --- | --- |
| `scheduleSave` / `loadAutosave` | `localStorage` | 메인 스레드를 거쳐 `figma.clientStorage` |
| `offerFiles` | 아티팩트 `downloads` 기능 | `anchorDownload`(`<a download>`, Pages도 같음) |
| `initCapabilities` | `claude.use('sample')`, `claude.use('downloads')` | `claudeShim`(Anthropic Messages API 스트리밍) |
| `tabExtraSave` / `tabExtraLoad` | 없음 | 탭마다 연결된 Figma 개체(`FG.linkedId`) |
| `prefLoad` / `prefStore` | `localStorage`(`dotlab.prefs`) | 메인 스레드를 거쳐 `figma.clientStorage`(`prefs`) |

`let`/`const`는 재선언할 수 없으므로, 플랫폼별로 바꿔야 하는 값은 `function`이나 객체 속성으로 둡니다. Figma 빌드는 마지막 `init();`을 `boot();`로 바꿉니다. `boot()`는 메인 스레드의 `init` 메시지(자동 저장본과 API 키)를 받은 뒤 `init()`을 부릅니다.

**빌드는 문자열 치환에 의존합니다.** `scripts/build.mjs`의 Figma 빌드는 `src/shell.html`에서 특정 마크업을 찾아 바꿉니다(버튼, 상태 표시줄, API 키 칸, 테마 블록). 표시는 `replaceOnce`가 찾지 못하면 빌드가 멈추게 되어 있습니다. shell.html에서 해당 부분을 고치면 build.mjs도 함께 맞춥니다.

## 문서 모델

```js
doc = {
  name, w, h,                       // 캔버스 최대 256×256 (MAXSIZE)
  palette: ['#rrggbb', ...],        // 최대 62색 (MAXPAL, AI 문자표 0-9a-zA-Z 길이)
  layers: [{ id, name, visible, opacity, locked, alphaLock, outline }],  // 아래 → 위 순서. outline: 0 또는 팔레트 값
  frames: [{ dur /*ms*/, name? /*컴포넌트 상태 이름*/, cels: { [layerId]: Uint8Array(w*h) } }],
  comp?: { kind, slice: {l,t,r,b} | null, pad: {l,t,r,b}, padAuto, lock, fill: 'stretch'|'tile', label, opts?: {w,h,radius,border,depth,base}, libId? },
        // 있으면 UI 컴포넌트. slice는 9-slice 여백(원본 픽셀, null이면 고정 크기), pad는 안쪽(콘텐츠) 영역, lock이면 slice 바깥은 그려지지 않음,
        // opts는 템플릿 모양 옵션(바꾸면 regenComp로 모든 상태를 다시 그림), libId는 「내 컴포넌트」 항목
  tags: [{ name, from, to /*0부터, 끝 포함*/, dir: 'forward'|'reverse'|'pingpong'|'pingpong_reverse' (TAGDIRS, Aseprite 파일의 번호 순서), color: '#rrggbb' }],
}
```

- **링크 셀**: 서로 다른 프레임의 `cels[id]`가 **같은 `Uint8Array` 객체**를 가리키면 링크된 셀입니다. 한쪽을 고치면 함께 바뀌고, `structuredClone`(히스토리)도 이 공유 관계를 보존합니다. 모든 cel을 도는 변경 루프는 같은 배열을 두 번 고치지 않도록 `Set`으로 중복을 걸러야 합니다(`remapAll` 참고). 프레임마다 다르게 써야 하는 작업은 먼저 링크를 풉니다(`mergeDown`이 아래 레이어를 그렇게 처리합니다). `isLinked`, `linkedWithPrev`, `unlinkCel`, `addFrame('empty'|'dup'|'link')`를 씁니다.
- **UI 컴포넌트 모드** (`ui.mode==='comp'`, 상단 「도트 / UI 컴포넌트」): 화면 모드이고, 문서가 컴포넌트인지는 `doc.comp`로 정합니다. 프레임이 곧 상태(기본·호버·누름·비활성…)이고 `stateName(fi)`로 이름을 읽습니다. 템플릿은 `COMPKINDS`(그리는 함수와 기본 slice·상태 목록)에 있고, 색은 주 색상 하나에서 `compRoles`로 명암을 나눕니다(필요한 색은 팔레트에 추가). 9-slice 가이드는 `draw()`가 그리고, 포인터는 도구보다 먼저 `guideDown/Move/Up`이 받습니다. 끌기가 끝나면 한 번의 `docChange`로 기록합니다. 내보내기 상태 이름 중 `COMPCSS`에 있는 것(호버→`:hover`, 누름→`:active`, 비활성→`:disabled` 등)은 CSS 선택자가 됩니다.
  - 템플릿 그리기 함수는 `draw(c,W,H,state,roles,opts)`로 모양 옵션(모서리 둥글기·테두리 두께·입체감)을 받습니다. slice와 안쪽 영역은 `compSliceFor`/`compPadFor`가 옵션에서 계산합니다. 사용자가 안쪽 영역을 직접 고치면 `padAuto=false`가 되어 다시 그려도 유지됩니다.
  - 잠금: `setPx`가 `compLocked(x,y)`를 물어 slice 바깥(모서리·테두리)을 막습니다. 컴포넌트 모드에서만 작동합니다. 이동·붙여넣기·AI 결과처럼 cel에 직접 쓰는 곳은 잠금을 거치지 않습니다.
  - 「내 컴포넌트」: 항목은 `{id,name,kind,w,h,states,savedAt,data: serialize()}`입니다. `libLoad`/`libStore`는 웹에서 localStorage(`dotlab.library`), Figma에서 clientStorage(`library` 메시지)로 다시 선언됩니다. 라이브러리 파일은 `{format:'dotlab-library',version:1,items}`이고 「열기」로도 가져옵니다.
- **태그**: 프레임을 넣거나 지우면 `shiftTags`가 범위를 맞춥니다. 재생과 GIF는 `playSequence(range)`로 프레임 순서를 만듭니다. 핑퐁은 끝 프레임을 반복하지 않습니다(Aseprite와 같은 방식).

- 픽셀 값 `0`은 투명, `v`는 `palette[v-1]`입니다(인덱스 컬러). 팔레트를 바꾸면 그림 전체가 바뀝니다. 색을 지우거나 순서를 바꿀 때는 `remapAll(map)`으로 모든 cel을 다시 매핑합니다.
- **열린 캔버스(탭)**: 활성 탭의 문서가 전역 `doc`이고, 나머지는 `TABS.list`에 실행 취소 기록(`hist`/`redoS`를 옮겨 담음)·타임랩스·화면 위치·주/보조 색과 함께 보관됩니다. 문서를 **새로 여는** 곳(새로 만들기, 열기, 이미지 → 새 캔버스, 내 컴포넌트 열기, Figma 선택 편집, 도트 그림에서 템플릿 시작)은 `openDoc(nd)`로 새 탭을 만들고, `replaceDoc(nd)`는 지금 탭의 문서를 바꿉니다(실행 취소 가능). 다른 탭 문서를 읽을 때는 `withDoc(d, fn)`으로 잠깐 전역 `doc`을 바꿉니다. 탭은 최대 12개입니다. 자동 저장은 `{format:'dotlab-workspace',version:1,active,docs:[serialize() 문자열…]}`이고, 예전의 단일 프로젝트 자동 저장도 읽습니다(`parseWorkspace`).
- 저장 형식(`serialize`/`deserialize`): `{format:'dotlab',version:3,...,tags,comp}`이고(프레임에 `name`이 붙을 수 있음), cel은 RLE 후 base64 문자열이거나, 링크면 `{link: 앞 프레임 번호}`입니다. version 1·2 파일(태그·링크·컴포넌트 없음)도 그대로 읽습니다. 형식을 바꾸면 `version`을 올리고 이전 버전 읽기를 유지합니다. Figma에 넣은 개체의 `pluginData('dotlab')`에도 같은 문자열이 들어갑니다.

## 편집 규칙 (실행 취소와 다시 그리기)

- 픽셀만 바꾸는 작업은 `beginEdit()` → 활성 cel 수정 → `endEdit()`로 감쌉니다. cel 단위 차이가 히스토리에 기록됩니다.
- 레이어·프레임·팔레트·캔버스 크기를 바꾸는 작업은 `docChange(() => { ... })`로 감쌉니다. 문서 스냅샷이 기록되고 `refreshAll()`이 실행됩니다.
- 화면만 다시 그리려면 `changed()`를 부릅니다(합성 캐시 무효화와 다시 그리기). 레이어 표시 여부처럼 히스토리에 넣지 않는 설정은 바꾼 뒤 `changed()`와 `scheduleSave()`를 부릅니다.
- 브러시는 커서 가운데에 찍힙니다. 홀수 크기는 커서 아래 픽셀이 가운데, 짝수 크기는 연필·지우개·직선에서 커서에 가장 가까운 격자 모서리가 가운데입니다(`toolPos`가 반올림, `brushOrigin`이 블록 시작 위치). 도구 좌표는 `docPos` 대신 `toolPos`로 얻습니다.
- 포인터 좌표는 언제나 `viewPt(e)`(캔버스의 레이아웃 픽셀)로 바꿔 씁니다. 페이지가 CSS로 확대·축소되어 보여도(임베드 뷰어) 맞습니다. 캔버스 비트맵은 레이아웃 크기 × `dpr`(기기 픽셀 비율 × 렌더 비율)이고, `#view`의 CSS 크기는 반드시 stage와 같아야 합니다(`width:100%;height:100%`). 그렇지 않으면 고해상도 화면에서 캔버스가 두 배로 그려져 커서와 어긋납니다.
- 그리기 도구는 시스템 커서를 숨기고(`cursorFor`) `draw()`가 같은 좌표로 십자 커서를 그립니다.
- 그리기 함수는 `setPx`를 거칩니다. 선택 영역, 알파 잠금, 디더, 타일 모드 감싸기가 거기서 처리되므로 cel 배열에 직접 쓰지 않습니다. 이동·붙여넣기처럼 의도적으로 직접 쓰는 곳은 예외입니다.

## Figma 메시지 프로토콜 (UI ↔ code.js)

| UI → 메인 | 내용 |
| --- | --- |
| `ready` | UI 준비 완료. 메인이 `init`과 `selection`으로 답함 |
| `autosave {data}` | 열린 캔버스 전체(`workspaceData()`)를 clientStorage에 저장 |
| `library {data}` | 「내 컴포넌트」 목록(JSON 문자열)을 clientStorage `library`에 저장 |
| `prefs {data}` | 화면 설정(언어·테마·팔레트 모음, JSON 문자열)을 clientStorage `prefs`에 저장 |
| `set-key {key}` | API 키 저장(빈 문자열이면 삭제) |
| `import-selection` | 선택 노드가 도트랩 개체면 `open-project`, 아니면 1배 PNG로 `import-image` |
| `insert {mode, frames, w, h, frameNames, project, replaceId, palette, asComponents, note}` | `vector`는 프레임마다 SVG 문자열과 `layerNames`, `image`는 PNG 바이트. `replaceId`가 있으면 그 자리에서 교체. `asComponents`면 프레임마다 컴포넌트를 만들어 `combineAsVariants`로 세트를 만들고(`frameNames`가 `상태=기본` 꼴), `note`(9-slice 여백)를 설명에 넣음 |
| `resize {w, h}` | 창 크기 (최소 720×520) |

| 메인 → UI | 내용 |
| --- | --- |
| `init {autosave, apiKey, library, prefs}`, `selection {count, name, dotlab}` | 시작 정보(라이브러리·설정 포함), 선택 변경. `boot()`는 `init(prefLoad())`로 설정을 넘김 |
| `open-project {data, nodeId, name}`, `import-image {bytes, name}` | 가져오기 결과 |
| `inserted {nodeId, name, updated}`, `error {text}` | 넣기 결과, 오류 문구 |

`figma/code.js`는 Figma 샌드박스에서 돌아갑니다. 호환성을 위해 `?.`, `??`, 객체 전개를 쓰지 않는 보수적인 문법을 유지합니다. `documentAccess: dynamic-page`이므로 노드 조회는 `getNodeByIdAsync` 같은 비동기 API를 씁니다.

## AI 호출

- 프롬프트는 `ai.js`에 있습니다. 팔레트를 문자표(`.`=투명, `0-9a-zA-Z`)로 주고 `{"rows": [...]}` JSON을 받습니다. 스트리밍 중에도 `partialRows`로 줄 단위 미리보기를 그립니다.
- Figma 버전 모델은 `platform/figma.js`의 `MODELS`에서 정합니다. 기본은 `claude-sonnet-5-5`, 빠름은 `claude-haiku-4-5-20251001`, 정밀은 `claude-opus-5-5`입니다. 이름은 Anthropic 문서로 확인해 최신으로 유지합니다.
- 브라우저에서 직접 호출하므로 `anthropic-dangerous-direct-browser-access: true` 헤더를 씁니다. 공개 배포용으로는 키를 서버에 두는 중계 서버로 바꾸는 것이 다음 과제입니다.

## 화면과 문구 규칙

- **언어**: 소스의 화면 문구는 한국어로 씁니다. 영어 모드에서는 `i18n.js`가 화면에 나타나는 텍스트와 `title`·`aria-label`·`placeholder`·`alt`를 그때그때 바꾸고, 한국어로 돌아오면 원문을 되돌립니다(렌더 코드에서 번역 함수를 부를 필요 없음). **새 문구를 넣으면 `I18N.en`에 영어를 추가합니다.** 값이 들어가는 문장(`${}`)은 `I18N.pats`에 `{}` 자리표시로 넣습니다(고정 글자가 많은 패턴이 먼저 맞춰짐). 사용자가 지은 이름(레이어·태그·라이브러리·저장한 팔레트)을 보여 주는 요소에는 `data-i18n="off"`를 붙입니다. 새 문서·레이어 같은 기본 *데이터* 이름은 `L('새 작품')`처럼 만들 때의 언어로 정합니다. `tests/prefs.test.mjs`가 영어 모드에서 화면에 한국어가 남지 않는지 확인합니다.
- 화면 문구는 한국어로 짧고 구체적으로 씁니다. 버튼은 하는 일을 말하고("새 캔버스로 열어 수정"), 오류는 무엇이 잘못됐고 어떻게 고치는지 말합니다.
- 디자인: 중립 회색 바탕(`--bg`) 위의 둥근 프레임(`--frame`) 안에 흰 패널(`--panel`, 모서리 14~18px, `--shadow`)이 떠 있는 구성입니다. 선택 상태는 회색 칸(`--panel-2`, `--hover`), 세그먼트 컨트롤은 회색 트랙(`.tabs`, `.group.track`) 위 흰 칸 + `--shadow-sm`, 주 버튼(`.btn.primary`)은 `--raise-a/b/hi` 그라데이션으로 살짝 볼록하게 그립니다. 단축키는 키마다 `kbd` 키캡으로 보여 줍니다.
- 색은 `src/shell.html`의 CSS 토큰(`--bg`, `--panel`, `--accent` 등)만 씁니다. 기본은 라이트(화이트)이고 시스템 설정을 따르지 않습니다. 다크는 `:root[data-theme="dark"]`이고 상단 버튼(`setTheme`)으로 바꾸며 설정에 저장됩니다. Figma 빌드도 같은 방식입니다(Figma 테마를 따르지 않음). 캔버스에 그리는 색은 `readTokens()`로 토큰에서 읽습니다.
- 결과물은 파일 하나여야 하므로 UI에 외부 라이브러리를 넣지 않습니다. 웹 버전만 Google Fonts를 씁니다(Figma 빌드에서는 제거됨).
- 폰 폭(400px)에서 가로 스크롤이 생기지 않아야 합니다(테스트로 확인).

## .aseprite 호환 (`src/editor/aseprite.js`)

- **사양**: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md 를 따릅니다. zlib은 브라우저의 `CompressionStream` / `DecompressionStream('deflate')`를 씁니다.
- **읽기** (`asepriteToDoc`):
  - 이미지 레이어만 가져옵니다. 그룹은 풀고(숨긴 그룹 안의 레이어는 숨김으로), 타일맵은 건너뜁니다.
  - 링크 셀은 공유 배열로, 태그는 태그로 가져옵니다. 태그 색은 태그 chunk 뒤의 사용자 데이터(0x2020, Aseprite 1.3+)를 먼저 쓰고, 없으면 태그 chunk의 RGB를 씁니다.
  - 인덱스 모드의 투명 색 번호는 Background 레이어에서는 불투명으로 다룹니다.
  - 팔레트는 파일 팔레트가 62색 이하면 그 순서를 쓰고, 넘으면 실제 쓰인 색으로 다시 만듭니다.
  - 반투명은 불투명도 절반을 기준으로 정리합니다. 바뀐 점은 `warnings`로 돌려줍니다.
- **쓰기** (`docToAseprite`):
  - 인덱스 8bpp로 씁니다. 0번 색이 투명이고, 도트랩 값 v가 그대로 팔레트 번호 v가 됩니다.
  - 빈 셀은 생략하고(다른 프레임이 링크한 빈 셀은 1×1 투명 셀로 남겨 링크를 유지), 링크 셀은 셀 형식 1로, 나머지는 잘라낸 뒤 zlib으로 압축합니다.
  - 태그 색은 태그 chunk의 RGB와 그 뒤 사용자 데이터 chunk 둘 다에 씁니다.
  - 외곽선 효과는 Aseprite에 없어서 픽셀로 굳혀 씁니다.

## 테스트

| 파일 | 확인하는 것 |
| --- | --- |
| `tests/editor.test.mjs` | 픽셀 퍼펙트, 실행 취소, 도형·채우기·이동, 저장 왕복, GIF 디코딩과 LZW 무손실, 폰 폭 레이아웃 |
| `tests/grid-detect.test.mjs` | 확대·잘림·JPG·2.5배·투명·1배 이미지에서 원본 격자와 픽셀을 100% 복원, 사진은 사진 모드 |
| `tests/figma-main.test.mjs` | `figma` 모의 객체로 code.js의 넣기·교체·이름 붙이기·색 스타일·가져오기·저장소, 게시 점검(`check-figma-release`, 임시 ID만 허용) |
| `tests/v1-features.test.mjs` | 링크 셀(공유·실행 취소·저장 왕복·팔레트 재매핑 한 번만), 태그(범위 이동·핑퐁/역방향 순서·태그 범위 GIF), `.aseprite` 쓰기를 독립 파서 `ase-parser`로 검증, 다시 읽어 원본과 일치, Aseprite가 저장한 실제 파일(`node_modules/ase-parser/indexed.aseprite`)을 독립 파서와 같은 픽셀로 가져오기, RGBA·그룹·링크·태그 파일 가져오기, 타임랩스(AI 단계 표시), 색감 옮기기(두 방식, 미리보기), 숨긴 그룹·사용자 데이터 태그 색·역방향 핑퐁 가져오기, 비어 있는 링크 셀 보존 |
| `tests/component.test.mjs` | 컴포넌트 모드 전환·템플릿(상태 수·이름·서로 다른 그림), 9-slice 계산(모서리 1:1, 가장자리 늘림), 캔버스 가이드 끌기와 실행 취소, 숫자 입력·상태 이름·빈 상태, 저장 형식 v3와 v2 읽기, 내보내기 파일·JSON 여백·CSS 선택자, 고정 크기 컴포넌트, 지금 그림을 컴포넌트로, 모서리 잠금(연필·채우기가 테두리로 새지 않음, 도트 모드에선 풀림), 모양 옵션 다시 그리기와 실행 취소·직접 고친 안쪽 영역 유지, 안쪽 반복(타일)과 CSS padding·round, 내 컴포넌트 저장·덮어쓰기·새로 저장·열기·파일 왕복·삭제, 폰 폭 |
| `tests/pages.test.mjs` | Pages 빌드가 완전한 문서인지, HTTP로 열어 오류 없이 뜨는지, AI 안내, 저장·PNG 내보내기가 실제 다운로드인지(내용 확인), 폰 폭 |
| `tests/prefs.test.mjs` | 다크 시스템에서도 라이트로 시작, 테마 전환과 캔버스 색, 1400px에서 상단 바 한 줄, 영어 전환 후 탭·대화상자·컴포넌트 패널·토스트에 한국어가 남지 않음, 사용자 이름은 그대로, 한국어로 되돌리기, 새로고침 후 설정 유지, 팔레트 모음(저장·없는 색 추가와 실행 취소·있는 색 선택·바꾸기·삭제) |
| `tests/tabs.test.mjs` | 새 캔버스가 새 탭으로, 탭마다 따로인 편집·실행 취소·화면 위치, 탭 이름이 문서 이름을 따름, 파일 열기도 새 탭, 새로고침 후 모든 탭과 활성 탭 복원, 예전 자동 저장 읽기, 닫기 확인·마지막 탭 닫기, 도트 그림에서 템플릿은 새 탭, 폰 폭 |
| `tests/figma-ui.test.mjs` | 가짜 Figma 호스트 안의 플러그인 창: 프로토콜, 벡터 SVG와 화면 일치, 다시 열기, 가져오기 격자 감지, 모의 API로 AI 스트리밍과 401 처리 |

실제 Figma 앱과 실제 Anthropic API 호출은 자동 테스트에 없으므로 직접 확인해야 합니다.

## 남은 작업 (기획서 로드맵 기준)

- **V1**: 완료 (`.aseprite` 가져오기/내보내기, 프레임 태그·링크 셀, 타임랩스, 색감 옮기기). 타임랩스 기록은 아직 세션 메모리에만 있어서 새로고침하면 사라집니다.
- **V2**: 방향 회전·포즈 지정·동작 애니메이션 생성, 스타일 고정, 타일맵·타일셋 생성과 Tiled 내보내기, 픽셀 텍스트(한글 도트 폰트), 비즈·십자수 도안, 펜·터치 최적화
- **배포**: Figma Community용 플러그인 ID 발급, API 키 중계 서버, 회원·결제·클라우드 저장(웹 서비스로 갈 경우)
