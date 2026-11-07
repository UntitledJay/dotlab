/* ================= language: 한국어 / English =================
   The source is written in Korean. In English mode a MutationObserver translates every text node and the
   title / aria-label / placeholder / alt attributes as they appear (panels, dialogs, toasts…), and puts the
   Korean back when switching to Korean. Nothing calls a translate function at render time.
   Lookup order for a piece of text: exact entry in I18N.en → a pattern in I18N.pats ({} captures, {*} may be empty;
   captures are translated too) → known phrases inside it, only where they stand as whole Hangul words.
   Elements with data-i18n="off" (user-named layers, library items) are left alone.
   L(ko) gives the current language's word for default *data* names (new document, layer 1 …). */
const I18N={lang:'ko',en:{
// top bar, modes, view
'도트':'Pixel','UI 컴포넌트':'UI Components','새로 만들기':'New','열기':'Open','저장':'Save','내보내기':'Export','맞춤':'Fit','그리드':'Grid','타일 모드':'Tile mode','좌우 대칭':'Mirror X','상하 대칭':'Mirror Y','단축키':'Shortcuts',
'작품 이름':'Artwork name','편집 모드':'Editing mode','픽셀 아트를 그리고 애니메이션을 만듭니다':'Draw pixel art and animate it','버튼·패널 같은 픽셀 UI 컴포넌트를 상태와 9-slice로 만듭니다':'Make pixel UI components such as buttons and panels, with states and 9-slice',
'프로젝트(.json), 이미지, 팔레트 파일 열기':'Open a project (.json), image or palette file','프로젝트 저장 (Ctrl+S)':'Save project (Ctrl+S)','실행 취소 (Ctrl+Z)':'Undo (Ctrl+Z)','실행 취소':'Undo','다시 실행 (Ctrl+Shift+Z)':'Redo (Ctrl+Shift+Z)','다시 실행':'Redo',
'축소 (-)':'Zoom out (-)','축소':'Zoom out','확대 (+)':'Zoom in (+)','확대':'Zoom in','화면에 맞춤 (0)':'Fit to screen (0)','3×3 반복 미리보기, 가장자리를 넘어 그리면 반대편에 이어짐':'3×3 repeat preview; drawing past an edge continues on the other side',
'언어':'Language','다크 모드':'Dark mode','라이트 모드':'Light mode','다크 모드로 바꾸기':'Switch to dark mode','라이트 모드로 바꾸기':'Switch to light mode',
'파일을 놓으면 열립니다':'Drop the file to open it','좌표':'Position','도구':'Tools',
'주 색상 (왼쪽 클릭)':'Primary colour (left click)','주 색상':'Primary colour','보조 색상 (오른쪽 클릭)':'Secondary colour (right click)','보조 색상':'Secondary colour','주/보조 색 바꾸기 (X)':'Swap primary and secondary (X)',
// timeline
'지속':'Duration','어니언 스킨':'Onion skin','빈 프레임':'Empty frame','복제':'Duplicate','링크 복제':'Linked copy','링크 해제':'Unlink','삭제':'Delete','태그 추가':'Add tag','재생 / 정지 (Enter)':'Play / stop (Enter)','재생':'Play','정지':'Stop','재생 범위':'Playback range',
'이전 프레임(빨강)과 다음 프레임(파랑)을 겹쳐 보기':'Show the previous (red) and next (blue) frames underneath','지금 프레임을 복사한 독립 프레임':'An independent copy of this frame','지금 프레임과 그림을 공유하는 프레임. 한쪽을 고치면 함께 바뀝니다':'A frame that shares its pixels with this one; editing one changes both','선택한 레이어의 이 프레임 셀만 따로 고칠 수 있게 링크를 풉니다':'Unlink this frame\'s cel on the selected layer so it can be edited on its own',
'앞으로 이동':'Move earlier','프레임 앞으로':'Move frame earlier','뒤로 이동':'Move later','프레임 뒤로':'Move frame later','지금 프레임에서 시작하는 태그 만들기':'Create a tag starting at this frame','전체 프레임':'All frames','태그 편집':'Edit tag','역방향':'Reverse','핑퐁':'Ping-pong','역방향 핑퐁':'Reverse ping-pong',
'더블클릭해 상태 이름 바꾸기':'Double-click to rename the state','빈 상태':'Empty state','상태 복제':'Duplicate state',
// side tabs
'AI 생성':'AI','이미지 → 도트':'Image → Pixel','참조 이미지':'Reference','컴포넌트':'Component',
'AI 기능을 준비하는 중입니다…':'Getting AI ready…','무엇을 그릴까요?':'What should I draw?','스타일':'Style','캐릭터 (정면)':'Character (front)','캐릭터 (측면)':'Character (side)','아이템 아이콘':'Item icon','몬스터':'Monster','배경 타일 (이음새 없음)':'Background tile (seamless)','이모지 · 아이콘':'Emoji · icon','자유':'Free',
'크기':'Size','어두운 외곽선':'Dark outline','투명 배경':'Transparent background','품질':'Quality','빠름':'Fast','기본':'Default','정밀 (느림)':'Detailed (slow)','생성':'Generate','중지':'Stop','선택 영역 다시 그리기':'Redraw selection','수정 요청':'Request edit','문장으로 팔레트 만들기':'Palette from a sentence','팔레트 생성':'Make palette',
'예: 빨간 망토를 두른 작은 기사':'e.g. a small knight with a red cape','예: 칼을 도끼로 바꿔줘':'e.g. turn the sword into an axe','예: 해질녘 사막, 오래된 게임기 느낌':'e.g. desert at dusk, old handheld console','팔레트 주제':'Palette theme','색 수':'Colour count',
'도트 이미지(확대본, JPG 저장본 포함)나 사진을 고르거나 끌어 놓으세요. 이 화면에 붙여넣어도 됩니다. 처리는 이 브라우저 안에서만 합니다.':'Choose or drop pixel art (upscaled or JPG copies are fine) or a photo. You can also paste here. Everything is processed in this browser.',
'원본 · 감지한 격자':'Original · detected grid','결과':'Result','원본 픽셀 크기 자동 감지':'Detect the original pixel size','현재 캔버스 크기에 맞추기':'Fit to the current canvas','도트 1칸 =':'1 pixel =','다시 감지':'Detect again','전체 보이기':'Contain','꽉 채우기':'Cover','채도 보정':'Saturation boost',
'이미지 색 그대로 (거의 같은 색은 하나로)':'Keep image colours (merge near-identical ones)','색 수를':'Reduce to','개로 줄이기':'colours','현재 팔레트 색에 맞추기':'Match the current palette','배경 제거':'Remove background','튀는 픽셀 정리':'Clean stray pixels',
'새 캔버스로 열어 수정':'Open as new canvas','현재 캔버스에 레이어로 넣기':'Add as a layer','참조 이미지로 쓰기':'Use as reference','변환할 이미지':'Image to convert','결과 크기':'Result size','색 처리':'Colours',
'따라 그릴 사진이나 그림을 캔버스에 겹쳐 띄웁니다. 참조 이미지는 저장과 내보내기에 포함되지 않습니다.':'Overlay a photo or drawing to trace. The reference is not saved or exported.','참조 이미지 파일':'Reference image file','불투명도':'Opacity','보이기':'Show','그림 위에 표시':'Show above the art','참조 이미지 제거':'Remove reference',
'색감 옮기기':'Colour transfer','참조 이미지의 색감을 지금 팔레트에 입힙니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.':'Applies the reference image\'s colours to the palette, pairing colours by brightness so the light and shade of the art stay the same.',
'참조 이미지의 전체 색조·밝기·채도를 팔레트에 맞춥니다. 색마다 역할(어두운 외곽선, 밝은 하이라이트)은 그대로 남아 자연스럽습니다.':'Matches the palette\'s overall hue, brightness and saturation to the reference. Each colour keeps its role (dark outline, bright highlight), so it stays natural.',
'위에서 참조 이미지를 올리면, 그 색감을 지금 팔레트에 입힐 수 있습니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.':'Load a reference image above to apply its colours to the palette. Colours are paired by brightness, so light and shade stay the same.',
'방식':'Method','밝기 순서대로 바꾸기':'Swap by brightness','분위기만 맞추기':'Match the mood','강도':'Strength','팔레트에 적용':'Apply to palette','색감 옮기기 방식':'Colour transfer method','지금':'Now','적용 후':'After','참조 이미지의 색감을 팔레트에 입혔습니다. Ctrl+Z로 되돌릴 수 있습니다.':'Applied the reference colours to the palette. Ctrl+Z undoes it.',
// layers and palette
'레이어':'Layers','팔레트':'Palette','새 레이어':'New layer','레이어 복제':'Duplicate layer','위로':'Up','레이어 위로':'Move layer up','아래로':'Down','레이어 아래로':'Move layer down','아래 레이어와 합치기':'Merge down','레이어 삭제':'Delete layer',
'클릭: 주 색상 · 오른쪽 클릭: 보조 색상 · 더블클릭: 색 편집':'Click: primary · right click: secondary · double-click: edit','색 추가':'Add colour','편집':'Edit','램프':'Ramp','프리셋':'Presets','가져오기':'Import','주 색상에서 보조 색상까지 중간색 만들기':'Make in-between colours from primary to secondary',
'더블클릭해 이름 바꾸기':'Double-click to rename','레이어 이름':'Layer name','숨기기':'Hide','레이어 숨기기':'Hide layer','레이어 보이기':'Show layer','알파 잠금':'Alpha lock','외곽선 효과':'Outline effect','외곽':'Outline','잠금 풀기':'Unlock','잠그기':'Lock','레이어 잠금 풀기':'Unlock layer','레이어 잠그기':'Lock layer',
'이미 칠한 픽셀만 다시 칠합니다':'Only repaints pixels that are already painted','켜는 순간의 주 색상으로 1px 외곽선을 그립니다. 원본 픽셀은 바뀌지 않습니다.':'Draws a 1px outline in the primary colour at the moment you turn it on. The pixels themselves don\'t change.',
'투명':'Transparent','열린 캔버스':'Open canvases','캔버스 닫기':'Close canvas','새 캔버스 (새 탭)':'New canvas (new tab)','새 탭으로 열립니다. 지금 캔버스는 원래 탭에 그대로 남습니다.':'Opens in a new tab. The current canvas stays in its own tab.','도트랩 에디터':'DotLab editor','도트랩':'DotLab','캔버스 전체':'whole canvas','팔레트 모음':'Palette shelf','모음':'Shelf','여러 팔레트를 한눈에 보고 색을 가져옵니다':'See several palettes at once and pick colours from them','지금 팔레트 저장':'Save current palette','저장한 팔레트':'Saved palettes','지금 팔레트':'Current palette','바꾸기':'Use',
'이 팔레트로 바꾸기':'Switch to this palette','팔레트 이름':'Palette name','팔레트 저장':'Save palette','모음에 저장':'Save to shelf','팔레트를 모음에 저장했습니다':'Saved the palette to the shelf','팔레트를 지웠습니다':'Deleted the palette','팔레트 삭제':'Delete palette',
'색을 클릭하면 주 색상으로, 오른쪽 클릭하면 보조 색상으로 씁니다. 지금 팔레트에 없는 색은 끝에 추가됩니다.':'Click a colour to use it as primary, right click for secondary. Colours not in the current palette are added at the end.',
'아직 저장한 팔레트가 없습니다. 지금 팔레트나 AI가 만든 팔레트를 저장해 두면 여기서 함께 볼 수 있습니다.':'No saved palettes yet. Save the current palette or one the AI made, and it shows up here.',
'팔레트가 꽉 차서 색을 더할 수 없습니다':'The palette is full; no more colours can be added','이 팔레트를 모음에서 지웁니다. 되돌릴 수 없습니다.':'Removes this palette from the shelf. This can\'t be undone.',
// tools
'연필':'Pencil','Shift+클릭: 마지막 점에서 직선 · 오른쪽 버튼: 보조 색상':'Shift+click: line from the last point · right button: secondary colour','지우개':'Eraser','투명으로 지웁니다':'Erases to transparent','채우기':'Fill','Shift+클릭: 같은 색 전체를 한 번에':'Shift+click: every pixel of that colour at once','스포이드':'Eyedropper','보이는 그림에서 색을 집습니다 · 오른쪽 버튼: 보조 색상':'Picks a colour from what you see · right button: secondary colour',
'직선':'Line','Shift: 수평·수직·45° 고정':'Shift: snap to horizontal, vertical or 45°','사각형':'Rectangle','Shift: 정사각형':'Shift: square','원':'Ellipse','Shift: 정원':'Shift: circle','사각 선택':'Rectangle select','드래그로 선택 · 클릭하면 선택 해제 · 선택 안에서만 그려집니다':'Drag to select · click to deselect · drawing stays inside the selection',
'마술봉':'Magic wand','같은 색으로 이어진 영역 선택 · Shift: 선택 추가':'Selects connected pixels of one colour · Shift: add to selection','이동':'Move','선택이 있으면 선택한 픽셀만, 없으면 레이어 전체를 옮깁니다':'Moves the selected pixels, or the whole layer when nothing is selected','화면 이동':'Pan','Space를 누른 채 드래그해도 됩니다 · 휠: 확대/축소':'Or drag while holding Space · wheel: zoom',
'브러시 작게':'Smaller brush','브러시 크게':'Larger brush','픽셀 퍼펙트':'Pixel perfect','곡선에서 생기는 L자 꺾임 픽셀을 자동으로 지웁니다 (크기 1일 때)':'Removes the L-shaped corner pixels curves leave behind (size 1)','디더':'Dither','체커보드 무늬로 한 칸씩 건너 칠합니다':'Paints every other pixel in a checkerboard pattern','속 채우기':'Filled',
'선택 해제':'Deselect','좌우 뒤집기':'Flip horizontally','상하 뒤집기':'Flip vertically','복사':'Copy','지우기':'Clear','전체 선택':'Select all','레이어 전체':'Whole layer','붙여넣기':'Paste',
'모서리·테두리는 잠겨 있어 안쪽만 그려집니다. 컴포넌트 탭에서 잠금을 풀 수 있습니다.':'Corners and edges are locked, so only the inside is painted. Unlock them in the Component tab.',
// messages (core)
'복사할 영역을 먼저 선택하세요':'Select an area to copy first','복사했습니다':'Copied','복사한 내용이 없습니다':'Nothing has been copied','새 레이어에 붙여넣었습니다. 이동 도구로 옮기세요.':'Pasted into a new layer. Use the Move tool to position it.',
'잠긴 레이어입니다. 레이어 목록에서 자물쇠를 풀어 주세요.':'This layer is locked. Unlock it in the layer list.','숨긴 레이어에는 그릴 수 없습니다. 눈 아이콘으로 다시 보이게 하세요.':'You can\'t draw on a hidden layer. Show it again with the eye icon.',
'레이어가 하나뿐이라 삭제할 수 없습니다':'There is only one layer, so it can\'t be deleted','맨 아래 레이어는 합칠 대상이 없습니다':'The bottom layer has nothing to merge into','이 프레임의 셀은 다른 프레임과 링크되어 있지 않습니다':'This frame\'s cel isn\'t linked to another frame','링크를 풀었습니다. 이제 이 프레임만 따로 고칠 수 있습니다.':'Unlinked. You can now edit this frame on its own.',
'프레임이 하나뿐이라 삭제할 수 없습니다':'There is only one frame, so it can\'t be deleted','이 태그에는 프레임이 하나뿐입니다':'This tag has only one frame','프레임을 2개 이상 만들면 재생할 수 있습니다':'Make at least 2 frames to play','읽을 수 있는 색이 없습니다':'No readable colours','새로 추가할 색이 없습니다':'No new colours to add',
'투명은 삭제할 수 없습니다':'Transparent can\'t be deleted','색이 하나뿐이라 삭제할 수 없습니다':'There is only one colour, so it can\'t be deleted','주 색상과 보조 색상에 서로 다른 색을 고른 뒤 사용하세요':'Pick different primary and secondary colours first','도트랩 프로젝트 파일이 아닙니다':'This is not a DotLab project file','캔버스 크기가 올바르지 않습니다':'The canvas size is not valid',
// default data names (L())
'새 작품':'Untitled','레이어 1':'Layer 1','물약 (예시)':'Potion (sample)','예시 · 병':'Sample · bottle','예시 · 거품':'Sample · bubbles','보글보글':'Bubbling','태그':'Tag','작품':'Artwork','레이어':'Layers','가져온 이미지':'Imported image','변환 이미지':'Converted image',
'PICO-8 (16색)':'PICO-8 (16 colours)','Sweetie 16 (16색)':'Sweetie 16 (16 colours)','휴대용 게임기 녹색 (4색)':'Handheld green (4 colours)','흙과 숲 (8색)':'Earth and forest (8 colours)','흑백 (2색)':'Black and white (2 colours)','회색 (8색)':'Greys (8 colours)',
// status, dialogs
'닫기':'Close','너비':'Width','높이':'Height','지금 쓰는 팔레트 유지':'Keep the current palette','새 캔버스':'New canvas','지금 작업은 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다. 보관하려면 먼저 저장하세요.':'You can get the current work back with undo (Ctrl+Z). Save first to keep it.',
'취소':'Cancel','만들기':'Create','투명은 편집할 수 없습니다. 다른 색을 고르세요.':'Transparent can\'t be edited. Pick another colour.','색 선택':'Pick colour','16진수 색상 코드':'Hex colour code','팔레트에 색 추가':'Add colour to palette','이 색을 쓰는 모든 픽셀이 함께 바뀝니다.':'Every pixel using this colour changes with it.','추가':'Add','적용':'Apply','#rrggbb 형식으로 입력하세요':'Enter it as #rrggbb',
'가장 가까운 색으로 변환':'Convert to the nearest colours','그림의 모든 픽셀을 새 팔레트에서 가장 비슷한 색으로 바꿉니다.':'Changes every pixel to the closest colour in the new palette.','색 번호 유지 (팔레트 스왑)':'Keep colour numbers (palette swap)','1번 색은 1번 색으로 그대로 교체합니다. 같은 그림을 다른 색 조합으로 바꿔 볼 때 씁니다.':'Colour 1 becomes the new colour 1, and so on. Use it to try the same art in another colour scheme.',
'끝에 추가':'Append','지금 팔레트는 그대로 두고 없는 색만 덧붙입니다.':'Keeps the current palette and adds only the missing colours.','팔레트 프리셋':'Palette presets','중간색 개수':'In-between colours','색 램프 만들기':'Make a colour ramp','주 색상과 보조 색상 사이를 고르게 나눈 중간색을 팔레트 끝에 추가합니다.':'Adds evenly spaced colours between the primary and secondary colours to the end of the palette.',
'연필 · 지우개 · 채우기 · 스포이드':'Pencil · eraser · fill · eyedropper','직선 · 사각형 · 원':'Line · rectangle · ellipse','사각 선택 · 마술봉 · 이동 · 화면 이동':'Select · magic wand · move · pan','주/보조 색 바꾸기':'Swap primary and secondary','브러시 크기':'Brush size','화면 이동 (가운데 버튼 드래그도 가능)':'Pan (middle-button drag works too)','드래그':'drag','휠':'Wheel',
'확대 / 축소':'Zoom in / out','화면에 맞춤':'Fit to screen','실행 취소 / 다시 실행':'Undo / redo','전체 선택 · 선택 해제':'Select all · deselect','복사 / 새 레이어로 붙여넣기':'Copy / paste as a new layer','선택 영역 지우기':'Clear selection','이전 / 다음 프레임':'Previous / next frame','애니메이션 재생 / 정지':'Play / stop animation','프로젝트 저장':'Save project',
'저장 확인 창이 이미 열려 있습니다. 잠시 후 다시 시도하세요.':'A save prompt is already open. Try again in a moment.','파일을 저장하지 못했습니다':'Couldn\'t save the file','이 화면에서는 파일을 바로 내려받을 수 없습니다. 이미지는 길게 누르거나 오른쪽 클릭해 저장하고, 텍스트는 복사해 파일로 저장하세요.':'Files can\'t be downloaded directly here. Long-press or right-click images to save them, and copy text into a file.',
'텍스트를 선택했습니다. Ctrl+C로 복사하세요.':'Text selected. Press Ctrl+C to copy it.','파일 저장':'Save files','배율':'Scale','GIF 범위':'GIF range','UI 컴포넌트 (상태별 PNG + 9-slice JSON + CSS)':'UI component (PNG per state + 9-slice JSON + CSS)','PNG 이미지':'PNG image','GIF 애니메이션':'GIF animation','스프라이트 시트 + JSON':'Sprite sheet + JSON',
'모든 프레임을 한 장에 배치하고, 게임 엔진에서 읽는 프레임 좌표와 태그 JSON(Aseprite 형식)을 함께 저장합니다.':'Lays out every frame on one sheet and saves frame positions and tags as JSON (Aseprite format) for game engines.','Aseprite 파일 (.aseprite)':'Aseprite file (.aseprite)',
'레이어·프레임·태그·링크 셀·팔레트를 그대로 담아 Aseprite에서 이어서 작업할 수 있습니다. 배율은 적용되지 않습니다.':'Keeps layers, frames, tags, linked cels and the palette so you can continue in Aseprite. Scale is not applied.','타임랩스 GIF':'Timelapse GIF','아직 기록된 과정이 거의 없습니다. 그림을 그리면 단계마다 자동으로 기록됩니다.':'Hardly anything recorded yet. Every step is recorded as you draw.',
'프로젝트 파일 (.dotlab.json)':'Project file (.dotlab.json)','레이어·프레임·팔레트를 그대로 보존합니다. 열기로 다시 불러올 수 있습니다.':'Keeps layers, frames and the palette exactly. Reopen it with Open.','팔레트 (.txt)':'Palette (.txt)','한 줄에 색 하나씩 적은 hex 목록입니다.':'A list of hex colours, one per line.',
'이미지를 읽을 수 없습니다':'Couldn\'t read the image','파일에서 색을 찾지 못했습니다':'No colours found in the file','열 수 없는 파일 형식입니다':'This file type can\'t be opened','파일을 열지 못했습니다':'Couldn\'t open the file',
'태그 이름':'Tag name','시작 프레임':'First frame','끝 프레임':'Last frame','재생 방향':'Direction','정방향':'Forward','핑퐁 (갔다가 돌아오기)':'Ping-pong (there and back)','역방향 핑퐁 (끝에서 시작해 돌아오기)':'Reverse ping-pong (from the end and back)','태그 색':'Tag colour','태그 삭제':'Delete tag','새 태그':'New tag','이름':'Name','프레임':'Frames','부터':'to','까지':'','색':'Colour',
'태그는 "걷기", "공격"처럼 프레임 구간에 이름을 붙입니다. 재생과 GIF 내보내기에서 태그 구간만 고를 수 있고, 스프라이트 시트 JSON과 Aseprite 파일에도 그대로 들어갑니다.':'A tag names a range of frames, like "walk" or "attack". You can play or export just a tag, and tags are kept in the sprite sheet JSON and in Aseprite files.',
// aseprite and timelapse
'Aseprite 파일이 아니거나 손상된 파일입니다':'Not an Aseprite file, or the file is damaged','그룹은 풀어서 가져왔습니다':'Groups were flattened','타일맵 레이어는 가져오지 않았습니다':'Tilemap layers were skipped','혼합 모드는 보통으로 바꿨습니다':'Blend modes were set to normal','그림이 들어 있는 레이어가 없습니다':'There are no layers with pixels','셀 불투명도는 무시했습니다':'Cel opacity was ignored',
'반투명 픽셀은 불투명도 절반을 기준으로 불투명하거나 투명하게 바꿨습니다':'Semi-transparent pixels became opaque or transparent at 50% alpha','기록된 과정이 아직 적습니다. 몇 번 더 그린 뒤 다시 시도하세요.':'Not much recorded yet. Draw a little more and try again.',
// image → pixel
'이미지를 올리면 원본 도트 한 칸이 화면 몇 픽셀로 확대돼 있는지 찾아 원래 크기로 되돌립니다.':'Load an image and it finds how many screen pixels one original pixel was blown up to, then restores the original size.','뚜렷한 확대 격자가 없어 원본 1px을 1칸으로 가져옵니다. 일반 사진이라면 픽셀 크기를 키워 칸 수를 줄이세요.':'No clear upscaling grid, so 1 image pixel becomes 1 pixel. For a photo, raise the pixel size to use fewer pixels.',
'도트 격자를 찾지 못해 일반 이미지로 처리했습니다. 긴 변을 64칸으로 줄였고, 픽셀 크기로 조절할 수 있습니다.':'No pixel grid found, so it was treated as a regular image: the long side was reduced to 64 pixels. Adjust it with the pixel size.','격자를 찾는 중…':'Looking for the grid…',
'결과가 캔버스보다 커서 가운데 부분만 넣었습니다. 전부 쓰려면 「새 캔버스로 열어 수정」을 누르세요.':'The result is larger than the canvas, so only the middle was added. Use "Open as new canvas" to keep all of it.','새 레이어로 넣었습니다':'Added as a new layer',
// components
'버튼':'Button','호버':'Hover','누름':'Pressed','비활성':'Disabled','패널':'Panel','입력칸':'Input','입력':'Input','포커스':'Focus','체크박스':'Checkbox','꺼짐':'Off','켜짐':'On','토글':'Toggle','진행 바':'Progress bar','트랙':'Track','채움':'Fill','탭':'Tab','선택':'Selected','선택 안 됨':'Not selected','말풍선':'Speech bubble','안녕!':'Hi!',
'지금 그림을 컴포넌트로 바꿨습니다. 캔버스의 분홍 가이드를 끌어 늘어날 부분을 정하세요.':'Turned the drawing into a component. Drag the pink guides on the canvas to choose what stretches.',
'이 브라우저의 저장 공간이 부족해 저장하지 못했습니다. 라이브러리를 파일로 내보낸 뒤 쓰지 않는 컴포넌트를 지워 주세요.':'This browser is out of storage, so it couldn\'t save. Export the library to a file, then delete components you don\'t use.','컴포넌트만 저장할 수 있습니다. 템플릿을 고르거나 지금 그림을 컴포넌트로 바꾸세요.':'Only components can be saved. Pick a template or turn the drawing into a component.',
'이 컴포넌트를 읽지 못했습니다. 라이브러리 파일을 다시 가져와 보세요.':'Couldn\'t read this component. Try importing the library file again.','컴포넌트 삭제':'Delete component','삭제했습니다':'Deleted','저장한 컴포넌트가 없습니다':'No saved components','가져올 수 있는 컴포넌트가 없습니다':'No components to import',
'템플릿으로 시작':'Start from a template','주 색상을 기준으로 명암을 나눠 그립니다.':'Shades are drawn from the primary colour.','라이브러리 파일':'Library file','라이브러리 파일을 읽지 못했습니다':'Couldn\'t read the library file','아직 저장한 컴포넌트가 없습니다. 다듬은 컴포넌트를 저장해 두면 여기서 다시 열 수 있습니다.':'No saved components yet. Save a component you have polished to reopen it here.',
'내 컴포넌트':'My components','덮어 저장':'Save over','내 컴포넌트에 저장':'Save to My components','컴포넌트만 저장할 수 있습니다':'Only components can be saved','새로 저장':'Save as new','라이브러리 파일(.json)에서 컴포넌트를 더합니다':'Adds components from a library file (.json)','파일로':'To file','모든 컴포넌트를 파일 하나로 내려받습니다':'Downloads every component as one file',
'지금 그림을 컴포넌트로':'Use the drawing as a component','그림을 그대로 쓰면서 늘어날 부분(9-slice)과 상태를 정할 수 있습니다.':'Keep the drawing and choose what stretches (9-slice) and its states.','지금 그림을 컴포넌트로 쓰기':'Use the drawing as a component','기본 색':'Base colour','모양 (다시 그리기)':'Shape (redraws)','모서리 둥글기':'Corner radius','테두리 두께':'Border','입체감':'Depth','주 색상 쓰기':'Use primary colour','팔레트에서 고른 주 색상으로 다시 그립니다':'Redraws with the primary colour from the palette',
'바꾸면 모든 상태를 처음부터 다시 그립니다. 손으로 고친 부분은 사라지니(Ctrl+Z로 되돌릴 수 있음) 모양을 먼저 정한 뒤 안쪽을 다듬으세요.':'Changing these redraws every state from scratch and drops hand edits (Ctrl+Z brings them back), so settle the shape before polishing the inside.',
'늘리는 방식':'How it stretches','늘이기':'Stretch','반복 (무늬 유지)':'Repeat (keeps patterns)','모서리 (9-slice)':'Corners (9-slice)','모서리는 그대로 두고 가장자리와 가운데만 늘립니다':'Keeps the corners and stretches only the edges and middle','모서리를 지키며 늘리기':'Stretch while keeping corners','왼쪽':'Left','위':'Top','오른쪽':'Right','아래':'Bottom',
'늘리지 않는 고정 크기 컴포넌트입니다. 미리보기와 CSS에서는 통째로 확대만 합니다.':'A fixed-size component that doesn\'t stretch. The preview and CSS only scale it as a whole.','분홍 가이드 바깥(모서리와 테두리)에는 그려지지 않습니다':'Nothing is painted outside the pink guides (corners and edges)','모서리·테두리 잠금 (안쪽만 그리기)':'Lock corners and edges (paint inside only)','안쪽을 늘릴 때':'When the inside stretches',
'캔버스의 분홍 가이드를 끌어도 됩니다. 잠금이 켜져 있으면 가이드 바깥은 흐리게 보이고 그려지지 않습니다. 안쪽에 무늬를 그렸다면 「반복」을 고르세요.':'You can also drag the pink guides on the canvas. With the lock on, everything outside the guides is dimmed and can\'t be painted. If the inside has a pattern, choose "Repeat".',
'안쪽 영역 (글자·아이콘 자리)':'Content area (for text and icons)','모양에 맞게 되돌리기':'Reset to fit the shape','캔버스에 파란 점선으로 보입니다. 미리보기 글자 위치와 CSS padding이 됩니다.':'Shown as a blue dashed box on the canvas. It sets the preview text position and the CSS padding.','미리보기 글자':'Preview text','글자 없음':'No text','미리보기 너비':'Preview width','미리보기 높이':'Preview height','늘린 모습 미리보기':'Stretched preview','글자':'Text','컴포넌트 내보내기':'Export component','상태별 PNG + 9-slice JSON + CSS':'PNG per state + 9-slice JSON + CSS',
'이 브라우저에만 보관됩니다. 다른 기기로 옮기거나 백업하려면 「파일로」 내려받으세요.':'Stored only in this browser. Use "To file" to move or back it up.','상태 이름':'State name','호버·누름·비활성·포커스·켜짐·선택은 CSS로 내보낼 때 :hover, :active 같은 선택자로 이어집니다.':'Hover, Pressed, Disabled, Focus, On and Selected become CSS selectors such as :hover and :active on export.','이름을 적어 주세요':'Enter a name',
'먼저 컴포넌트 모드에서 템플릿을 고르거나 지금 그림을 컴포넌트로 바꾸세요':'First pick a template in component mode or turn the drawing into a component','고정 크기 (늘리지 않음)':'Fixed size (doesn\'t stretch)',
// AI
'캔버스가 64px보다 작아야 합니다':'The canvas must be smaller than 64px','선택 도구로 영역을 고르면 그 부분만 다시 그립니다. 선택이 없으면 그림 전체를 지시대로 고칩니다.':'Select an area to redraw only that part. With no selection the whole drawing is edited.','요청이 많습니다. 잠시 후 다시 시도하세요.':'Too many requests. Try again in a moment.',
'이 요청은 그릴 수 없습니다. 다른 설명으로 시도해 보세요.':'That can\'t be drawn. Try a different description.','결과 형식을 읽지 못했습니다. 다시 시도하세요.':'Couldn\'t read the result. Try again.','결과가 비어 있습니다. 설명을 더 구체적으로 적어 보세요.':'The result is empty. Try a more specific description.','로그인이 만료되었습니다. 다시 로그인한 뒤 시도하세요.':'Your sign-in expired. Sign in again and retry.',
'그림이 너무 커서 보낼 수 없습니다. 더 작은 영역을 선택하세요.':'The drawing is too large to send. Select a smaller area.','중지했습니다':'Stopped','Claude 사용을 허용하지 않아 AI 기능이 꺼졌습니다. 페이지 권한 메뉴에서 허용하면 다시 쓸 수 있습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.':'AI is off because Claude wasn\'t allowed. Allow it in the page\'s permissions menu to use it. The editor and image conversion still work.',
'이 계정에서는 AI 기능을 쓸 수 없습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.':'AI isn\'t available for this account. The editor and image conversion still work.','연결 문제로 실패했습니다. 다시 시도하세요.':'Failed because of a connection problem. Try again.','생성한 후보가 여기에 최대 4개까지 쌓입니다. 마음에 드는 후보를 레이어로 넣은 뒤 연필로 다듬으세요.':'Up to 4 candidates collect here. Add the one you like as a layer, then polish it with the pencil.',
'그리는 중…':'Drawing…','새 레이어로 넣기':'Add as layer','현재 레이어에 적용':'Apply to current layer','후보 삭제':'Remove candidate','새 레이어로 넣었습니다. 연필로 바로 다듬을 수 있습니다.':'Added as a new layer. Polish it with the pencil.','현재 레이어에 적용했습니다. Ctrl+Z로 되돌릴 수 있습니다.':'Applied to the current layer. Ctrl+Z undoes it.',
'생각하는 중… (보통 10~60초)':'Thinking… (usually 10–60 s)','생각하는 중…':'Thinking…','결과가 비어 있습니다. 설명을 바꿔 다시 시도하세요.':'The result is empty. Change the description and try again.','완료. 후보를 레이어로 넣어 다듬으세요.':'Done. Add a candidate as a layer and polish it.','(중단됨)':'(stopped)','무엇을 그릴지 적어 주세요':'Describe what to draw',
'AI 생성은 64×64 이하 캔버스에서 쓸 수 있습니다':'AI works on canvases up to 64×64','어떻게 고칠지 적어 주세요':'Describe the change','다시 그릴 영역은 64×64 이하여야 합니다. 선택 도구로 영역을 고르세요.':'The area to redraw must be 64×64 or smaller. Select it with a selection tool.','팔레트 주제를 적어 주세요':'Enter a palette theme','팔레트를 만드는 중…':'Making the palette…','적용 방법 고르기':'Choose how to apply','팔레트를 만들었습니다':'Palette ready',
'AI 생성은 Claude 안에서 이 페이지를 열면 쓸 수 있습니다. 에디터와 이미지 변환은 지금 바로 쓸 수 있습니다.':'AI works when this page is opened inside Claude. The editor and image conversion work right now.','이 화면에서는 AI 생성을 쓸 수 없습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.':'AI isn\'t available here. The editor and image conversion still work.',
'Claude가 현재 팔레트로 도트를 직접 그립니다. 처음 생성할 때 사용 허락을 묻고, 요청은 내 Claude 사용량에서 차감됩니다.':'Claude draws pixel art with the current palette. It asks for permission the first time, and requests count toward your Claude usage.',
'예시 작품을 열었습니다. 새로 만들기로 빈 캔버스를 시작할 수 있습니다.':'Opened the sample. Use New to start a blank canvas.','자동 저장된 작업을 불러왔습니다':'Restored your autosaved work','참조 이미지로 띄웠습니다':'Shown as reference',
// Figma plugin
'Figma 레이어':'Figma layer','선택한 레이어를 가져왔습니다. 격자를 확인한 뒤 「새 캔버스로 열어 수정」을 누르세요.':'Imported the selected layer. Check the grid, then press "Open as new canvas".','도트랩 개체를 열었습니다. 고친 뒤 「Figma에 넣기」로 원래 자리에 교체하세요.':'Opened the DotLab object. After editing, use "Insert into Figma" to replace it in place.',
'이 개체의 도트랩 데이터를 읽지 못했습니다':'Couldn\'t read this object\'s DotLab data','Figma 개체를 교체했습니다':'Replaced the Figma object','Figma 캔버스에 넣었습니다':'Inserted into the Figma canvas','Figma 계정의 플러그인 저장소에 보관됩니다(이 컴퓨터의 Figma). 다른 기기로 옮기거나 백업하려면 「파일로」 내려받으세요.':'Stored in Figma\'s plugin storage on this computer. Use "To file" to move or back it up.',
'먼저 Anthropic API 키를 입력하세요.':'Enter an Anthropic API key first.','API 키가 올바르지 않습니다. 키를 다시 확인하세요.':'The API key is not valid. Check the key.','이 키로 쓸 수 없는 모델입니다. 품질을 다른 단계로 바꿔 보세요.':'This key can\'t use that model. Try another quality level.','API 계정의 크레딧이 부족합니다.':'The API account is out of credit.','api.anthropic.com에 연결하지 못했습니다. 인터넷 연결을 확인하세요.':'Couldn\'t reach api.anthropic.com. Check your internet connection.',
'sk-ant-로 시작하는 키':'A key starting with sk-ant-','Claude가 현재 팔레트로 도트를 직접 그립니다. 요청 비용은 입력한 API 키의 계정에 청구됩니다.':'Claude draws pixel art with the current palette. Requests are billed to the account of the API key you entered.',
'AI 생성을 쓰려면 아래에 Anthropic API 키를 입력하세요. 에디터, 이미지 변환, Figma 넣기·가져오기는 키 없이 쓸 수 있습니다.':'Enter an Anthropic API key below to use AI. The editor, image conversion and Figma insert/import work without a key.',
'Figma에 넣기':'Insert into Figma','파일로 내보내기':'Export file','벡터 (편집 가능)':'Vector (editable)','레이어마다 그룹, 색마다 도형 하나로 만듭니다. Figma에서 색을 바꾸거나 다른 크기로 키워도 선명합니다.':'One group per layer and one shape per colour. Stays sharp when recoloured or resized in Figma.','픽셀을 그대로 담은 이미지 한 장입니다. 레이어가 가볍고 빠릅니다.':'A single image of the pixels. Light and fast.',
'현재 프레임만':'Current frame only','모든 프레임':'All frames','상태마다 변형(Variant)을 가진 컴포넌트 세트로 넣습니다. 9-slice 여백은 컴포넌트 설명에 적힙니다.':'Inserts a component set with one variant per state. The 9-slice insets are written in the component description.','팔레트를 Figma 색 스타일로 저장':'Save the palette as Figma colour styles',
'넣은 개체에는 도트랩 데이터가 함께 저장됩니다. 나중에 선택하고 「선택 편집」을 누르면 레이어와 프레임 그대로 다시 열립니다.':'Inserted objects keep their DotLab data. Select one later and press "Edit selection" to reopen it with its layers and frames.','넣기':'Insert','Figma에 넣는 중…':'Inserting into Figma…','Figma 선택 없음':'Nothing selected in Figma','선택 가져오기':'Import selection','선택 편집':'Edit selection',
'도트랩으로 만든 개체를 레이어·프레임 그대로 다시 엽니다':'Reopens an object made with DotLab with its layers and frames','선택한 레이어를 이미지로 가져와 도트로 변환합니다':'Imports the selected layer as an image and converts it to pixels','sk-ant-로 시작하는 Anthropic API 키를 입력하세요':'Enter an Anthropic API key starting with sk-ant-','API 키를 저장했습니다':'Saved the API key','API 키를 지웠습니다':'Deleted the API key',
'Anthropic API 키':'Anthropic API key','키는 이 컴퓨터의 Figma 플러그인 저장소에만 보관되고, 요청은 api.anthropic.com으로 바로 전송됩니다. 사용 요금은 이 키의 계정에 청구됩니다.':'The key is kept only in Figma\'s plugin storage on this computer, and requests go straight to api.anthropic.com. Usage is billed to the key\'s account.','키 저장':'Save key','키 지우기':'Delete key',
'이 웹 배포판에서는 AI 생성을 쓸 수 없습니다. 그리기, 이미지 → 도트, 참조 이미지, UI 컴포넌트, 내보내기는 모두 쓸 수 있습니다. AI는 Claude 아티팩트 버전이나 Figma 플러그인에서 쓸 수 있습니다.':'AI isn\'t available in this web version. Drawing, Image → Pixel, reference images, UI components and export all work. AI is available in the Claude artifact version and the Figma plugin.',
},
// rendered sentences with values: {} captures text, {*} may be empty; {1}, {2}… in the English refer to the captures
pats:[
 ['상태 {}','State {1}'],['{} 복사','{1} copy'],['레이어 {}','Layer {1}'],['태그 {}','Tag {1}'],['태그: {}','Tag: {1}'],
 ['{}색을 추가했습니다','Added {1} colours'],['팔레트는 최대 {}색입니다','Palettes hold up to {1} colours'],['중간색 {}개를 팔레트 끝에 추가했습니다','Added {1} in-between colours to the end of the palette'],
 ['주 색상: {}','Primary colour: {1}'],['보조 색상: {}','Secondary colour: {1}'],
 ['{} / {} 프레임 · 전체 {}초{*}','{1} / {2} frames · {3}s total{4}'],[' · 태그 「{}」',' · tag "{1}"'],['상태 {} / {} · 「{}」 · 더블클릭해 이름 바꾸기','State {1} / {2} · "{3}" · double-click to rename'],
 ['프레임 {} · {}ms{*}','Frame {1} · {2}ms{3}'],[' · 「{}」 셀이 앞 프레임과 링크됨{*}',' · "{1}" cel is linked to the previous frame{2}'],
 ['{}×{} · 레이어 {}개 · 프레임 {}개 · 선택 {}×{}','{1}×{2} · {3} layers · {4} frames · selection {5}×{6}'],['{}×{} · 레이어 {}개 · 프레임 {}개','{1}×{2} · {3} layers · {4} frames'],
 ['최대 {}px','Max {1}px'],['색 편집 ({}번)','Edit colour ({1})'],
 ['{}개 파일을 저장했습니다','Saved {1} files'],['저장했습니다: {}','Saved: {1}'],['{}개 파일을 내려받았습니다','Downloaded {1} files'],['내려받았습니다: {}','Downloaded: {1}'],
 ['태그 「{}」 ({}–{})','Tag "{1}" ({2}–{3})'],['상태 {}개를 각각 PNG로, 늘어날 여백(9-slice)을 게임 엔진용 JSON과 CSS border-image로 저장합니다. 호버·누름·비활성 같은 상태 이름은 CSS 선택자로 이어집니다.','Saves each of the {1} states as a PNG, and the 9-slice insets as JSON for game engines and CSS border-image. State names such as Hover, Pressed and Disabled become CSS selectors.'],
 ['현재 프레임({}번)을 보간 없이 확대해 저장합니다. 투명 배경을 유지합니다.','Saves the current frame ({1}) scaled up without smoothing, keeping transparency.'],['프레임 {}개와 프레임별 지속시간을 담아 반복 재생합니다.','Loops all {1} frames with their durations.'],
 ['이 작업을 연 뒤부터 기록한 과정 {}단계를 짧은 GIF로 만듭니다. AI가 만든 단계에는 왼쪽 위에 AI 표시가 붙습니다.','Turns the {1} steps recorded since you opened this work into a short GIF. Steps made by AI get an AI badge in the top-left corner.'],
 ['프로젝트를 열었습니다: {}','Opened project: {1}'],['팔레트 가져오기 ({}색)','Import palette ({1} colours)'],['Aseprite 파일을 열었습니다: {}×{} · 레이어 {} · 프레임 {}{*}','Opened Aseprite file: {1}×{2} · {3} layers · {4} frames{5}'],
 ['지원하지 않는 색 형식입니다 ({})','Unsupported colour format ({1})'],['프레임 데이터가 손상되었습니다 ({}번 프레임)','Frame data is damaged (frame {1})'],['캔버스가 {}×{}입니다. 도트랩은 {}×{}까지 열 수 있습니다.','The canvas is {1}×{2}. DotLab opens up to {3}×{4}.'],
 ['{}색을 {}색으로 줄였습니다','Reduced {1} colours to {2}'],['Aseprite 파일을 만들지 못했습니다: {}','Couldn\'t create the Aseprite file: {1}'],
 ['결과가 {}칸을 넘습니다. 픽셀 크기를 더 크게 지정하세요.','The result is over {1} pixels. Set a larger pixel size.'],['가로 {}px · 세로 {}px','{1}px wide · {2}px tall'],
 [/^도트 격자를 찾았습니다\. 원본 (.+?)가 도트 1칸입니다( \(격자가 흐릿해 확인이 필요합니다\))?\. 왼쪽 미리보기의 파란 선이 감지한 격자입니다\.$/,(m,t)=>`Found a pixel grid: ${t(m[1])} of the original is one pixel${m[2]?' (the grid is faint, so check it)':''}. The blue lines in the left preview show the detected grid.`],
 ['직접 지정한 픽셀 크기 {}로 나눕니다.','Splitting by the pixel size you set: {1}.'],['결과 {}×{} · {}색','Result {1}×{2} · {3} colours'],['→ {}×{}칸','→ {1}×{2} pixels'],['{}×{} 새 캔버스로 열었습니다. 바로 수정하세요. 이전 작업은 Ctrl+Z로 돌아갈 수 있습니다.','Opened as a new {1}×{2} canvas. Edit away; Ctrl+Z brings back the previous work.'],
 ['「{}」 템플릿을 열었습니다. 모서리·테두리는 잠겨 있고 안쪽만 그릴 수 있습니다.','Opened the "{1}" template. Corners and edges are locked; only the inside can be painted.'],['「{}」을(를) 덮어 저장했습니다','Saved over "{1}"'],['「{}」을(를) 내 컴포넌트에 저장했습니다','Saved "{1}" to My components'],['「{}」을(를) 열었습니다','Opened "{1}"'],
 ['「{}」을(를) 내 컴포넌트에서 지웁니다. 지금 열려 있는 그림은 그대로 남습니다. 되돌릴 수 없으니 필요하면 먼저 라이브러리를 파일로 내보내세요.','Removes "{1}" from My components. The open drawing stays. This can\'t be undone, so export the library to a file first if needed.'],
 ['컴포넌트 {}개를 가져왔습니다 (읽지 못한 {}개는 건너뜀)','Imported {1} components (skipped {2} unreadable)'],['컴포넌트 {}개를 가져왔습니다','Imported {1} components'],['{} 템플릿으로 새로 시작 (상태 {}개)','Start fresh from the {1} template ({2} states)'],['「{}」 열기','Open "{1}"'],['「{}」 삭제','Delete "{1}"'],['{}×{} · {}상태','{1}×{2} · {3} states'],
 ['{}×{} (캔버스 전체)','{1}×{2} (whole canvas)'],['현재 팔레트의 {}색만 사용해 그립니다. 결과는 그리드에 딱 맞는 인덱스 픽셀이라 바로 손으로 다듬을 수 있습니다.','Draws with only the {1} colours of the current palette. The result is indexed pixels on the grid, ready to polish by hand.'],
 ['선택한 {}×{} 영역만 다시 그립니다. 주변 픽셀과 이어지도록 맞춥니다.','Redraws only the selected {1}×{2} area, matching the pixels around it.'],['그리는 중… {}/{}줄','Drawing… {1}/{2} rows'],['수정: {}','Edit: {1}'],['{} · {}색','{1} · {2} colours'],['팔레트 적용: {}','Apply palette: {1}'],
 ['저장된 키 …{}','Saved key …{1}'],['{}번 프레임 하나를 넣습니다.','Inserts frame {1} only.'],['프레임 {}개를 가로로 나란히 담은 프레임으로 넣습니다.','Inserts all {1} frames side by side in one frame.'],['컴포넌트로 넣기 (상태 {}개 → 변형)','Insert as a component ({1} states → variants)'],['연결된 개체 「{}」를 이 결과로 교체','Replace the linked object "{1}" with this'],
 ['Figma 선택: {} 외 {}개','Figma selection: {1} and {2} more'],['Figma 선택: {}','Figma selection: {1}'],['「{}」 닫기','Close "{1}"'],
 ['「{}」을(를) 닫습니다. 실행 취소 기록도 함께 사라집니다. 보관하려면 먼저 저장하세요.','Closes "{1}" along with its undo history. Save it first to keep it.'],
 ['캔버스는 {}개까지 열 수 있어 지금 탭을 바꿨습니다. Ctrl+Z로 되돌릴 수 있습니다.','Up to {1} canvases can be open, so the current tab was replaced. Ctrl+Z undoes it.'],
 ['{}×{} 새 캔버스(새 탭)로 열었습니다. 바로 수정하세요. 이전 작업은 원래 탭에 그대로 있습니다.','Opened as a new {1}×{2} canvas in a new tab. Edit away; the previous work is still in its own tab.'],
 ['{} · {}×{}','{1} · {2}×{3}'],['{}색','{1} colours'],
 // generic shapes last, so the specific sentences above win
 ['{} ({})','{1} ({2})'],
]};

const I18N_CACHE=new Map();
function i18nCompile(){
  if(I18N.re) return; I18N.re=[];
  // the most specific shape wins: patterns with more fixed text are tried first
  const lit=k=>k instanceof RegExp?1e9:k.replace(/\{\*?\}/g,'').length;
  for(const [ko,en] of I18N.pats.slice().sort((x,y)=>lit(y[0])-lit(x[0]))){
    if(ko instanceof RegExp){ I18N.re.push([ko,en]); continue; }
    let src='', n=0; for(const part of ko.split(/(\{\*?\})/)){ if(part==='{}'){ src+='(.+?)'; n++; } else if(part==='{*}'){ src+='(.*)'; n++; } else src+=part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
    I18N.re.push([new RegExp('^'+src+'$'),en]);
  }
  // known phrases inside longer text, matched only as whole Hangul words (so user text such as 「원숭이」 is left alone)
  const keys=Object.keys(I18N.en).filter(k=>/[가-힣]/.test(k)&&I18N.en[k]).sort((a,b)=>b.length-a.length);
  I18N.words=new RegExp('(?<![가-힣])('+keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![가-힣])','g');
}
// English for a piece of Korean text (keeps surrounding whitespace); unchanged when nothing matches
function enText(s){
  if(!s||!/[가-힣]/.test(s)) return s;
  let c=I18N_CACHE.get(s); if(c!==undefined) return c;
  i18nCompile();
  const m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), core=m[2]; let r=I18N.en[core];
  if(r===undefined) for(const [re,en] of I18N.re){ const mm=core.match(re); if(!mm) continue;
    r=typeof en==='function'?en(mm,enText):en.replace(/\{(\d)\}/g,(_,i)=>enText(mm[+i]||'')); break; }
  if(r===undefined) r=core.replace(I18N.words,k=>I18N.en[k]);
  c=m[1]+r+m[3]; if(I18N_CACHE.size>4000) I18N_CACHE.clear(); I18N_CACHE.set(s,c); return c;
}
function L(ko){ return I18N.lang==='en'?enText(ko):ko; }

/* --- DOM: keep each node's Korean original, show the current language --- */
const I18N_ATTRS=['title','aria-label','placeholder','alt'];
const i18nText=new WeakMap(), i18nAttr=new WeakMap();
// text inside these is the user's or code; attributes of a textarea (its placeholder) are still translated
function i18nSkip(el,text){ return !el||el.closest(text?'[data-i18n="off"],script,style,textarea':'[data-i18n="off"],script,style'); }
function i18nNode(n){
  if(n.nodeType===3){
    if(i18nSkip(n.parentElement,true)) return;
    let o=i18nText.get(n); const cur=n.nodeValue;
    if(!o||cur!==o.shown){ o={ko:cur}; i18nText.set(n,o); }        // the app wrote new text: that is the new original
    const want=I18N.lang==='en'?enText(o.ko):o.ko; o.shown=want; if(cur!==want) n.nodeValue=want;
  } else if(n.nodeType===1){
    if(i18nSkip(n)) return;
    let map=i18nAttr.get(n); if(!map){ map={}; i18nAttr.set(n,map); }
    for(const a of I18N_ATTRS){ const cur=n.getAttribute(a); if(cur==null){ delete map[a]; continue; }
      let o=map[a]; if(!o||cur!==o.shown){ o=map[a]={ko:cur}; }
      const want=I18N.lang==='en'?enText(o.ko):o.ko; o.shown=want; if(cur!==want) n.setAttribute(a,want); }
    for(let c=n.firstChild;c;c=c.nextSibling) i18nNode(c);
  }
}
let i18nObs=null;
function i18nApply(){
  document.documentElement.lang=I18N.lang;
  if(!I18N.title) I18N.title=document.title; document.title=I18N.lang==='en'?enText(I18N.title)||'DotLab editor':I18N.title;
  i18nNode(document.body);
  if(!i18nObs){
    i18nObs=new MutationObserver(recs=>{ for(const r of recs){
      if(r.type==='childList') r.addedNodes.forEach(i18nNode);
      else if(r.type==='characterData') i18nNode(r.target);
      else if(r.type==='attributes') i18nAttrOnly(r.target); } });
    i18nObs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:I18N_ATTRS});
  }
}
function i18nAttrOnly(el){ if(i18nSkip(el)) return; const keep=el.firstChild; const map=i18nAttr.get(el)||{}; i18nAttr.set(el,map);
  for(const a of I18N_ATTRS){ const cur=el.getAttribute(a); if(cur==null) continue; let o=map[a]; if(!o||cur!==o.shown) o=map[a]={ko:cur}; const want=I18N.lang==='en'?enText(o.ko):o.ko; o.shown=want; if(cur!==want) el.setAttribute(a,want); } }
function setLang(l){
  I18N.lang=l==='en'?'en':'ko'; prefSet('lang',I18N.lang);
  $$('#langSwitch .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===I18N.lang)));
  i18nApply(); if(doc) updStatus();
}
