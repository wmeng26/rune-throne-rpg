/* ============================================================
 * 地图寻路探针（无浏览器）：验证 BFS 路线 / 周边去路 / 未知地点雾名
 * 运行：node tests/probe_map_route.js
 * 注：与 smoke.js 同法，探针主体与游戏代码同一次 eval 载入，
 *     以共享 S/WORLD 等全局词法绑定。
 * ============================================================ */
const fs = require('fs');
const path = require('path');

function makeEl() {
  return {
    innerHTML: '', textContent: '', className: '', disabled: false, value: '',
    dataset: {}, children: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); }, remove() {},
    addEventListener() {}, querySelectorAll: () => [],
    focus() {}, get scrollTop() { return 0; }, set scrollTop(v) {},
    get scrollHeight() { return 0; },
  };
}
const els = {};
global.els = els;
global.document = {
  hidden: true, activeElement: null,
  querySelector: sel => (els[sel] = els[sel] || makeEl()),
  querySelectorAll: () => [],
  createElement: () => makeEl(), addEventListener() {},
};
global.window = { addEventListener() {} };
global.location = { search: '?fast=1' };
global.localStorage = (() => {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
})();

const probe = `
let fail = 0;
const assert = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fail++; };

/* 档一：全图点亮，脚下在灰岭镇口 */
startNewGame('探针');
for (const id of Object.keys(WORLD)) S.visits[id] = (S.visits[id] || 0) + 1;
S.loc = 'grayridge_gate';

console.log('—— BFS 寻路 ——');
let steps = mapRouteSteps('grayridge_gate', 'inn_hall');
assert(steps && steps.length === 1 && steps[0].dir === 'n' && steps[0].to === 'inn_hall',
  '镇口→旅店：一步直达（' + (steps || []).map(s => DIRS[s.dir] + '·' + s.label).join(' / ') + '）');

steps = mapRouteSteps('grayridge_gate', 'lighthouse');
assert(steps && steps.length > 3, '镇口→潮歌灯塔：跨章路线 ' + (steps ? steps.length : '✗null') + ' 程');
if (steps) console.log('    ' + steps.map(s => WORLD[s.from].name + ' —' + (DIRS[s.dir] || s.dir) + '→ ' + WORLD[s.to].name).join('；'));

steps = mapRouteSteps('throne_hall', 'grayridge_gate');
assert(steps && steps.length > 3, '影渊王座→镇口：反向可达，' + (steps ? steps.length : '✗') + ' 程');

assert(mapRouteSteps('grayridge_gate', 'no_such_place') === null, '图外地点：返回 null（不崩溃）');

let reach = 0;
for (const id of Object.keys(WORLD)) if (mapRouteSteps('grayridge_gate', id) !== null) reach++;
console.log('  · 从镇口可达 ' + reach + ' / ' + Object.keys(WORLD).length + ' 处（余者为孤立剧情点，地图提示「随剧情走到」）');

console.log('—— 雾名遮蔽 ——');
startNewGame('探针二');   // 新档：除起点外均未踏足
S.loc = 'grayridge_gate';
showMapRoute('lighthouse');
const fogHtml = els['#map-route'].innerHTML;
assert(fogHtml.includes('？？？'), '新档路线：未踏足的中间地名以？？？遮蔽（不剧透）');
assert(fogHtml.includes('前往'), '路线面板渲染标题');

console.log('—— 周边去路（默认面板）——');
showMapNearby();
const nearHtml = els['#map-route'].innerHTML;
assert(nearHtml.includes('此处') && nearHtml.includes('黑鸦旅店'), '默认面板：显示脚下地点与周边去路');
assert(nearHtml.includes('🔒'), '未解锁的去路带🔒标记（cedricDead 前南/东不通）');

console.log('—— openMap 全流程（DOM 桩）——');
openMap();
const mapHtml = els['#modal-content'].innerHTML;
assert(mapHtml.includes('行记图') && mapHtml.includes('已踏足'), 'openMap 正常渲染（行记图/已踏足）');
assert(mapHtml.includes('data-loc='), '去过的地点带 data-loc 可点选');
assert(mapHtml.includes('id="map-route"'), '路线面板渲染于内容末尾');

console.log(fail ? '\\n✗ ' + fail + ' 项未过' : '\\n★ 地图寻路探针全部通过');
if (fail) throw new Error('probe failed: ' + fail);
`;

const code = [
  fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8'),
  probe,
].join('\n;\n').replace(/'use strict';/g, '');
(0, eval)(code);
