/* 深度审计：旗标一致性 / 地点可达性 / 任务链 / 动态引用 —— 只读，不改任何数据 */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8');
const engineSrc = fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8');
const all = src + '\n' + engineSrc;   // 旗标/任务的「写」可能发生在引擎侧

const code = src
  + ';globalThis.__W = { WORLD, ITEMS, ENEMIES, TRAVEL_EVENTS, DUNGEONS, DUNGEON_TASKS, SIDE_QUESTS, BOUNTIES, QUESTS, ENDINGS, SKILLS, PARTY, SHOPS: (typeof SHOPS!=="undefined"?SHOPS:null) };';
(0, eval)(code.replace(/'use strict';/g, ''));
const W = globalThis.__W;
const { WORLD, ITEMS, ENEMIES, QUESTS, SIDE_QUESTS, ENDINGS, DUNGEONS, DUNGEON_TASKS, BOUNTIES, SKILLS, PARTY } = W;

const problems = [];
const notes = [];

/* 副本据点支线由掘客 NPC 以 sideQuest(qr.side) 动态接取，白名单化 */
const qrSides = new Set();
for (const dn of Object.values(DUNGEONS)) if (dn.questRoom && dn.questRoom.side) qrSides.add(dn.questRoom.side);
const isSqDynamic = q => qrSides.has(q);

/* ---------- 1. 地点可达性（无向连通 + 有向可达） ---------- */
{
  const start = 'grayridge_gate';
  const undirected = new Set([start]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, loc] of Object.entries(WORLD)) {
      if (undirected.has(id)) {
        for (const ex of Object.values(loc.exits || {})) {
          if (WORLD[ex.to] && !undirected.has(ex.to)) { undirected.add(ex.to); changed = true; }
        }
      } else {
        for (const ex of Object.values(loc.exits || {})) {
          if (ex.to === start || undirected.has(ex.to)) { undirected.add(id); changed = true; break; }
        }
      }
    }
  }
  for (const id of Object.keys(WORLD)) if (!undirected.has(id)) problems.push(`[孤岛地点] ${id} (${WORLD[id].name}) 与起点无双向连通路径`);

  // 有向可达（顺出口方向走）
  const directed = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    for (const ex of Object.values(WORLD[cur].exits || {})) {
      if (WORLD[ex.to] && !directed.has(ex.to)) { directed.add(ex.to); q.push(ex.to); }
    }
  }
  for (const id of Object.keys(WORLD)) if (!directed.has(id)) notes.push(`[单向不可达] ${id} (${WORLD[id].name}) 无法从起点沿出口方向走到（可能靠剧情 move 进入）`);
}

/* ---------- 2. 旗标一致性 ---------- */
const setFlags = new Set();
const readFlags = new Map(); // flag -> [loc ids]
// 动态旗标（变量下标），单独记录
const dynamicReads = new Set();
const dynamicSets = new Set();

for (const m of all.matchAll(/setFlag\(([^)]*)\)/g)) for (const q of m[1].matchAll(/'([^']+)'/g)) setFlags.add(q[1]);
for (const m of all.matchAll(/S\.flags\.([A-Za-z_]\w*)\s*=\s*true/g)) setFlags.add(m[1]);
for (const m of all.matchAll(/S\.flags\['([^']+)'\]\s*=\s*true/g)) setFlags.add(m[1]);
for (const m of all.matchAll(/flag:\s*'([^']+)'/g)) setFlags.add(m[1]);
for (const m of all.matchAll(/flag:\s*\[([^\]]+)\]/g)) for (const q of m[1].matchAll(/'([^']+)'/g)) setFlags.add(q[1]);
for (const m of all.matchAll(/S\.flags\[([A-Za-z_][\w.]*)\]\s*=/g)) dynamicSets.add(m[1]);

for (const m of src.matchAll(/S\.flags\.([A-Za-z_]\w*)/g)) readFlags.set(m[1], (readFlags.get(m[1]) || []).concat(m.index));
for (const m of src.matchAll(/S\.flags\['([^']+)'\]/g)) readFlags.set(m[1], (readFlags.get(m[1]) || []).concat(m.index));
for (const m of src.matchAll(/S\.flags\[([A-Za-z_][\w.]*)\]/g)) dynamicReads.add(m[1]);

const dynamicNames = ['id', 'qr.flag', 'rv.loot.flag', 'sk.reqFlag', 'f', 'key', 'k'];
const isDynamic = n => dynamicNames.includes(n);

/* partyJoin 会置 S.flags[id]，先收集再检查（同伴旗标在引擎侧写入） */
for (const m of all.matchAll(/partyJoin\(\s*'([^']+)'/g)) setFlags.add(m[1]);

for (const f of readFlags.keys()) {
  if (isDynamic(f)) continue;
  if (!setFlags.has(f)) problems.push(`[旗标只读未写] "${f}" 被判断但全文从未置真`);
}
for (const f of setFlags) {
  if (!readFlags.has(f)) notes.push(`[旗标只写未读] "${f}" 被置真但从未被判断（可能仅作存档记录）`);
}
for (const f of dynamicReads) if (!dynamicSets.has(f) && !isDynamic(f)) notes.push(`[动态旗标读取] S.flags[${f}] 未对应动态写入`);
for (const f of dynamicSets) if (!dynamicReads.has(f)) notes.push(`[动态旗标写入] S.flags[${f}] = 只写不读`);

/* ---------- 3. 任务链：QUESTS / SIDE_QUESTS ---------- */
const questSets = new Set();
for (const m of all.matchAll(/(?<![.\w])quest\(\s*'([^']+)'\s*\)/g)) questSets.add(m[1]);
for (const q of Object.keys(QUESTS)) if (q !== 'q_inn' && !questSets.has(q)) problems.push(`[主线任务不可达] QUESTS.${q} 定义了但从未 quest() 设置`);
for (const q of questSets) if (!QUESTS[q]) problems.push(`[主线任务未定义] quest('${q}') 但 QUESTS 无此键`);

const sqStarts = new Set(), sqDones = new Set();
for (const m of src.matchAll(/sideQuest\(\s*'([^']+)'\s*\)/g)) sqStarts.add(m[1]);
for (const m of src.matchAll(/finishSide\(\s*'([^']+)'\s*\)/g)) sqDones.add(m[1]);
for (const q of Object.keys(SIDE_QUESTS)) {
  if (!sqStarts.has(q) && !isSqDynamic(q)) problems.push(`[支线不可接取] SIDE_QUESTS.${q} 从未被 sideQuest() 接取`);
  else if (!sqDones.has(q) && !isSqDynamic(q)) problems.push(`[支线无法完成] SIDE_QUESTS.${q} 可接取但从未 finishSide()`);
}
for (const q of sqStarts) if (!SIDE_QUESTS[q]) problems.push(`[支线未定义] sideQuest('${q}')`);
for (const q of sqDones) if (!SIDE_QUESTS[q]) problems.push(`[支线未定义] finishSide('${q}')`);

/* ---------- 4. ENDINGS / chapterEnd / ending() ---------- */
const endCalls = new Set();
for (const m of src.matchAll(/\b(?:ending|chapterEnd)\(\s*'([^']+)'/g)) endCalls.add(m[1]);
for (const e of endCalls) if (!ENDINGS.some(x => x.id === e)) problems.push(`[结局未定义] ending('${e}') 不在 ENDINGS`);
for (const e of ENDINGS) if (!endCalls.has(e.id)) notes.push(`[结局未触发] ENDINGS.${e.id} (${e.name}) 无 ending()/chapterEnd() 调用（可能由别处条件触发）`);

/* ---------- 5. move() / battle() / give() 字符串引用 ---------- */
for (const m of src.matchAll(/(?<![.\w])move\(\s*'([a-z_]+)'/g)) if (!WORLD[m[1]]) problems.push(`[move 目标缺失] ${m[1]}`);
for (const m of src.matchAll(/battle\(\s*'([a-z_]+)'/g)) if (!ENEMIES[m[1]]) problems.push(`[battle 敌人缺失] ${m[1]}`);
for (const m of src.matchAll(/give\(\s*'([a-z_]+)'/g)) if (!ITEMS[m[1]]) problems.push(`[give 物品缺失] ${m[1]}`);

/* ---------- 6. 商店 / 兑换：买得起的物品必须存在；rep/gold 价格为正 ---------- */
for (const [locId, loc] of Object.entries(WORLD)) {
  const parts = [];
  if (loc.onEnter) parts.push(loc.onEnter.toString());
  for (const a of (loc.actions || [])) if (a.run) parts.push(a.run.toString());
  for (const n of Object.values(loc.npcs || {})) if (n.talk) parts.push(n.talk.toString());
  for (const part of parts) {
    for (const m of part.matchAll(/cost:\s*(\d+)/g)) if (+m[1] < 0) problems.push(`[负价格] ${locId}`);
    for (const m of part.matchAll(/items:\s*\[([^\]]+)\]/g)) {
      for (const it of m[1].matchAll(/'([a-z_]+)'/g)) if (!ITEMS[it[1]]) problems.push(`[商店物品缺失] ${locId} -> ${it[1]}`);
    }
  }
}

/* ---------- 7. 同伴一致性：partyJoin 的 id 必须在 PARTY 中 ---------- */
for (const m of all.matchAll(/partyJoin\(\s*'([^']+)'/g)) if (!PARTY[m[1]]) problems.push(`[同伴未定义] partyJoin('${m[1]}')`);

/* ---------- 8. 技能引用 ---------- */
for (const m of src.matchAll(/SKILLS\.([a-z_]+)/g)) if (!SKILLS[m[1]]) problems.push(`[技能未定义] SKILLS.${m[1]}`);

/* ---------- 9. 出口 req 与剧情旗标交叉：被 req 锁住却永不解锁的出口 ---------- */
for (const [id, loc] of Object.entries(WORLD)) {
  for (const [d, ex] of Object.entries(loc.exits || {})) {
    if (ex.req) {
      const body = ex.req.toString();
      for (const m of body.matchAll(/S\.flags\.([A-Za-z_]\w*)/g)) {
        if (!setFlags.has(m[1]) && !isDynamic(m[1])) problems.push(`[出口死锁] ${id} -${d}-> 的 req 依赖旗标 "${m[1]}"，全文无人置真`);
      }
    }
  }
}

/* ---------- 输出 ---------- */
console.log(`地点 ${Object.keys(WORLD).length} | 物品 ${Object.keys(ITEMS).length} | 敌人 ${Object.keys(ENEMIES).length} | 主线 ${Object.keys(QUESTS).length} | 支线 ${Object.keys(SIDE_QUESTS).length} | 结局 ${ENDINGS.length}`);
console.log(`\n===== 问题（${problems.length}）=====`);
problems.forEach(p => console.log('✗ ' + p));
console.log(`\n===== 备注（${notes.length}）=====`);
notes.forEach(n => console.log('· ' + n));
