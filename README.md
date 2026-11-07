# 도트랩 DotLab

직접 한 칸씩 찍는 도트 에디터에 AI 생성과 이미지 → 도트 변환을 붙인 픽셀아트 도구입니다. 웹 페이지와 Figma 플러그인 두 가지로 빌드됩니다.

## 시작하기

```bash
npm install
npx playwright install chromium   # 테스트를 돌릴 때만 필요
npm run build                     # dist/web/dotlab.html, dist/figma/
npm test
```

- **웹 버전**: `dist/web/dotlab.html`을 브라우저로 열면 에디터와 이미지 변환을 바로 쓸 수 있습니다. AI 생성은 Claude 아티팩트로 게시했을 때 동작합니다(기능 `sample`, `downloads`).
- **Figma 플러그인**: Figma 데스크톱 앱에서 Plugins → Development → Import plugin from manifest…로 `dist/figma/manifest.json`을 고릅니다. 자세한 사용법은 `figma/README.md`에 있습니다.

## 주요 기능

- **그리기**: 연필(픽셀 퍼펙트), 지우개, 채우기, 스포이드, 직선·사각형·원, 선택·마술봉·이동, 대칭, 디더, 타일 모드
- **팔레트와 레이어**: 인덱스 컬러 팔레트(최대 62색, 프리셋·램프·가져오기), 레이어(잠금, 알파 잠금, 불투명도, 외곽선 효과)
- **애니메이션**: 프레임, 어니언 스킨, 재생
- **AI**: 텍스트로 도트 생성, 선택 영역 다시 그리기, 문장으로 팔레트 만들기
- **이미지 → 도트**: 확대·압축된 도트 이미지에서 원래 픽셀 격자를 자동으로 찾아 복원
- **내보내기**: PNG, GIF, 스프라이트 시트 + JSON, 프로젝트 파일
- **Figma 연동**: 벡터·PNG로 넣기, 다시 열어 편집 후 제자리 교체, 선택 레이어 가져오기, 팔레트를 색 스타일로 저장

개발 구조와 규칙은 `CLAUDE.md`, 제품 기획은 `docs/plan.html`을 보세요.
