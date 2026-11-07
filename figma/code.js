// 도트랩 (DotLab) — Figma plugin main thread
// Runs in Figma's sandbox. The editor UI lives in ui.html and talks to this file with postMessage.

figma.showUI(__html__, { width: 1180, height: 780, themeColors: true, title: '도트랩' });

function post(msg) { figma.ui.postMessage(msg); }

function sendSelection() {
  var sel = figma.currentPage.selection;
  var n = sel[0];
  post({ type: 'selection', count: sel.length, name: n ? n.name : '', dotlab: !!(n && n.getPluginData('dotlab')) });
}

function hexToRgb01(hex) {
  var n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function rgb01ToHex(c) {
  function p(v) { var s = Math.round(v * 255).toString(16); return s.length < 2 ? '0' + s : s; }
  return '#' + p(c.r) + p(c.g) + p(c.b);
}

async function importSelection() {
  var n = figma.currentPage.selection[0];
  if (!n) { post({ type: 'error', text: 'Figma에서 가져올 레이어를 먼저 선택하세요' }); return; }
  var data = n.getPluginData('dotlab');
  if (data) { post({ type: 'open-project', data: data, nodeId: n.id, name: n.name }); return; }
  if (typeof n.exportAsync !== 'function') { post({ type: 'error', text: '이 레이어는 이미지로 내보낼 수 없습니다' }); return; }
  try {
    var bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
    post({ type: 'import-image', bytes: bytes, name: n.name });
  } catch (e) {
    post({ type: 'error', text: '레이어를 이미지로 내보내지 못했습니다' });
  }
}

// Name the groups after DotLab layers and each vector after its color.
function nameVectors(root, layerNames) {
  var groups = root.children ? root.children.slice() : [];
  for (var i = 0; i < groups.length && i < layerNames.length; i++) groups[i].name = layerNames[i];
  var vecs = root.findAll(function (x) { return x.type === 'VECTOR'; });
  for (var j = 0; j < vecs.length; j++) {
    var f = vecs[j].fills;
    if (f && f.length && f[0].type === 'SOLID') vecs[j].name = rgb01ToHex(f[0].color);
  }
}

async function makeStyles(palette, name) {
  var existing = await figma.getLocalPaintStylesAsync();
  for (var i = 0; i < palette.length; i++) {
    var nm = '도트랩/' + name + '/' + (i + 1 < 10 ? '0' : '') + (i + 1) + ' ' + palette[i];
    var s = null;
    for (var k = 0; k < existing.length; k++) if (existing[k].name === nm) { s = existing[k]; break; }
    if (!s) s = figma.createPaintStyle();
    s.name = nm;
    s.paints = [{ type: 'SOLID', color: hexToRgb01(palette[i]) }];
  }
}

async function insert(m) {
  var nodes = [];
  for (var i = 0; i < m.frames.length; i++) {
    var f = m.frames[i], node;
    if (m.mode === 'vector') {
      node = figma.createNodeFromSvg(f.svg);
      node.fills = [];
      nameVectors(node, f.layerNames || []);
    } else {
      var img = figma.createImage(f.png);
      node = figma.createFrame();
      node.resize(m.w, m.h);
      node.fills = [];
      var r = figma.createRectangle();
      r.resize(m.w, m.h);
      r.name = '픽셀';
      r.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
      node.appendChild(r);
    }
    node.name = m.frameNames[i] || m.name;
    nodes.push(node);
  }
  var top;
  if (m.asComponents) {
    // UI component: every state becomes a variant of one component set ("상태=기본", "상태=호버", ...)
    var comps = [];
    for (var k = 0; k < nodes.length; k++) comps.push(figma.createComponentFromNode(nodes[k]));
    if (comps.length === 1) { top = comps[0]; top.name = m.name; }
    else {
      top = figma.combineAsVariants(comps, figma.currentPage);
      top.name = m.name;
      top.layoutMode = 'HORIZONTAL';
      top.primaryAxisSizingMode = 'AUTO';
      top.counterAxisSizingMode = 'AUTO';
      top.itemSpacing = 16;
      top.paddingLeft = 16; top.paddingRight = 16; top.paddingTop = 16; top.paddingBottom = 16;
    }
    if (m.note) top.description = m.note;
  } else if (nodes.length === 1) top = nodes[0];
  else {
    top = figma.createFrame();
    top.name = m.name;
    top.fills = [];
    top.layoutMode = 'HORIZONTAL';
    top.primaryAxisSizingMode = 'AUTO';
    top.counterAxisSizingMode = 'AUTO';
    top.itemSpacing = 16;
    for (var j = 0; j < nodes.length; j++) top.appendChild(nodes[j]);
  }
  top.setPluginData('dotlab', m.project);
  top.setRelaunchData({ edit: '도트랩에서 레이어·프레임 그대로 다시 엽니다' });

  var updated = false;
  if (m.replaceId) {
    var old = await figma.getNodeByIdAsync(m.replaceId);
    if (old && !old.removed && old.parent) {
      var p = old.parent;
      p.insertChild(p.children.indexOf(old), top);
      top.x = old.x; top.y = old.y;
      old.remove();
      updated = true;
    }
  }
  if (!updated) {
    figma.currentPage.appendChild(top);
    var c = figma.viewport.center;
    top.x = Math.round(c.x - top.width / 2);
    top.y = Math.round(c.y - top.height / 2);
  }
  figma.currentPage.selection = [top];
  figma.viewport.scrollAndZoomIntoView([top]);
  if (m.palette) await makeStyles(m.palette, m.name);
  post({ type: 'inserted', nodeId: top.id, name: top.name, updated: updated });
}

figma.on('selectionchange', sendSelection);

figma.ui.onmessage = async function (msg) {
  try {
    if (msg.type === 'ready') {
      var autosave = await figma.clientStorage.getAsync('autosave');
      var apiKey = await figma.clientStorage.getAsync('apiKey');
      var library = await figma.clientStorage.getAsync('library');
      post({ type: 'init', autosave: autosave || null, apiKey: apiKey || '', library: library || null });
      sendSelection();
      if (figma.command === 'edit') await importSelection();
    } else if (msg.type === 'autosave') {
      await figma.clientStorage.setAsync('autosave', msg.data);
    } else if (msg.type === 'library') {
      await figma.clientStorage.setAsync('library', msg.data);
    } else if (msg.type === 'set-key') {
      if (msg.key) await figma.clientStorage.setAsync('apiKey', msg.key);
      else await figma.clientStorage.deleteAsync('apiKey');
    } else if (msg.type === 'import-selection') {
      await importSelection();
    } else if (msg.type === 'insert') {
      await insert(msg);
    } else if (msg.type === 'resize') {
      figma.ui.resize(Math.max(720, msg.w | 0), Math.max(520, msg.h | 0));
    }
  } catch (e) {
    post({ type: 'error', text: '작업에 실패했습니다: ' + (e && e.message ? e.message : String(e)) });
  }
};
