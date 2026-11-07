/* ================= GitHub Pages build: a plain website, no Claude runtime =================
   Overrides the web build's file saving (plain browser download instead of the artifact `downloads` capability)
   and AI (there is no `sample` capability outside Claude). Everything else is the same editor. */
async function offerFiles(files){ return anchorDownload(files); }
async function initCapabilities(){
  sample=null; downloads=null;
  aiDisable('이 웹 배포판에서는 AI 생성을 쓸 수 없습니다. 그리기, 이미지 → 도트, 참조 이미지, UI 컴포넌트, 내보내기는 모두 쓸 수 있습니다. AI는 Claude 아티팩트 버전이나 Figma 플러그인에서 쓸 수 있습니다.');
}
