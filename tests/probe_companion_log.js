/* ============================================================
 * 探针：完整跑一遍冒烟流程，记录每条日志产生时的同伴入队状态，
 * 输出「未入队却提及该同伴」的日志行——应只剩合理的第三方提及。
 * 运行：node tests/probe_companion_log.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

function makeEl() {
  return {
    innerHTML: '', textContent: '', className: '', disabled: false, value: '',
    dataset: {}, children: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); },
    remove() {}, addEventListener() {}, querySelectorAll: () => [], focus() {},
    get scrollTop() { return 0; }, set scrollTop(v) {},
    get scrollHeight() { return 0; },
  };
}
const els = {};
global.document = {
  hidden: true, activeElement: null,
  querySelector: sel => (els[sel] = els[sel] || makeEl()),
  querySelectorAll: () => [], createElement: () => makeEl(), addEventListener() {},
};
global.window = { addEventListener() {} };
global.location = { search: '?fast=1' };
global.localStorage = (() => {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
})();

/* ---------- 一次 eval 载入全部代码（与 smoke.js 同作用域），中间插入记录包装 ---------- */
const wrapper = `
;(() => {
  const journal = [];
  globalThis.__journal = journal;
  const snapFlags = () => ({ aria: !!S.flags.aria, thorne: !!S.flags.thorne, kaya: !!S.flags.kaya, loc: S.loc });
  const origLogLine = logLine;
  logLine = function (text, cls) { journal.push({ text: String(text), at: snapFlags() }); return origLogLine(text, cls); };
  const origSay = say;
  say = function (paras, opts) {
    for (const p of (Array.isArray(paras) ? paras : [paras]).filter(Boolean)) journal.push({ text: String(p), at: snapFlags() });
    return origSay(paras, opts);
  };
  /* 驱动结束会 process.exit——截获为完成信号，让探针有机会汇总 */
  process.exit = code => { globalThis.__driverDone = code; };
})();
`;
const code = [
  fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8'),
  wrapper,
  fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8'),
].join('\n;\n').replace(/'use strict';/g, '');
(0, eval)(code);

/* ---------- 汇总（轮询等待驱动截获的完成信号） ---------- */
const journal = globalThis.__journal;
const timer = setInterval(() => {
  if (globalThis.__driverDone === undefined) return;
  clearInterval(timer);
const NAME = { aria: '艾莉娅', thorne: '索恩', kaya: '卡雅' };
console.log('\n—— 探针：未入队阶段的同伴名提及（人工复核清单）——');
let suspicious = 0;
  for (const who of Object.keys(NAME)) {
    const hits = journal.filter(j => !j.at[who] && j.text.includes(NAME[who]));
    console.log(`\n[${NAME[who]}] 未入队时提及 ${hits.length} 处：`);
    for (const h of hits) {
      console.log(`  @${h.at.loc}  ${h.text.slice(0, 90)}`);
    }
    suspicious += hits.length;
  }
  console.log(`\n日志总条数 ${journal.length}；未入队阶段提及合计 ${suspicious} 处（第三方提及如「卡雅她娘」「找艾莉娅·星语」属合理伏笔；同伴以在场口吻说话/行动即为问题）`);
  process.exit(globalThis.__driverDone);
}, 50);
