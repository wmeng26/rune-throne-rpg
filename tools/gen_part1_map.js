/* ============================================================
 * 第一部地图生成器：从 world.js 的出口数据推导空间布局，输出 SVG 地图
 * 运行：node tools/gen_part1_map.js   （地图每次改动后重跑即可刷新）
 * 布局：BFS 播种 → 力导向（周期性吸附网格）→ 贪心修复最小化方向违背
 * ============================================================ */
'use strict';
/* 固定随机种子：保证每次重跑布局一致（贪心抛光含随机顺序） */
let _seed = 20261006;
Math.random = () => (_seed = (_seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const fs = require('fs');
const path = require('path');

/* ---------- 载入 world.js（与 smoke.js 同样方式：拼接后一次性 eval） ---------- */
const src = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8')
  .replace(/'use strict';/g, '') + '\n;globalThis.__WORLD = WORLD; globalThis.__TREASURES = TREASURES;';
(0, eval)(src);
const WORLD = globalThis.__WORLD;
const TREASURES = globalThis.__TREASURES;

/* ---------- 取第一部地点 + 两端边界（序章镇口 / 第二部岔路） ---------- */
const PART1_CH = '第一部 · 晨曦之印';
const ids = Object.keys(WORLD).filter(id => WORLD[id].ch === PART1_CH);
const boundary = ['grayridge_gate', 'spur_fork'].filter(id => WORLD[id]);
const all = [...ids, ...boundary];

/* ---------- 边：dir → 单位向量；「回×」开头的折返路视为弱约束 ---------- */
const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1], up: [0, -1], down: [0, 1] };
const edges = [];
for (const a of ids) {
  for (const [d, ex] of Object.entries(WORLD[a].exits || {})) {
    if (!all.includes(ex.to)) continue;
    const v = DIRV[d]; if (!v) continue;
    edges.push({ a, b: ex.to, v, strong: !(ex.label || '').startsWith('回'), dash: d === 'up' || d === 'down' });
  }
}

/* ---------- 代价：方向保真度（边越长越要求方向精准，过长的边另罚） ---------- */
const anchors = new Set(['south_road']);
const adj = {}; for (const id of all) adj[id] = [];
edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
function edgePairCost(p, e) {
  const dx = p[e.b].x - p[e.a].x, dy = p[e.b].y - p[e.a].y;
  const len = Math.hypot(dx, dy) || 1e-9;
  const vlen = Math.hypot(e.v[0], e.v[1]) || 1e-9;
  const cos = (dx * e.v[0] + dy * e.v[1]) / (len * vlen);
  const align = 1 - cos;                                   // 0 = 方向完全一致
  const stretch = Math.max(0, len - 2.4);                  // 超过 2.4 格的边额外拉长罚
  const w = e.strong ? 1 : 0.12;
  return w * (2.2 * align + 0.35 * stretch * stretch);
}
function pairSepCost(p, i, j) {
  const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
  const d2 = dx * dx + dy * dy;
  return d2 < 0.81 ? 3 * (0.81 - d2) : 0;                  // 仅罚近重叠（相邻格不受罚）
}
function edgeCost(p) {
  let c = 0;
  for (const e of edges) c += edgePairCost(p, e);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) c += pairSepCost(p, all[i], all[j]);
  return c;
}
/* 节点 id 的局部代价（含邻接边与两两间距），用于增量评估 */
function localCost(p, id) {
  let c = 0;
  for (const ei of adj[id]) c += edgePairCost(p, edges[ei]);
  for (const o of all) if (o !== id) c += pairSepCost(p, id, o);
  return c;
}

/* ---------- 手工种子布局（依强约束方向精心排布；后续整数抛光只做局部微调） ----------
 * 游戏出口是「路径逻辑」而非严格罗盘（如 岔路→营地→朝圣古道 一线向北，但 营地 又在 岔路 之南），
 * 少数边无法在平面上完全成立；种子已使绝大多数边方向精准，残余偏差由抛光与偏差报告兜底。 */
const MANUAL_SEED = {
  /* 中轴：镇口 → 古道 → 岔路 → 营地 → 朝圣路 → 圣殿 */
  grayridge_gate: [0, -1], south_road: [0, 0], forest_cross: [0, 1], white_spring: [1, 0],
  dusk_camp: [1, 1], pilgrim_path: [2, 0], temple_foot: [2, -1],
  /* 东侧森林线：深径 → 猎屋 → 瞭望塔 → 浆果坡 → 伐木场 */
  forest_deep: [1, 2], hunter_lodge: [2, 2], watchtower_stand: [4, 1],
  logger_camp: [3, 1], berry_thicket: [4, 0], spur_fork: [3, 0],
  /* 西侧湖链：林道 → 鸦眠坡 / 湖 → 湖心洲 / 沼泽 → 蕨谷 → 断桥 */
  forest_road: [-1, 1], crow_ridge: [-1, -1], mist_lake: [-3, 1],
  lake_islet: [-3, 0], lakeside_marsh: [-3, 2], fern_gully: [-3, 3], stone_ford: [-3, 4],
  /* 西南角：白鹇与古祠一线 */
  hermit_hut: [-1, 0], bee_clearing: [-2, 0], mossy_dell: [-2, 1],
  old_shrine: [0, 2], old_quarry: [2, 1],
  /* 圣殿建筑群 */
  orchard_terrace: [1, -1], lamp_court: [2, -2], guest_hall: [1, -2],
  temple_gate: [2, -3], temple_hall: [2, -4], temple_cloister: [1, -4],
  temple_crypt: [1, -3], bell_stump: [1, -5], temple_spring: [0, -5], temple_altar: [2, -5],
};

/* ---------- 整数域贪心抛光：±2 移动 + 交换，最小化方向保真代价 ---------- */
{
  const pos = {};
  for (const id of all) {
    if (MANUAL_SEED[id]) pos[id] = { x: MANUAL_SEED[id][0], y: MANUAL_SEED[id][1] };
    else pos[id] = { x: Math.random() * 8 - 4, y: Math.random() * 8 - 4 };
  }
  console.log("种子代价：" + edgeCost(pos).toFixed(2));
  const occupied = id => all.some(o => o !== id && pos[o].x === pos[id].x && pos[o].y === pos[id].y);
  for (let round = 0; round < 120; round++) {
    let improved = false;
    for (const id of all.filter(i => !anchors.has(i)).sort(() => Math.random() - 0.5)) {
      const cur = { x: pos[id].x, y: pos[id].y };
      let bestM = { x: cur.x, y: cur.y, c: edgeCost(pos) };
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        pos[id].x = cur.x + dx; pos[id].y = cur.y + dy;
        if (occupied(id)) continue;
        const c = edgeCost(pos);
        if (c < bestM.c - 1e-9) bestM = { x: cur.x + dx, y: cur.y + dy, c };
      }
      for (const o of all) {
        if (o === id || anchors.has(o) || MANUAL_SEED[o]) continue;
        if (Math.abs(pos[o].x - cur.x) > 2 || Math.abs(pos[o].y - cur.y) > 2) continue;
        const ox = pos[o].x, oy = pos[o].y;
        pos[id].x = ox; pos[id].y = oy; pos[o].x = cur.x; pos[o].y = cur.y;
        const c = edgeCost(pos);
        pos[o].x = ox; pos[o].y = oy; pos[id].x = cur.x; pos[id].y = cur.y;
        if (c < bestM.c - 1e-9) bestM = { x: ox, y: oy, c, swapWith: o, oOld: { x: cur.x, y: cur.y } };
      }
      if (bestM.swapWith) {
        const o = bestM.swapWith;
        pos[o].x = bestM.oOld.x; pos[o].y = bestM.oOld.y;
        pos[id].x = bestM.x; pos[id].y = bestM.y;
        improved = true;
      } else if (bestM.x !== cur.x || bestM.y !== cur.y) {
        pos[id].x = bestM.x; pos[id].y = bestM.y;
        improved = true;
      } else { pos[id].x = cur.x; pos[id].y = cur.y; }
    }
    if (!improved) break;
  }
  var best = { pos, cost: edgeCost(pos) };
}
const pos = best.pos;
console.log(`方向保真代价：${best.cost.toFixed(2)}（手工种子 + 整数抛光；0 为所有边方向完全精准）`);
/* 报告偏差最大的强约束边，便于人工核查 */
const worst = edges.filter(e => e.strong)
  .map(e => ({ e, c: edgePairCost(pos, e) }))
  .sort((a, b) => b.c - a.c).slice(0, 6);
for (const w of worst) console.log(`  偏差边：${w.e.a} → ${w.e.b}（${w.c.toFixed(2)}）`);

/* ---------- 校验：无重叠 ---------- */
const cells = new Set(all.map(id => pos[id].x + ',' + pos[id].y));
if (cells.size !== all.length) throw new Error('布局重叠未消解干净');

/* ---------- 小节配色与徽标 ---------- */
const SUB_STYLE = {
  '小节一 · 南下古道': { fill: '#3a2f1e', stroke: '#c98227', label: '小节一 · 南下古道' },
  '小节二 · 迷雾森林': { fill: '#1c2e1f', stroke: '#5f9e63', label: '小节二 · 迷雾森林' },
  '小节三 · 符文圣殿': { fill: '#232a44', stroke: '#8ea2e0', label: '小节三 · 符文圣殿' },
  '小节四 · 晨曦重燃': { fill: '#403116', stroke: '#ffd76a', label: '小节四 · 晨曦重燃' },
};
const BOUNDARY_STYLE = { fill: '#23242e', stroke: '#6b6d7c', label: '邻接章节' };

const CW = 176, CH = 108, PAD = 30;            // 单元格与画布边距
const xs = all.map(id => pos[id].x), ys = all.map(id => pos[id].y);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const W = (maxX - minX + 1) * CW + PAD * 2, H = (maxY - minY + 1) * CH + PAD * 2 + 175;
const cx = id => PAD + (pos[id].x - minX) * CW + CW / 2;
const cy = id => PAD + 70 + (pos[id].y - minY) * CH + CH / 2;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* 节点徽标：⚠野外 🏕休息 💾存档 👤NPC 🗺藏宝图 */
function badges(id) {
  const l = WORLD[id] || {};
  const b = [];
  if (l.roam) b.push('⚠');
  if (l.rest) b.push('🏕');
  if (l.checkpoint) b.push('💾');
  if (l.npcs && Object.keys(l.npcs).length) b.push('👤');
  if (Object.values(TREASURES).some(t => t.digAt === id)) b.push('❖');
  return b.join(' ');
}

/* ---------- SVG 拼装 ---------- */
let svg = [];
svg.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0b0c14"/>`);
svg.push(`<text x="${W / 2}" y="40" text-anchor="middle" fill="#e8d9a0" font-size="26" letter-spacing="6">第一部 · 晨曦之印 —— 艾尔多兰行记图</text>`);
svg.push(`<text x="${W / 2}" y="64" text-anchor="middle" fill="#8a8ca0" font-size="13">共 ${ids.length} 处地点 · 布局由游戏出口数据推导（手工种子 + 方向保真抛光）· node tools/gen_part1_map.js 重新生成</text>`);

for (const e of edges) {
  const x1 = cx(e.a), y1 = cy(e.a), x2 = cx(e.b), y2 = cy(e.b);
  if (e.dash) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#566" stroke-width="2" stroke-dasharray="5 4"/>`);
  else if (e.strong) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3c3e52" stroke-width="2"/>`);
  else svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2e3044" stroke-width="1.4" stroke-dasharray="2 4"/>`);
}
for (const id of all) {
  const l = WORLD[id];
  const st = ids.includes(id) ? (SUB_STYLE[l.sub] || SUB_STYLE['小节二 · 迷雾森林']) : BOUNDARY_STYLE;
  const x = cx(id), y = cy(id);
  const bw = 152, bh = l.name.includes(' · ') ? 62 : 48;
  /* 强调翻转：加粗行 = 区分本名，小字 = 地区前缀（与第二/三部详图一致） */
  const [pre, base] = l.name.split(' · ');
  const nm = base || pre, sub2 = base ? pre : null;
  svg.push(`<rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${ids.includes(id) ? 1.6 : 1.2}" ${ids.includes(id) ? '' : 'stroke-dasharray="4 3"'}/>`);
  svg.push(`<text x="${x}" y="${y - (sub2 ? 4 : -5)}" text-anchor="middle" fill="${ids.includes(id) ? '#f0e6c8' : '#9a9cae'}" font-size="14" font-weight="bold">${esc(nm)}</text>`);
  if (sub2) svg.push(`<text x="${x}" y="${y + 13}" text-anchor="middle" fill="${ids.includes(id) ? '#b8ac86' : '#77798a'}" font-size="11">${esc(sub2)}</text>`);
  const bd = badges(id);
  if (bd) svg.push(`<text x="${x + bw / 2 - 8}" y="${y - bh / 2 + 14}" text-anchor="end" font-size="11" fill="#c9b06a">${bd}</text>`);
  if (!ids.includes(id)) svg.push(`<text x="${x}" y="${y + bh / 2 + 13}" text-anchor="middle" fill="#6b6d7c" font-size="11">${(l.ch || '').replace(' · ', '')}</text>`);
}

/* 图例 */
const legY = H - 104;
svg.push(`<rect x="${PAD}" y="${legY - 18}" width="${W - PAD * 2}" height="92" rx="8" fill="#101120" stroke="#2b2c40"/>`);
let lx = PAD + 20;
svg.push(`<text x="${lx}" y="${legY + 6}" fill="#8a8ca0" font-size="12">小节：</text>`);
lx += 44;
for (const st of Object.values(SUB_STYLE)) {
  svg.push(`<rect x="${lx}" y="${legY - 6}" width="14" height="14" rx="3" fill="${st.fill}" stroke="${st.stroke}"/>`);
  svg.push(`<text x="${lx + 20}" y="${legY + 6}" fill="#c8c9d8" font-size="12">${st.label.replace('小节', '')}</text>`);
  lx += 20 + st.label.replace('小节', '').length * 12 + 34;
}
svg.push(`<text x="${PAD + 20}" y="${legY + 30}" fill="#8a8ca0" font-size="12">徽标：⚠ 野外遭遇　🏕 可休息　💾 存档点　👤 有 NPC　❖ 藏宝图埋宝处　　虚线边 = 上/下楼　点线边 = 「回」折返捷径　虚线框 = 邻接章节入口</text>`);
svg.push(`<text x="${PAD + 20}" y="${legY + 52}" fill="#66687e" font-size="11">主线：灰岭镇口 → 南下古道 → 迷雾森林（救下艾莉娅）→ 朝圣古道 → 符文圣殿三重试炼 → 晨曦祭坛 → 东北下山道（第二部）</text>`);
svg.push(`<text x="${PAD + 20}" y="${legY + 70}" fill="#66687e" font-size="11">环路：古道—泉—料场 / 岔路—猎屋—瞭望塔—浆果坡—伐木场 / 湖—沼泽—蕨谷—渡口 / 祠—苔谷—蜂场—药屋</text>`);

/* ---------- 输出自包含 HTML ---------- */
const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>第一部 · 晨曦之印 — 地图</title>
<style>
  body{margin:0;background:#0b0c14;font-family:"Microsoft YaHei","PingFang SC",sans-serif;display:flex;flex-direction:column;align-items:center;padding:18px;}
  svg{max-width:100%;height:auto;}
</style></head><body>
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${svg.join('\n')}</svg>
</body></html>`;
const out = path.join(__dirname, '../map_part1.html');
fs.writeFileSync(out, html);

/* 游戏内道具「迷雾古图」翻阅用的独立 SVG（矢量，弹窗缩放不糊） */
const svgStandalone = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${svg.join('\n')}</svg>`;
const svgOut = path.join(__dirname, '../assets/map_part1.svg');
fs.writeFileSync(svgOut, svgStandalone);

/* ---------- 控制台网格概览 ---------- */
const name10 = id => id.replace(/_/g, ' ').slice(0, 11).padEnd(11);
console.log('网格坐标（x 向东，y 向南）：');
for (let y = minY; y <= maxY; y++) {
  let row = '';
  for (let x = minX; x <= maxX; x++) {
    const hit = all.find(id => pos[id].x === x && pos[id].y === y);
    row += hit ? '[' + name10(hit) + ']' : ' ' + ' '.repeat(13);
  }
  console.log((y + '').padStart(3) + ' |' + row);
}
console.log('\n输出：' + out + ' / ' + svgOut + `  （画布 ${W}×${H}，地点 ${ids.length} + 边界 ${boundary.length}，边 ${edges.length}）`);
