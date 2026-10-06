/* ============================================================
 * 全境地图生成器：从 world.js 的出口数据推导空间布局，输出 SVG 总览图
 * 运行：node tools/gen_world_map.js   （地图每次改动后重跑即可刷新）
 * 布局：BFS 自动播种（罗盘方向优先，冲突螺旋避让）→ 整数域贪心抛光
 *       （±2 移动 + 交换，最小化方向违背；代价函数与第一部生成器同源）
 * 输出：map_world.html（自包含 SVG 总览）+ 控制台网格概览
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

const all = Object.keys(WORLD);
const ROOT = 'grayridge_gate';

/* ---------- 边：dir → 单位向量（y 向南为正）；「回×」开头的折返路视为弱约束 ---------- */
const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1], up: [0, -1], down: [0, 1] };
const DIR_ORDER = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'up', 'down'];
const edges = [];
for (const a of all) {
  for (const d of DIR_ORDER) {
    const ex = (WORLD[a].exits || {})[d];
    if (!ex || !WORLD[ex.to]) continue;
    const v = DIRV[d]; if (!v) continue;
    edges.push({ a, b: ex.to, v, strong: !(ex.label || '').startsWith('回'), dash: d === 'up' || d === 'down', vert: d === 'up' || d === 'down' });
  }
}

/* ---------- 区域锚点：各章节枢纽固定在「风车状」区位，其余 BFS 填充 ----------
 * 主线地理：灰岭(0,0) → 第一部向南 → 第二部山道在东/城在东北 → 第三部海岸在城之南
 * → 第四部平原在东 → 第五部古战场在平原之北 → 第六部修道院在战场之西 → 终部影渊在修道院之北 */
const ANCHORS = {
  grayridge_gate: [0, 0],
  road_town: [7, 1],        // 第二部 · 官道驿镇（山道区枢纽）
  whitestone_gate: [8, -4], // 第二部 · 白石城门（城区枢纽）
  tidesong_harbor: [9, 3],  // 第三部 · 潮歌湾渔港（海岸区枢纽）
  harvest_village: [16, 3], // 第四部 · 穗安村（平原区枢纽）
  rust_field: [16, -1],     // 第五部 · 铁锈荒原（战场区枢纽）
  abbey_gate: [13, -3],     // 第六部 · 修道院山门
  abyss_mouth: [13, -6],    // 终部 · 影渊谷口
};
const anchors = new Set(Object.keys(ANCHORS));
const pos = {};
pos[ROOT] = { x: 0, y: 0 };
const taken = new Set([`${pos[ROOT].x},${pos[ROOT].y}`]);
const key = (x, y) => x + ',' + y;
function nearestFree(cx0, cy0) {
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // 只看当前环
      if (!taken.has(key(cx0 + dx, cy0 + dy))) return { x: cx0 + dx, y: cy0 + dy };
    }
  }
  throw new Error('螺旋避让失败：8 环内无空格');
}
{
  const und = {}; for (const id of all) und[id] = [];
  edges.forEach((e, i) => {
    und[e.a].push({ to: e.b, v: e.v });
    und[e.b].push({ to: e.a, v: [-e.v[0], -e.v[1]] });
  });
  const queue = [ROOT];
  const seen = new Set([ROOT]);
  while (queue.length) {
    const cur = queue.shift();
    for (const { to, v } of und[cur]) {
      if (seen.has(to)) continue;
      seen.add(to);
      let p;
      if (ANCHORS[to]) {
        const [ax, ay] = ANCHORS[to];
        p = taken.has(key(ax, ay)) ? nearestFree(ax, ay) : { x: ax, y: ay };
      } else {
        const ix = pos[cur].x + v[0], iy = pos[cur].y + v[1];
        p = taken.has(key(ix, iy)) ? nearestFree(ix, iy) : { x: ix, y: iy };
      }
      pos[to] = p;
      taken.add(key(p.x, p.y));
      queue.push(to);
    }
  }
  if (seen.size !== all.length) throw new Error('BFS 未覆盖全部地点：' + all.filter(id => !seen.has(id)).join(', '));
}

/* ---------- 代价：方向保真度（边越长越要求方向精准，过长的边另罚） ---------- */
const adj = {}; for (const id of all) adj[id] = [];
edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
function edgePairCost(p, e) {
  const dx = p[e.b].x - p[e.a].x, dy = p[e.b].y - p[e.a].y;
  const len = Math.hypot(dx, dy) || 1e-9;
  const vlen = Math.hypot(e.v[0], e.v[1]) || 1e-9;
  const cos = (dx * e.v[0] + dy * e.v[1]) / (len * vlen);
  const align = 1 - cos;
  const stretch = Math.max(0, len - 2.4);
  const w = e.strong ? 1 : 0.12;
  return w * (2.2 * align + 0.35 * stretch * stretch);
}
function pairSepCost(p, i, j) {
  const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
  const d2 = dx * dx + dy * dy;
  return d2 < 0.81 ? 3 * (0.81 - d2) : 0;
}
function localCost(p, id) {
  let c = 0;
  for (const ei of adj[id]) c += edgePairCost(p, edges[ei]);
  for (const o of all) if (o !== id) c += pairSepCost(p, id, o);
  return c;
}
function totalCost(p) {
  let c = 0;
  for (const e of edges) c += edgePairCost(p, e);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) c += pairSepCost(p, all[i], all[j]);
  return c;
}

/* ---------- 整数域贪心抛光：±2 移动 + 邻域交换（增量评估） ---------- */
const seedCost = totalCost(pos);
console.log('BFS 种子代价：' + seedCost.toFixed(2));
{
  const occupied = id => all.some(o => o !== id && pos[o].x === pos[id].x && pos[o].y === pos[id].y);
  for (let round = 0; round < 80; round++) {
    let improved = false;
    for (const id of all.filter(i => !anchors.has(i)).sort(() => Math.random() - 0.5)) {
      const cur = { x: pos[id].x, y: pos[id].y };
      let bestM = { x: cur.x, y: cur.y, c: localCost(pos, id) };
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        pos[id].x = cur.x + dx; pos[id].y = cur.y + dy;
        if (occupied(id)) continue;
        const c = localCost(pos, id);
        if (c < bestM.c - 1e-9) bestM = { x: cur.x + dx, y: cur.y + dy, c };
      }
      for (const o of all) {
        if (o === id || anchors.has(o)) continue;
        if (Math.abs(pos[o].x - cur.x) > 2 || Math.abs(pos[o].y - cur.y) > 2) continue;
        const ox = pos[o].x, oy = pos[o].y;
        const oBefore = localCost(pos, o);
        pos[id].x = ox; pos[id].y = oy; pos[o].x = cur.x; pos[o].y = cur.y;
        const c = localCost(pos, id) + localCost(pos, o) - oBefore;
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
}
const finalCost = totalCost(pos);
console.log(`方向保真代价：${finalCost.toFixed(2)}（BFS 种子 + 整数抛光）`);
const worst = edges.filter(e => e.strong)
  .map(e => ({ e, c: edgePairCost(pos, e) }))
  .sort((a, b) => b.c - a.c).slice(0, 8);
for (const w of worst) console.log(`  偏差边：${w.e.a} → ${w.e.b}（${w.c.toFixed(2)}）`);

/* ---------- 校验：无重叠 ---------- */
const cells = new Set(all.map(id => key(pos[id].x, pos[id].y)));
if (cells.size !== all.length) throw new Error('布局重叠未消解干净');

/* ---------- 章节配色与徽标 ---------- */
const CH_STYLE = {
  '序章 · 风雨之夜': { fill: '#23242e', stroke: '#9a9cae', label: '序章' },
  '第一部 · 晨曦之印': { fill: '#3a2f1e', stroke: '#c98227', label: '第一部·晨曦' },
  '第二部 · 星辰之印': { fill: '#1e2440', stroke: '#7f92d8', label: '第二部·星辰' },
  '第三部 · 海洋之印': { fill: '#14283a', stroke: '#4fa3c7', label: '第三部·海洋' },
  '第四部 · 丰收之印': { fill: '#2e3216', stroke: '#b9b34a', label: '第四部·丰收' },
  '第五部 · 战争之印': { fill: '#33201d', stroke: '#c26b4a', label: '第五部·战争' },
  '第六部 · 暮钟之印': { fill: '#241a36', stroke: '#9b7fd0', label: '第六部·暮钟' },
  '终部 · 深渊之印': { fill: '#160d1e', stroke: '#6d4f96', label: '终部·深渊' },
};

const CW = 172, CH = 106, PAD = 30;
const xs = all.map(id => pos[id].x), ys = all.map(id => pos[id].y);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const W = (maxX - minX + 1) * CW + PAD * 2, H = (maxY - minY + 1) * CH + PAD * 2 + 210;
const cx = id => PAD + (pos[id].x - minX) * CW + CW / 2;
const cy = id => PAD + 76 + (pos[id].y - minY) * CH + CH / 2;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* 节点徽标：⚠野外 🏕休息 💾存档 👤NPC ❖藏宝图埋宝处 */
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
svg.push(`<text x="${W / 2}" y="40" text-anchor="middle" fill="#e8d9a0" font-size="28" letter-spacing="6">符文王座 · 暗影觉醒 —— 艾尔多兰全境行记图</text>`);
const chStat = {};
for (const id of all) { const ch = WORLD[id].ch; chStat[ch] = (chStat[ch] || 0) + 1; }
const statText = Object.entries(CH_STYLE).map(([ch, st]) => `${st.label} ${chStat[ch] || 0}`).join('　');
svg.push(`<text x="${W / 2}" y="66" text-anchor="middle" fill="#8a8ca0" font-size="13">共 ${all.length} 处地点 · ${statText} · 布局由游戏出口数据推导 · node tools/gen_world_map.js 重新生成</text>`);

for (const e of edges) {
  const x1 = cx(e.a), y1 = cy(e.a), x2 = cx(e.b), y2 = cy(e.b);
  if (e.dash) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#566" stroke-width="2" stroke-dasharray="5 4"/>`);
  else if (e.strong) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3c3e52" stroke-width="2"/>`);
  else svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2e3044" stroke-width="1.4" stroke-dasharray="2 4"/>`);
}
for (const id of all) {
  const l = WORLD[id];
  const st = CH_STYLE[l.ch] || CH_STYLE['序章 · 风雨之夜'];
  const x = cx(id), y = cy(id);
  const bw = 148, bh = l.name.includes(' · ') ? 62 : 46;
  const [nm, sub2] = l.name.split(' · ');
  svg.push(`<rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.5"/>`);
  svg.push(`<text x="${x}" y="${y - (sub2 ? 4 : -5)}" text-anchor="middle" fill="#f0e6c8" font-size="13.5" font-weight="bold">${esc(nm)}</text>`);
  if (sub2) svg.push(`<text x="${x}" y="${y + 13}" text-anchor="middle" fill="#b8ac86" font-size="10.5">${esc(sub2)}</text>`);
  const bd = badges(id);
  if (bd) svg.push(`<text x="${x + bw / 2 - 7}" y="${y - bh / 2 + 14}" text-anchor="end" font-size="10.5" fill="#c9b06a">${bd}</text>`);
}

/* 图例 */
const legY = H - 146;
svg.push(`<rect x="${PAD}" y="${legY - 22}" width="${W - PAD * 2}" height="130" rx="8" fill="#101120" stroke="#2b2c40"/>`);
let lx = PAD + 20, ly = legY;
svg.push(`<text x="${lx}" y="${ly + 6}" fill="#8a8ca0" font-size="12">章节：</text>`);
lx += 44;
for (const st of Object.values(CH_STYLE)) {
  svg.push(`<rect x="${lx}" y="${ly - 6}" width="14" height="14" rx="3" fill="${st.fill}" stroke="${st.stroke}"/>`);
  svg.push(`<text x="${lx + 20}" y="${ly + 6}" fill="#c8c9d8" font-size="12">${st.label}</text>`);
  lx += 20 + st.label.length * 12 + 30;
}
svg.push(`<text x="${PAD + 20}" y="${ly + 30}" fill="#8a8ca0" font-size="12">徽标：⚠ 野外遭遇　🏕 可休息　💾 存档点　👤 有 NPC　❖ 藏宝图埋宝处　　实线边 = 罗盘通路　虚线边 = 上/下楼　点线边 = 「回」折返捷径</text>`);
svg.push(`<text x="${PAD + 20}" y="${ly + 54}" fill="#66687e" font-size="11.5">主线足迹：灰岭镇口（序章）→ 南下古道·迷雾森林·符文圣殿（第一部）→ 霜脊山道·白石城（第二部）→ 南下潮歌湾·海底神殿（第三部）→ 金穗平原（第四部）</text>`);
svg.push(`<text x="${PAD + 20}" y="${ly + 76}" fill="#66687e" font-size="11.5">→ 战痕古战场（第五部）→ 暮色修道院（第六部）→ 影渊要塞·王座大厅（终部）　　跨部捷径：灰岭镇口 ↔ 风口山神祠（山口小径）</text>`);

/* ---------- 输出自包含 HTML ---------- */
const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>符文王座 · 全境行记图</title>
<style>
  body{margin:0;background:#0b0c14;font-family:"Microsoft YaHei","PingFang SC",sans-serif;display:flex;flex-direction:column;align-items:center;padding:18px;}
  svg{max-width:100%;height:auto;}
</style></head><body>
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${svg.join('\n')}</svg>
</body></html>`;
const out = path.join(__dirname, '../map_world.html');
fs.writeFileSync(out, html);

/* ---------- 控制台网格概览（缩写） ---------- */
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
console.log('\n输出：' + out + `  （画布 ${W}×${H}，地点 ${all.length}，边 ${edges.length}）`);
