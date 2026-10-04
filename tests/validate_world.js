/* ============================================================
 * 世界一致性校验（无浏览器）
 * 运行：node tests/validate_world.js
 * 校验 WORLD：出口指向存在的地点、方位键合法、roam/battle 引用的
 * 敌人存在、事件里 give/fx 的物品存在、TRAVEL_EVENTS 非空。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8')
  + ';globalThis.__W = { WORLD, ITEMS, ENEMIES, TRAVEL_EVENTS };';
(0, eval)(code.replace(/'use strict';/g, ''));
const { WORLD, ITEMS, ENEMIES, TRAVEL_EVENTS } = globalThis.__W;

const KNOWN_DIRS = ['n', 's', 'w', 'e', 'up', 'down', 'se', 'nw', 'sw', 'ne', 'enter'];
const errs = [];

for (const [id, loc] of Object.entries(WORLD)) {
  for (const [d, ex] of Object.entries(loc.exits || {})) {
    if (!WORLD[ex.to]) errs.push(`出口缺失: ${id} -${d}-> ${ex.to}`);
    if (!KNOWN_DIRS.includes(d)) errs.push(`未知方位: ${id} .${d}`);
  }
  if (loc.roam) for (const en of [].concat(loc.roam.en)) if (!ENEMIES[en]) errs.push(`roam 敌人缺失: ${id} -> ${en}`);
}

for (const [id, loc] of Object.entries(WORLD)) {
  const parts = [];
  if (loc.onEnter) parts.push(loc.onEnter.toString());
  for (const a of (loc.actions || [])) if (a.run) parts.push(a.run.toString());
  for (const n of Object.values(loc.npcs || {})) if (n.talk) parts.push(n.talk.toString());
  const src = parts.join('\n');
  for (const m of src.matchAll(/battle\('([a-z_]+)'/g)) if (!ENEMIES[m[1]]) errs.push(`战斗敌人缺失: ${id} -> ${m[1]}`);
  for (const m of src.matchAll(/item: ?(?:\[[^\]]*])?'([a-z_]+)'/g)) if (!ITEMS[m[1]]) errs.push(`物品缺失: ${id} -> ${m[1]}`);
  for (const m of src.matchAll(/give\('([a-z_]+)'/g)) if (!ITEMS[m[1]]) errs.push(`物品缺失(give): ${id} -> ${m[1]}`);
}

if (!Array.isArray(TRAVEL_EVENTS) || !TRAVEL_EVENTS.length) errs.push('TRAVEL_EVENTS 为空或缺失');
else for (const t of TRAVEL_EVENTS) if (typeof t.run !== 'function' || !t.intro) errs.push(`旅途事件字段不全: ${t.id || '?'}`);

if (errs.length) { console.error('✗ 世界一致性校验失败：\n' + errs.join('\n')); process.exit(1); }
console.log(`✓ 全图一致性校验通过：${Object.keys(WORLD).length} 处地点，${TRAVEL_EVENTS.length} 条旅途事件，出口/方位/敌人/物品引用完整`);
