/* ============================================================
 * 端到端冒烟测试（无浏览器）
 * 运行：node tests/smoke.js
 * 本文件只负责 DOM/浏览器桩 + 载入游戏代码；测试驱动见 driver.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------- DOM / 浏览器桩 ---------- */
function makeEl() {
  return {
    innerHTML: '', textContent: '', className: '', disabled: false, value: '',
    dataset: {}, children: [],
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); },
    remove() {},
    addEventListener() {},
    querySelectorAll: () => [],
    focus() {},
    get scrollTop() { return 0; }, set scrollTop(v) {},
    get scrollHeight() { return 0; },
  };
}
const els = {};
global.document = {
  hidden: true,
  activeElement: null,
  querySelector: sel => (els[sel] = els[sel] || makeEl()),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {},
};
global.window = { addEventListener() {} };
global.location = { search: '' };
global.localStorage = (() => {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
})();

/* ---------- 载入游戏代码（去掉文件级 'use strict'，使声明进入全局作用域）+ 驱动 ---------- */
const code = [
  fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8'),
].join('\n;\n').replace(/'use strict';/g, '');
(0, eval)(code);
