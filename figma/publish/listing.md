# Figma Community 게시 문구

Figma 데스크톱 앱의 게시(Publish) 창에 아래 내용을 옮겨 적습니다. 창의 항목 이름과 순서는 Figma가 바꿀 수 있으니 이름이 비슷한 칸에 넣으면 됩니다.

## 이름

```
DotLab 도트랩 — Pixel Art Editor
```

## 한 줄 소개 (Tagline)

```
Draw pixel art, make pixel UI components and drop them into Figma — with optional AI generation.
```

한국어로 쓰고 싶다면:

```
Figma 안에서 픽셀아트를 찍고, 픽셀 UI 컴포넌트로 만들어 바로 넣습니다. AI 생성도 선택해서 씁니다.
```

## 설명 (Description)

```
DotLab is a real pixel-art editor inside Figma. Draw pixel by pixel, animate, turn blurry upscaled sprites back into clean pixels, build pixel UI components with states and 9-slice — and insert everything as crisp vectors you can reopen and edit later.

EDITOR
• Pixel-perfect pencil, eraser, fill, shapes, selection, mirror and tile modes, dithering
• Indexed palette (up to 62 colours) with presets, ramps and palette import
• Palette shelf: see the open palette, your saved palettes and presets side by side and pick colours from any of them
• Layers (alpha lock, opacity, outline effect), frames, onion skin, frame tags, linked cels
• Open and save .aseprite files; export PNG, GIF, sprite sheet + JSON, timelapse GIF

PIXEL UI COMPONENTS
• Button, panel, input, checkbox, toggle, progress bar, tab and speech bubble templates
• Adjust size, corner radius, border and depth; every state (hover, pressed, disabled…) is redrawn
• Corners and edges are locked so you only paint the inside; 9-slice guides on the canvas
• Save components to your own library; export PNGs + 9-slice JSON + CSS border-image
• Insert into Figma as a component set — each state becomes a variant

IMAGE → PIXEL
• Finds the original pixel grid in upscaled or JPEG-damaged sprites and restores clean pixels
• Background removal, colour clean-up, map to your palette

FIGMA
• Insert as vectors (one group per layer, one shape per colour) or PNG
• Reopen any inserted object in DotLab and replace it in place
• Save the palette as colour styles

AI (OPTIONAL)
• Generate sprites from a sentence, redraw a selected area, create palettes from a theme
• Uses your own Anthropic API key (Claude). Without a key, every other feature works.

The interface is available in English and Korean (switch in the top bar). Light theme by default, with a dark theme toggle.
```

한국어 설명:

```
도트랩은 Figma 안에서 쓰는 픽셀아트 에디터입니다. 한 칸씩 찍고, 애니메이션을 만들고, 흐릿한 확대본을 원래 도트로 되돌리고, 상태와 9-slice를 가진 픽셀 UI 컴포넌트를 만들어 선명한 벡터로 넣습니다. 넣은 개체는 언제든 다시 열어 고칠 수 있습니다.

• 에디터: 픽셀 퍼펙트 연필, 채우기, 도형, 선택, 대칭·타일 모드, 디더, 인덱스 팔레트(최대 62색), 레이어, 애니메이션, 어니언 스킨, 프레임 태그, 링크 셀, .aseprite 열기·저장, PNG·GIF·스프라이트 시트·타임랩스 내보내기
• 픽셀 UI 컴포넌트: 버튼·패널·입력칸·체크박스·토글·진행 바·탭·말풍선 템플릿, 크기·모서리·테두리·입체감 조절, 모서리 잠금(안쪽만 그리기), 9-slice, 내 컴포넌트 라이브러리, PNG + 9-slice JSON + CSS 내보내기, Figma에 상태별 변형(Variant)으로 넣기
• 이미지 → 도트: 확대·압축된 도트 이미지에서 원래 픽셀 격자를 찾아 복원, 배경 제거, 색 정리
• Figma 연결: 벡터·PNG로 넣기, 다시 열어 제자리 교체, 팔레트를 색 스타일로 저장
• 화면: 한국어 / English 전환, 기본 라이트 모드와 다크 모드 버튼, 여러 팔레트를 나란히 보는 팔레트 모음
• AI(선택): 문장으로 도트 생성, 선택 영역 다시 그리기, 주제로 팔레트 만들기. 본인의 Anthropic API 키를 씁니다. 키가 없어도 다른 기능은 모두 씁니다.
```

## 태그

`pixel art`, `pixel`, `sprite`, `8-bit`, `aseprite`, `animation`, `game`, `icon`, `ui kit`, `9-slice`, `ai`

게시 창이 받는 개수만큼 앞에서부터 넣습니다.

## 이미지

| 칸 | 파일 | 크기 |
| --- | --- | --- |
| 아이콘 | `figma/publish/icon.png` | 128×128 |
| 커버(썸네일) | `figma/publish/cover.png` | 1920×1080 |
| 추가 이미지 | `figma/publish/carousel-1.png` ~ `carousel-4.png` | 1920×1080 |

화면이 바뀌면 `node scripts/figma-assets.mjs`로 다시 만듭니다.

## 지원 연락처 (Support contact)

```
https://github.com/UntitledJay/dotlab/issues
```

이메일을 공개 연락처로 쓰고 싶다면 이 칸에 직접 넣습니다.

## 네트워크 사용 설명

`manifest.json`의 `networkAccess.reasoning`이 Community 페이지에 허용 도메인 목록과 함께 그대로 공개됩니다. 지금 문구:

> AI generation only: calls the Claude API (api.anthropic.com) with the Anthropic API key the user enters. No other network access; every other feature works offline. / AI 생성 기능만 사용자가 입력한 Anthropic API 키로 Claude API를 호출합니다.

## 보안 공개 (Data security) 답변 초안

선택 항목이지만, 외부 API에 데이터를 보내는 플러그인이라 채워 두는 편이 좋습니다. 창의 질문에 맞춰 아래 사실을 옮깁니다.

- **개발자가 모으는 데이터**: 없음. 개발자 서버가 없고, 분석·추적 코드도 없습니다.
- **외부로 보내는 데이터**: 사용자가 AI 기능 버튼을 눌렀을 때만 `https://api.anthropic.com`으로 보냅니다.
  - 내용: 입력한 문장, 현재 팔레트 색상값, 「선택 영역 다시 그리기」일 때는 선택 영역 주변의 픽셀 격자(문자표).
  - 이미지 파일, Figma 문서의 다른 내용, 사용자 정보는 보내지 않습니다.
  - Anthropic의 데이터 처리는 사용자 본인의 Anthropic 계정 약관을 따릅니다.
- **API 키**: 사용자가 입력하면 `figma.clientStorage`(그 컴퓨터의 Figma 플러그인 저장소)에만 저장됩니다. Anthropic API 호출 헤더에만 쓰이고 다른 곳으로 보내지 않습니다. 키 삭제 버튼이 있습니다.
- **기기에 저장하는 데이터**: `figma.clientStorage`에 자동 저장본, 내 컴포넌트 라이브러리, API 키, 화면 설정(언어·테마·저장한 팔레트)을 저장합니다.
- **문서에 저장하는 데이터**: 넣은 개체의 `pluginData`에 도트랩 프로젝트(레이어·프레임·팔레트)를 저장합니다. 다시 열어 고치기에 씁니다.
- **네트워크**: 모든 요청은 HTTPS이고, `manifest.json`의 `allowedDomains`로 `https://api.anthropic.com` 하나만 허용합니다.

## 심사 전에 알아 둘 점

- **화면 언어**: 상단의 KO / EN으로 한국어와 영어를 바꿉니다(선택은 `figma.clientStorage`에 저장). 심사자가 영어로 보도록 게시 이미지와 설명은 영어를 먼저 둡니다.
- **API 키 직접 입력**: 사용자가 자기 키를 넣는 방식은 키가 사용자 브라우저에서 바로 Anthropic으로 갑니다. 많은 사용자에게 키 없이 AI를 제공하려면 키를 보관하는 중계 서버가 필요합니다. 그때는 `allowedDomains`를 그 서버 주소로 바꿉니다.
- **유료 기능 없음**: 플러그인 자체에는 결제가 없습니다.
