/* ============================================================
 * 世界一致性校验（无浏览器）
 * 运行：node tests/validate_world.js
 * 校验 WORLD：出口指向存在的地点、方位键合法、roam/battle 引用的
 * 敌人存在、事件里 give/fx 的物品存在、TRAVEL_EVENTS 非空；
 * 校验 DUNGEONS：副本敌人/奖励物品/入口注入/委托引用完整。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8')
  + ';globalThis.__W = { WORLD, ITEMS, ENEMIES, TRAVEL_EVENTS, DUNGEONS, DUNGEON_TASKS, SIDE_QUESTS, BOUNTIES };';
(0, eval)(code.replace(/'use strict';/g, ''));
const { WORLD, ITEMS, ENEMIES, TRAVEL_EVENTS, DUNGEONS, DUNGEON_TASKS, SIDE_QUESTS, BOUNTIES } = globalThis.__W;

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

/* 副本：敌人 / 奖励物品 / 入口注入 / 委托与兑换引用 */
if (!DUNGEONS || !Object.keys(DUNGEONS).length) errs.push('DUNGEONS 为空或缺失');
else for (const [id, dn] of Object.entries(DUNGEONS)) {
  for (const en of [].concat(dn.pool, dn.mimic, dn.boss)) if (!ENEMIES[en]) errs.push(`副本敌人缺失: ${id} -> ${en}`);
  if (!dn.boss) errs.push(`副本缺镇守者: ${id}`);
  if (!dn.gateText || !dn.boardText || !dn.exchangeText) errs.push(`副本入口动作文案不全: ${id}`);
  if (!WORLD[dn.at]) errs.push(`副本入口地点缺失: ${id} -> ${dn.at}`);
  else {
    const acts = WORLD[dn.at].actions || [];
    for (const txt of [dn.gateText, dn.boardText, dn.exchangeText])
      if (!acts.some(a => a.text === txt && typeof a.when === 'function' && typeof a.run === 'function'))
        errs.push(`副本入口动作未注入: ${id} -> ${txt}`);
  }
  if (!dn.exchange || !ITEMS[dn.exchange.item]) errs.push(`副本兑换物品缺失: ${id}`);
  if (!(WORLD[dn.at].npcs || {}).digger || typeof WORLD[dn.at].npcs.digger.talk !== 'function') errs.push(`副本入口缺掘客 NPC: ${id}`);
  const qr = dn.questRoom;
  if (qr) {
    if (!(qr.floor < dn.floors)) errs.push(`副本据点层超出层数: ${id}`);
    if (!SIDE_QUESTS[qr.side]) errs.push(`副本据点支线缺失: ${id} -> ${qr.side}`);
    if (!ITEMS[qr.item]) errs.push(`副本据点信物缺失: ${id} -> ${qr.item}`);
    if (!qr.flag || !qr.itemFlag || typeof qr.gold !== 'number' || !qr.intro || !qr.firstText || !qr.foundText) errs.push(`副本据点字段不全: ${id}`);
  }
  for (const part of [].concat(dn.firstClear ? dn.firstClear.item : [])) {
    const pid = String(part).split(':')[0];
    if (!ITEMS[pid]) errs.push(`副本首通奖励物品缺失: ${id} -> ${pid}`);
  }
  if (Array.isArray(dn.events)) for (const e of dn.events) {
    const src = (e.opts || []).map(o => o.run ? o.run.toString() : '').join('\n');
    for (const m of src.matchAll(/item: ?'([a-z_]+)(?::(\d+))?'/g)) if (!ITEMS[m[1]]) errs.push(`副本事件物品缺失: ${id} -> ${m[1]}`);
  }
}
for (const t of (DUNGEON_TASKS || [])) {
  if (!DUNGEONS[t.dn]) errs.push(`副本委托指向缺失副本: ${t.id} -> ${t.dn}`);
  if (t.type === 'boss' && !ENEMIES[t.en]) errs.push(`副本委托敌人缺失: ${t.id} -> ${t.en}`);
  if (t.type === 'relic' && !ITEMS[t.item]) errs.push(`副本委托物品缺失: ${t.id} -> ${t.item}`);
  if (!['floor', 'clear', 'boss', 'relic'].includes(t.type)) errs.push(`副本委托类型未知: ${t.id} -> ${t.type}`);
}
for (const b of (BOUNTIES || [])) {
  if (b.type === 'kill' && !ENEMIES[b.en]) errs.push(`酒馆委托敌人缺失: ${b.id} -> ${b.en}`);
  if (b.type === 'fetch' && !ITEMS[b.item]) errs.push(`酒馆委托物品缺失: ${b.id} -> ${b.item}`);
}

/* 物品「翻阅」资源（藏宝图线索文本 / 迷雾古图地图）指向的文件必须存在 */
for (const [id, it] of Object.entries(ITEMS)) {
  if (it.view && !fs.existsSync(path.join(__dirname, '..', it.view))) errs.push(`物品翻阅图缺失: ${id} -> ${it.view}`);
  if (!it.read && !it.view && it.desc && it.desc.includes('行囊中可随时翻')) errs.push(`物品声称可翻阅但无内容: ${id}`);
}

if (errs.length) { console.error('✗ 世界一致性校验失败：\n' + errs.join('\n')); process.exit(1); }
console.log(`✓ 全图一致性校验通过：${Object.keys(WORLD).length} 处地点，${Object.keys(DUNGEONS).length} 座副本（${DUNGEON_TASKS.length} 式委托），${TRAVEL_EVENTS.length} 条旅途事件，出口/方位/敌人/物品/副本引用完整`);
