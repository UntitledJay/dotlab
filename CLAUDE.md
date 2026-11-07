# 도트랩 (DotLab) — Claude Code 작업 안내

직접 찍고 AI로 생성하는 픽셀아트 에디터입니다. 같은 소스에서 두 가지 결과물을 빌드합니다.

- **웹 버전** `dist/web/dotlab.html`: 파일 하나로 된 페이지. Claude 아티팩트로 게시해 쓰며, AI는 아티팩트 런타임(`window.claude.use('sample')`)으로 호출합니다.
- **Figma 플러그인** `dist/figma/`: `manifest.json`, `code.js`, `ui.html`. AI는 사용자가 입력한 Anthropic API 키로 호출합니다.

기획서는 `docs/plan.html`(v0.2, 경쟁 분석 포함)에 있습니다.

## 명령

```bash
npm install                 # playwright (테스트용)
npx playwright install chromium   # 처음 한 번
npm run build               # dist/web, dist/figma 둘 다
npm test                    # 빌드 후 테스트 5개 실행
```

- Chromium을 따로 설치한 환경이면 `CHROMIUM_PATH=/path/to/chrome npm test`로 실행합니다.
- 코드를 바꾸면 커밋 전에 `npm test`를 통과시킵니다.
- Figma 플러그인은 Figma 데스크톱 앱에서 Plugins → Development → Import plugin from manifest…로 `dist/figma/manifest.json`을 불러와 확인합니다.

## 폴더 구조

```
src/shell.html          화면 마크업 + CSS 전체 (디자인 토큰, 라이트/다크)
src/editor/core.js      유틸, 상태, 문서 모델, 합성·렌더, 히스토리, 그리기 도구, 선택, 레이어·프레임·팔레트 연산, 저장 형식
src/editor/ui.js        패널 렌더링, 대화상자, 파일 열기/내보내기, GIF 인코더
src/editor/conv.js      이미지 → 도트 (격자 자동 감지, 색 정리, 배경 제거)
src/editor/ai.js        AI 생성 (후보, 부분 다시 그리기, 팔레트 생성) + 웹 버전 기능 연결(initCapabilities)
src/editor/anim.js      프레임 태그, 링크 셀, 타임랩스 기록·GIF
src/editor/aseprite.js  .aseprite 읽기/쓰기 (zlib은 브라우저 CompressionStream)
src/editor/recolor.js   참조 이미지 색감 옮기기 (Lab 색공간, AI 없음)
src/editor/init.js      이벤트 연결, 단축키, init()
src/platform/figma.js   Figma 전용: postMessage 브리지, clientStorage 저장, 파일 다운로드, Anthropic API 호출, 캔버스 넣기·가져오기
src/platform/figma.css  플러그인 창 전용 CSS
src/platform/figma-keybox.html  AI 탭의 API 키 입력 칸
figma/                  플러그인 manifest.json, code.js(Figma 메인 스레드), README.md
scripts/build.mjs       두 결과물 빌드
tests/                  node:test + Playwright 테스트
docs/plan.html          기획서
```

## 구조에서 꼭 알아야 할 점

**모듈 시스템이 없습니다.** 빌드는 파일들을 순서대로 이어 붙여 `<script>` 하나로 만듭니다. 순서는 웹이 `core → ui → conv → ai → anim → aseprite → recolor → init`, Figma가 그 뒤 `init` 앞에 `platform/figma`가 들어갑니다. 새 파일을 만들면 `scripts/build.mjs`의 `EDITOR` 목록에 넣습니다. 모든 이름이 전역을 공유하므로 새 이름이 기존 것과 겹치지 않게 합니다. 예를 들어 `h()`는 DOM 헬퍼이므로 높이 변수는 `H`나 `hh`로 씁니다.

**플랫폼 차이는 함수 재선언으로 바꿉니다.** 같은 스크립트 안에서는 나중에 선언된 `function`이 이깁니다. `platform/figma.js`는 다음을 다시 선언합니다.

| 함수 | 웹 | Figma |
| --- | --- | --- |
| `scheduleSave` / `loadAutosave` | `localStorage` | 메인 스레드를 거쳐 `figma.clientStorage` |
| `offerFiles` | 아티팩트 `downloads` 기능 | `<a download>` |
| `initCapabilities` | `claude.use('sample')`, `claude.use('downloads')` | `claudeShim`(Anthropic Messages API 스트리밍) |

`let`/`const`는 재선언할 수 없으므로, 플랫폼별로 바꿔야 하는 값은 `function`이나 객체 속성으로 둡니다. Figma 빌드는 마지막 `init();`을 `boot();`로 바꿉니다. `boot()`는 메인 스레드의 `init` 메시지(자동 저장본과 API 키)를 받은 뒤 `init()`을 부릅니다.

**빌드는 문자열 치환에 의존합니다.** `scripts/build.mjs`의 Figma 빌드는 `src/shell.html`에서 특정 마크업을 찾아 바꿉니다(버튼, 상태 표시줄, API 키 칸, 테마 블록). 표시는 `replaceOnce`가 찾지 못하면 빌드가 멈추게 되어 있습니다. shell.html에서 해당 부분을 고치면 build.mjs도 함께 맞춥니다.

## 문서 모델

```js
doc = {
  name, w, h,                       // 캔버스 최대 256×256 (MAXSIZE)
  palette: ['#rrggbb', ...],        // 최대 62색 (MAXPAL, AI 문자표 0-9a-zA-Z 길이)
  layers: [{ id, name, visible, opacity, locked, alphaLock, outline }],  // 아래 → 위 순서. outline: 0 또는 팔레트 값
  frames: [{ dur /*ms*/, cels: { [layerId]: Uint8Array(w*h) } }],
  tags: [{ name, from, to, dir, color }],   // 프레임 구간(0부터, 끝 포함). dir: forward | reverse | pingpong | pingpong_reverse
}
```

- **링크 셀**은 여러 프레임의 `cels[id]`가 같은 `Uint8Array` 객체를 가리키는 것입니다. 한쪽에 그리면 모두 바뀌고, `structuredClone`(히스토리 스냅샷)이 공유를 그대로 보존합니다. 그래서 cel을 돌며 값을 바꾸는 코드는 `uniqueCels()`로 배열마다 한 번만 처리하고, cel을 새로 만들 때 `slice()`하면 링크가 풀린다는 점에 주의합니다. `linkSource(fi,id)`는 같은 배열을 쓰는 가장 앞 프레임입니다.
- 프레임을 넣고 빼는 연산은 `tagsInsert(i)` / `tagsRemove(i)`로 태그 범위를 함께 맞춥니다. 재생은 현재 프레임이 든 태그 구간만 그 방향으로 반복합니다.

- 픽셀 값 `0`은 투명, `v`는 `palette[v-1]`입니다(인덱스 컬러). 팔레트를 바꾸면 그림 전체가 바뀝니다. 색을 지우거나 순서를 바꿀 때는 `remapAll(map)`으로 모든 cel을 다시 매핑합니다.
- 저장 형식(`serialize`/`deserialize`): `{format:'dotlab',version:2,...}`이고, cel은 RLE 후 base64 문자열, 링크 셀은 원본 프레임 번호(숫자)로 저장합니다. `tags`도 들어갑니다. 버전 1 파일도 읽습니다. 형식을 바꾸면 `version`을 올리고 이전 버전 읽기를 유지합니다. Figma에 넣은 개체의 `pluginData('dotlab')`에도 같은 문자열이 들어갑니다.

## 편집 규칙 (실행 취소와 다시 그리기)

- 픽셀만 바꾸는 작업은 `beginEdit()` → 활성 cel 수정 → `endEdit()`로 감쌉니다. cel 단위 차이가 히스토리에 기록됩니다.
- 레이어·프레임·팔레트·캔버스 크기를 바꾸는 작업은 `docChange(() => { ... })`로 감쌉니다. 문서 스냅샷이 기록되고 `refreshAll()`이 실행됩니다.
- `pushHist`·`undo`·`redo`가 `tlRecord()`로 타임랩스 단계를 기록합니다(현재 프레임을 인덱스 이미지로, 같은 화면은 건너뜀, 600단계를 넘으면 절반으로 솎음). AI 결과를 넣는 곳은 그 전에 `TL.mark='ai'`를 두어 GIF에 AI 표시가 붙게 합니다.
- 화면만 다시 그리려면 `changed()`를 부릅니다(합성 캐시 무효화와 다시 그리기). 레이어 표시 여부처럼 히스토리에 넣지 않는 설정은 바꾼 뒤 `changed()`와 `scheduleSave()`를 부릅니다.
- 그리기 함수는 `setPx`를 거칩니다. 선택 영역, 알파 잠금, 디더, 타일 모드 감싸기가 거기서 처리되므로 cel 배열에 직접 쓰지 않습니다. 이동·붙여넣기처럼 의도적으로 직접 쓰는 곳은 예외입니다.

## Figma 메시지 프로토콜 (UI ↔ code.js)

| UI → 메인 | 내용 |
| --- | --- |
| `ready` | UI 준비 완료. 메인이 `init`과 `selection`으로 답함 |
| `autosave {data}` | 직렬화한 문서를 clientStorage에 저장 |
| `set-key {key}` | API 키 저장(빈 문자열이면 삭제) |
| `import-selection` | 선택 노드가 도트랩 개체면 `open-project`, 아니면 1배 PNG로 `import-image` |
| `insert {mode, frames, w, h, frameNames, project, replaceId, palette}` | `vector`는 프레임마다 SVG 문자열과 `layerNames`, `image`는 PNG 바이트. `replaceId`가 있으면 그 자리에서 교체 |
| `resize {w, h}` | 창 크기 (최소 720×520) |

| 메인 → UI | 내용 |
| --- | --- |
| `init {autosave, apiKey}`, `selection {count, name, dotlab}` | 시작 정보, 선택 변경 |
| `open-project {data, nodeId, name}`, `import-image {bytes, name}` | 가져오기 결과 |
| `inserted {nodeId, name, updated}`, `error {text}` | 넣기 결과, 오류 문구 |

`figma/code.js`는 Figma 샌드박스에서 돌아갑니다. 호환성을 위해 `?.`, `??`, 객체 전개를 쓰지 않는 보수적인 문법을 유지합니다. `documentAccess: dynamic-page`이므로 노드 조회는 `getNodeByIdAsync` 같은 비동기 API를 씁니다.

## AI 호출

- 프롬프트는 `ai.js`에 있습니다. 팔레트를 문자표(`.`=투명, `0-9a-zA-Z`)로 주고 `{"rows": [...]}` JSON을 받습니다. 스트리밍 중에도 `partialRows`로 줄 단위 미리보기를 그립니다.
- Figma 버전 모델은 `platform/figma.js`의 `MODELS`에서 정합니다. 기본은 `claude-sonnet-5-5`, 빠름은 `claude-haiku-4-5-20251001`, 정밀은 `claude-opus-5-5`입니다. 이름은 Anthropic 문서로 확인해 최신으로 유지합니다.
- 브라우저에서 직접 호출하므로 `anthropic-dangerous-direct-browser-access: true` 헤더를 씁니다. 공개 배포용으로는 키를 서버에 두는 중계 서버로 바꾸는 것이 다음 과제입니다.

## 화면과 문구 규칙

- 화면 문구는 한국어로 짧고 구체적으로 씁니다. 버튼은 하는 일을 말하고("새 캔버스로 열어 수정"), 오류는 무엇이 잘못됐고 어떻게 고치는지 말합니다.
- 색은 `src/shell.html`의 CSS 토큰(`--bg`, `--panel`, `--accent` 등)만 씁니다. 라이트·다크 둘 다 정의되어 있고, Figma 빌드는 `html.figma-dark` / `html.figma-light` 블록을 자동으로 만듭니다. 캔버스에 그리는 색은 `readTokens()`로 토큰에서 읽습니다.
- 결과물은 파일 하나여야 하므로 UI에 외부 라이브러리를 넣지 않습니다. 웹 버전만 Google Fonts를 씁니다(Figma 빌드에서는 제거됨).
- 폰 폭(400px)에서 가로 스크롤이 생기지 않아야 합니다(테스트로 확인).

## 테스트

| 파일 | 확인하는 것 |
| --- | --- |
| `tests/editor.test.mjs` | 픽셀 퍼펙트, 실행 취소, 도형·채우기·이동, 저장 왕복, GIF 디코딩과 LZW 무손실, 폰 폭 레이아웃 |
| `tests/grid-detect.test.mjs` | 확대·잘림·JPG·2.5배·투명·1배 이미지에서 원본 격자와 픽셀을 100% 복원, 사진은 사진 모드 |
| `tests/figma-main.test.mjs` | `figma` 모의 객체로 code.js의 넣기·교체·이름 붙이기·색 스타일·가져오기·저장소 |
| `tests/v1.test.mjs` | 링크 셀(그리기·실행 취소·저장·색 삭제·합치기·해제), 태그(범위 자동 조정·구간 재생·시트 JSON), `.aseprite` 왕복과 별도로 만든 RGBA·그룹·raw cel·링크 파일 읽기, 타임랩스 GIF 프레임 수와 AI 표시, 색감 옮기기와 실행 취소 |
| `tests/figma-ui.test.mjs` | 가짜 Figma 호스트 안의 플러그인 창: 프로토콜, 벡터 SVG와 화면 일치, 다시 열기, 가져오기 격자 감지, 모의 API로 AI 스트리밍과 401 처리 |

실제 Figma 앱과 실제 Anthropic API 호출은 자동 테스트에 없으므로 직접 확인해야 합니다.

## 남은 작업 (기획서 로드맵 기준)

- **V1 완료**: `.aseprite` 가져오기/내보내기, 프레임 태그·링크 셀, 타임랩스, 컬러 스타일 트랜스퍼. 남은 것: 타임랩스 MP4 출력, 기록을 창 밖에 보관(IndexedDB), `.aseprite`의 타일맵·슬라이스·사용자 데이터
- **V2**: 방향 회전·포즈 지정·동작 애니메이션 생성, 스타일 고정, 타일맵·타일셋 생성과 Tiled 내보내기, 픽셀 텍스트(한글 도트 폰트), 비즈·십자수 도안, 펜·터치 최적화
- **배포**: Figma Community용 플러그인 ID 발급, API 키 중계 서버, 회원·결제·클라우드 저장(웹 서비스로 갈 경우)
