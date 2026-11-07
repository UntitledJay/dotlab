# 도트랩 DotLab — Figma 플러그인

Figma 안에서 픽셀아트를 직접 찍고, AI로 생성하고, 이미지를 도트로 바꿔 캔버스에 넣는 플러그인입니다.

## 설치 (개발용으로 불러오기)

1. Figma **데스크톱 앱**을 엽니다. 개발 중인 플러그인은 데스크톱 앱에서만 불러올 수 있습니다.
2. 아무 디자인 파일에서 메뉴 **Plugins → Development → Import plugin from manifest…** 를 고릅니다.
3. 이 폴더의 `manifest.json`을 선택합니다.
4. **Plugins → Development → 도트랩 DotLab** 으로 실행합니다.

폴더 안 파일:

| 파일 | 역할 |
| --- | --- |
| `manifest.json` | 플러그인 설정 (이름, 네트워크 허용 도메인, 다시 열기 버튼) |
| `code.js` | Figma 쪽 코드. 캔버스에 넣기, 선택 가져오기, 저장소, 색 스타일 |
| `ui.html` | 에디터 화면 전체 (그리기 도구, 레이어, 애니메이션, AI, 이미지 변환) |

## Figma와 연결되는 기능

- **Figma에 넣기**: 결과를 캔버스에 넣는 방식을 고를 수 있습니다.
  - **벡터**: 도트랩 레이어마다 그룹 하나, 색마다 도형 하나로 만듭니다. Figma에서 색을 바꾸거나 크기를 키워도 선명합니다.
  - **PNG 이미지**: 이미지 한 장으로 넣습니다.
  - **애니메이션**: 모든 프레임을 가로로 나란히 담은 오토 레이아웃 프레임으로 넣을 수 있습니다.
  - **색 스타일**: 팔레트를 `도트랩/작품이름/01 #hex` 이름의 색 스타일로 저장할 수 있습니다.
- **다시 편집**: 넣은 개체에는 도트랩 데이터(레이어·프레임·팔레트)가 함께 저장됩니다. 다시 여는 방법은 두 가지입니다.
  - 개체를 선택하고 오른쪽 패널의 **도트랩에서 편집** 버튼을 누릅니다.
  - 플러그인에서 **선택 편집**을 누릅니다.
  
  고친 뒤 넣기 창에서 "연결된 개체를 교체"를 켜 두면 원래 자리에 그대로 바뀝니다.
- **선택 가져오기**: 도트랩으로 만들지 않은 레이어도 가져올 수 있습니다. 1배 PNG로 가져와 "이미지 → 도트"에서 원본 픽셀 격자를 자동으로 찾아 변환합니다.
- **자동 저장**: 작업 내용은 Figma의 플러그인 저장소(`figma.clientStorage`)에 자동으로 저장됩니다.

## AI 생성과 API 키

플러그인은 사용자가 입력한 **Anthropic API 키**로 Claude API(`api.anthropic.com`)를 직접 호출합니다.

- 키는 AI 생성 탭의 "Anthropic API 키"에 입력합니다. 이 컴퓨터의 Figma 플러그인 저장소에만 보관됩니다.
- 요청 비용은 그 키의 계정에 청구됩니다.
- 품질 선택에 따라 쓰는 모델이 달라집니다.
  - 빠름: `claude-haiku-4-5-20251001`
  - 기본: `claude-sonnet-5-5`
  - 정밀: `claude-opus-5-5`
  
  바꾸려면 `ui.html`에서 `const MODELS=`를 찾아 수정하세요.
- 키가 없어도 에디터, 이미지 변환, Figma 넣기·가져오기는 모두 쓸 수 있습니다.

## Figma Community에 게시하기

게시는 Figma **데스크톱 앱**에서 플러그인 주인 계정으로 합니다. 메뉴 이름은 Figma가 바꿀 수 있으니 비슷한 이름을 찾으세요.

**준비 (한 번만)**

1. Figma 계정에 **2단계 인증**을 켭니다(계정 설정 → 보안). 켜져 있지 않으면 게시할 수 없습니다.
2. **플러그인 ID 받기**: 데스크톱 앱에서 **Plugins → Development → New plugin…** 을 고르고 이름을 「DotLab」으로 정한 뒤 「Figma design」을 고릅니다. 만들어진 폴더의 `manifest.json`에 있는 `"id"` 값(숫자)을 복사합니다. 그 폴더는 더 쓰지 않아도 됩니다.
3. 저장소에서 ID를 넣고 빌드합니다.
   ```bash
   npm run figma:id -- 1234567890123456789
   npm run build:figma
   npm run figma:check
   ```
   `figma:check`가 「게시 준비 완료」를 보여 주면 됩니다. ID를 넣은 `figma/manifest.json`은 커밋해 둡니다(업데이트할 때 같은 ID를 씁니다).

**게시 전 실제 앱에서 확인**

4. **Plugins → Development → Import plugin from manifest…** 로 `dist/figma/manifest.json`을 불러옵니다(이전에 불러온 개발용 「도트랩 DotLab」이 있으면 지우고 다시 불러옵니다).
5. 다음을 직접 해 봅니다. 자동 테스트는 가짜 Figma 환경이라 실제 앱에서만 확인할 수 있습니다.
   - 그리기·실행 취소, 창 크기 조절, 다크 모드 버튼과 KO/EN 전환(닫았다 열어도 유지되는지)
   - 「Figma에 넣기」 벡터·PNG, 넣은 개체 선택 → 「도트랩에서 편집」 → 제자리 교체
   - UI 컴포넌트 모드에서 템플릿 → 「Figma에 넣기」 → 상태별 변형이 있는 컴포넌트 세트
   - 내 컴포넌트에 저장 → 플러그인을 닫았다 열어도 남아 있는지
   - 파일로 내보내기(PNG, .aseprite)
   - API 키를 넣고 AI 생성 한 번(키가 없으면 건너뜀)

**게시**

6. **Plugins → Development → Manage plugins in development**(또는 플러그인 목록의 「…」 메뉴)에서 「도트랩 DotLab」 → **Publish** 를 누릅니다.
7. 게시 창에 `figma/publish/listing.md`의 문구를 옮겨 적고, 이미지를 올립니다.
   - 아이콘 `figma/publish/icon.png` (128×128)
   - 커버 `figma/publish/cover.png` (1920×1080)
   - 추가 이미지 `figma/publish/carousel-1.png` ~ `carousel-4.png`
8. 보안 공개(Data security)는 선택이지만, 외부 API를 쓰는 플러그인이니 `listing.md`의 답변 초안으로 채워 두는 편이 좋습니다(검토에 시간이 걸릴 수 있습니다).
9. 제출하면 Figma의 심사를 거쳐 Community에 올라갑니다. 결과는 메일로 옵니다.

**업데이트**

- 코드를 고친 뒤 `npm run build:figma` → `npm run figma:check` → 실제 앱에서 확인 → 같은 메뉴에서 **Publish new version** 으로 올립니다. ID는 바꾸지 않습니다.
- 화면이 바뀌었으면 `npm run figma:assets`로 게시 이미지를 다시 만듭니다.

**키 없이 AI를 제공하려면**

- 지금은 사용자가 자기 Anthropic API 키를 넣는 방식입니다. 키 없이 바로 쓰게 하려면 키를 보관하고 사용량을 제한하는 중계 서버를 두고, 플러그인은 그 서버만 호출하게 바꿉니다. 이때 `manifest.json`의 `allowedDomains`와 `reasoning`을 그 서버 주소로 바꿉니다.

## 알려진 제한

- 타임랩스 기록은 플러그인 창을 닫으면 사라집니다.
- 벡터로 넣을 때는 큰 캔버스(예: 256×256에 색이 많은 그림)일수록 도형이 커집니다. 이럴 때는 PNG 방식이 가볍습니다.
- 플러그인 창 크기는 오른쪽 아래 모서리를 끌어 조절합니다.
