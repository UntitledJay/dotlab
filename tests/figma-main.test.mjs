// Runs figma/code.js against a mocked `figma` global (no Figma app needed).
import test from 'node:test';
import assert from 'node:assert'; // loose deepEqual: vm-realm arrays have their own prototypes
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { root } from './helpers.mjs';
import { join } from 'node:path';

// objects created inside the vm context have their own prototypes; compare plain copies
const plain = x => JSON.parse(JSON.stringify(x));

function makeFigma() {
  const sent = [], storage = {}, styles = []; let idn = 1;
  function mkNode(type, extra) {
    return Object.assign({ id: '1:' + (idn++), type, name: type, x: 0, y: 0, width: 100, height: 100, children: [], parent: null, removed: false, plugin: {}, fills: [],
      resize(w, h) { this.width = w; this.height = h; },
      appendChild(c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c); },
      insertChild(i, c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.splice(i, 0, c); },
      remove() { this.removed = true; if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; },
      setPluginData(k, v) { this.plugin[k] = v; }, getPluginData(k) { return this.plugin[k] || ''; },
      setRelaunchData(d) { this.relaunch = d; },
      findAll(fn) { const out = []; const walk = n => { for (const c of n.children) { if (fn(c)) out.push(c); walk(c); } }; walk(this); return out; },
      async exportAsync() { return new Uint8Array([137, 80, 78, 71]); } }, extra || {});
  }
  const page = mkNode('PAGE'); page.selection = [];
  const figma = {
    command: '', currentPage: page,
    showUI() {}, ui: { postMessage(m) { sent.push(m); }, resize(w, h) { sent.push({ type: '__resize', w, h }); }, onmessage: null },
    on(ev, fn) { this['on_' + ev] = fn; },
    clientStorage: { async getAsync(k) { return storage[k]; }, async setAsync(k, v) { storage[k] = v; }, async deleteAsync(k) { delete storage[k]; } },
    createNodeFromSvg(svg) { const f = mkNode('FRAME'); for (let i = 0; i < (svg.match(/<g /g) || []).length; i++) { const g = mkNode('GROUP'); g.appendChild(mkNode('VECTOR', { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: .3 } }] })); f.appendChild(g); } return f; },
    createFrame() { return mkNode('FRAME'); },
    createComponentFromNode(n) { const c = mkNode('COMPONENT'); c.name = n.name; page.appendChild(c); c.appendChild(n); return c; },
    combineAsVariants(nodes, parent) { const s = mkNode('COMPONENT_SET'); parent.appendChild(s); for (const n of nodes) s.appendChild(n); return s; }, createRectangle() { return mkNode('RECTANGLE'); }, createImage(b) { return { hash: 'h' + b.length }; },
    async getNodeByIdAsync(id) { return [page, ...page.findAll(() => true)].find(n => n.id === id) || null; },
    viewport: { center: { x: 500, y: 400 }, scrollAndZoomIntoView() {} },
    async getLocalPaintStylesAsync() { return styles; },
    createPaintStyle() { const s = { name: '', paints: [] }; styles.push(s); return s; },
    notify() {},
  };
  return { figma, sent, storage, styles, page, mkNode };
}

test('figma main thread', async () => {
  const m = makeFigma(); const { figma, sent, storage, styles, page } = m;
  vm.runInContext(readFileSync(join(root, 'figma/code.js'), 'utf8'), vm.createContext({ figma, __html__: '', console, Math, String, parseInt }));
  const on = figma.ui.onmessage;
  storage.apiKey = 'sk-ant-x';
  await on({ type: 'ready' });
  assert.deepEqual(plain(sent.find(x => x.type === 'init')), { type: 'init', autosave: null, apiKey: 'sk-ant-x' });

  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g id="a"><path fill="#ff004d" d="M0 0h4v4h-4z"/></g><g id="b"><path fill="#fff" d="M4 0h4v4h-4z"/></g></svg>';
  await on({ type: 'insert', mode: 'vector', name: '물약', w: 64, h: 64, frames: [{ svg, layerNames: ['병', '거품'] }, { svg, layerNames: ['병', '거품'] }], frameNames: ['물약 · 1', '물약 · 2'], project: '{"format":"dotlab"}', replaceId: null, palette: ['#000000', '#ff004d'] });
  const ins = sent.filter(x => x.type === 'inserted').pop();
  const top = page.children.at(-1);
  assert.equal(top.layoutMode, 'HORIZONTAL', 'animation frames sit in an auto-layout row');
  assert.deepEqual(top.children.map(c => c.name), ['물약 · 1', '물약 · 2']);
  assert.deepEqual(top.children[0].children.map(g => g.name), ['병', '거품'], 'groups named after layers');
  assert.equal(top.children[0].children[0].children[0].name, '#ff004d', 'vectors named after colours');
  assert.equal(top.getPluginData('dotlab'), '{"format":"dotlab"}', 'project stored on the node');
  assert.ok(top.relaunch, 'relaunch button set');
  assert.deepEqual(styles.map(s => s.name), ['도트랩/물약/01 #000000', '도트랩/물약/02 #ff004d']);

  top.x = 120; top.y = 80;
  await on({ type: 'insert', mode: 'image', name: '물약', w: 64, h: 64, frames: [{ png: new Uint8Array(10) }], frameNames: ['물약'], project: '{}', replaceId: ins.nodeId, palette: null });
  const ins2 = sent.filter(x => x.type === 'inserted').pop();
  const top2 = page.children.find(n => n.id === ins2.nodeId);
  assert.equal(ins2.updated, true); assert.equal(page.children.length, 1, 'old node replaced');
  assert.deepEqual([top2.x, top2.y], [120, 80], 'replacement keeps position');
  assert.equal(top2.children[0].fills[0].type, 'IMAGE');

  page.selection = [top2]; await on({ type: 'import-selection' }); assert.equal(sent.at(-1).type, 'open-project');
  const rect = m.mkNode('RECTANGLE'); page.appendChild(rect); page.selection = [rect]; await on({ type: 'import-selection' }); assert.equal(sent.at(-1).type, 'import-image');
  page.selection = []; await on({ type: 'import-selection' }); assert.equal(sent.at(-1).type, 'error');
  await on({ type: 'autosave', data: 'X' }); assert.equal(storage.autosave, 'X');
  await on({ type: 'set-key', key: '' }); assert.ok(!('apiKey' in storage));
  await on({ type: 'resize', w: 300, h: 900 }); assert.deepEqual(plain(sent.at(-1)), { type: '__resize', w: 720, h: 900 });

  // UI component: states become variants of one component set, the 9-slice note goes into the description
  await on({ type: 'insert', mode: 'vector', name: '버튼', w: 48, h: 24, frames: [{ svg, layerNames: ['버튼'] }, { svg, layerNames: ['버튼'] }], frameNames: ['상태=기본', '상태=호버'], asComponents: true, note: '9-slice 여백', project: '{"c":1}', palette: null });
  const set = page.children.find(n => n.id === sent.filter(x => x.type === 'inserted').pop().nodeId);
  assert.equal(set.type, 'COMPONENT_SET'); assert.equal(set.name, '버튼'); assert.equal(set.layoutMode, 'HORIZONTAL');
  assert.deepEqual(set.children.map(c => [c.type, c.name]), [['COMPONENT', '상태=기본'], ['COMPONENT', '상태=호버']]);
  assert.equal(set.description, '9-slice 여백'); assert.equal(set.getPluginData('dotlab'), '{"c":1}');
  await on({ type: 'insert', mode: 'image', name: '패널', w: 48, h: 40, frames: [{ png: new Uint8Array(10) }], frameNames: ['상태=기본'], asComponents: true, note: 'n', project: '{}', palette: null });
  const one = page.children.find(n => n.id === sent.filter(x => x.type === 'inserted').pop().nodeId);
  assert.deepEqual([one.type, one.name, one.description], ['COMPONENT', '패널', 'n'], 'a single state is a plain component');
});
