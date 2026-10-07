/* ============================================================
 * 第四部 / 第五部 / 第六部 / 终部区域详图生成器
 * 输出：map_part4.html + map_part5.html + map_part6.html + map_final.html
 * 运行：node tools/gen_part456_map.js   （地图每次改动后重跑即可刷新）
 * 布局：与 gen_part23_map 同管线——先按 gen_world_map 算出全境 109 节点布局
 *       （区域锚点 + BFS + 抛光），取各部节点的全局坐标作种子，再对本部子图
 *       （含边界边）做一次整数抛光，最后以「小节」配色渲染（与 map_part1 同版式）。
 * ============================================================ */
'use strict';
let _seed = 20261006;
Math.random = () => (_seed = (_seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const fs = require('fs');
const path = require('path');

/* ---------- 载入 world.js ---------- */
const src = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8')
  .replace(/'use strict';/g, '') + '\n;globalThis.__WORLD = WORLD; globalThis.__TREASURES = TREASURES;';
(0, eval)(src);
const WORLD = globalThis.__WORLD;
const TREASURES = globalThis.__TREASURES;

const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1], up: [0, -1], down: [0, 1] };
const DIR_ORDER = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'up', 'down'];
const key = (x, y) => x + ',' + y;

/* ---------- 全部出口边（全境图与分部图共用） ---------- */
const allEdges = [];
for (const a of Object.keys(WORLD)) {
  for (const d of DIR_ORDER) {
    const ex = (WORLD[a].exits || {})[d];
    if (!ex || !WORLD[ex.to]) continue;
    const v = DIRV[d]; if (!v) continue;
    allEdges.push({ a, b: ex.to, v, strong: !(ex.label || '').startsWith('回'), dash: d === 'up' || d === 'down' });
  }
}

/* ---------- 第一步：全境布局（同 gen_world_map：区域锚点 + 无向 BFS + 整数抛光） ---------- */
function globalLayout() {
  const ids = Object.keys(WORLD);
  const ROOT = 'grayridge_gate';
  const ANCHORS = {
    grayridge_gate: [0, 0], road_town: [7, 1], whitestone_gate: [8, -4], tidesong_harbor: [9, 3],
    harvest_village: [16, 3], rust_field: [16, -1], abbey_gate: [13, -3], abyss_mouth: [13, -6],
  };
  const anchors = new Set(Object.keys(ANCHORS));
  const pos = { [ROOT]: { x: 0, y: 0 } };
  const taken = new Set([key(0, 0)]);
  const nearestFree = (cx0, cy0) => {
    for (let r = 1; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!taken.has(key(cx0 + dx, cy0 + dy))) return { x: cx0 + dx, y: cx0 + dy };
    }
    throw new Error('螺旋避让失败');
  };
  const und = {}; for (const id of ids) und[id] = [];
  allEdges.forEach(e => {
    und[e.a].push({ to: e.b, v: e.v });
    und[e.b].push({ to: e.a, v: [-e.v[0], -e.v[1]] });
  });
  const queue = [ROOT], seen = new Set([ROOT]);
  while (queue.length) {
    const cur = queue.shift();
    for (const { to, v } of und[cur]) {
      if (seen.has(to)) continue;
      seen.add(to);
      let p;
      if (ANCHORS[to]) { const [ax, ay] = ANCHORS[to]; p = taken.has(key(ax, ay)) ? nearestFree(ax, ay) : { x: ax, y: ay }; }
      else {
        const ix = pos[cur].x + v[0], iy = pos[cur].y + v[1];
        p = taken.has(key(ix, iy)) ? nearestFree(ix, iy) : { x: ix, y: iy };
      }
      pos[to] = p; taken.add(key(p.x, p.y)); queue.push(to);
    }
  }
  if (seen.size !== ids.length) throw new Error('BFS 未覆盖全部地点');
  const adj = {}; for (const id of ids) adj[id] = [];
  allEdges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
  const edgeCostE = (p, e) => {
    const dx = p[e.b].x - p[e.a].x, dy = p[e.b].y - p[e.a].y;
    const len = Math.hypot(dx, dy) || 1e-9, vlen = Math.hypot(e.v[0], e.v[1]) || 1e-9;
    const align = 1 - (dx * e.v[0] + dy * e.v[1]) / (len * vlen);
    const stretch = Math.max(0, len - 2.4);
    return (e.strong ? 1 : 0.12) * (2.2 * align + 0.35 * stretch * stretch);
  };
  const sepCost = (p, i, j) => {
    const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
    const d2 = dx * dx + dy * dy;
    return d2 < 0.81 ? 3 * (0.81 - d2) : 0;
  };
  const localCost = (p, id) => {
    let c = 0;
    for (const ei of adj[id]) c += edgeCostE(p, allEdges[ei]);
    for (const o of ids) if (o !== id) c += sepCost(p, id, o);
    return c;
  };
  const occupied = id => ids.some(o => o !== id && pos[o].x === pos[id].x && pos[o].y === pos[id].y);
  for (let round = 0; round < 80; round++) {
    let improved = false;
    for (const id of ids.filter(i => !anchors.has(i)).sort(() => Math.random() - 0.5)) {
      const cur = { x: pos[id].x, y: pos[id].y };
      let bestM = { x: cur.x, y: cur.y, c: localCost(pos, id) };
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        pos[id].x = cur.x + dx; pos[id].y = cur.y + dy;
        if (occupied(id)) continue;
        const c = localCost(pos, id);
        if (c < bestM.c - 1e-9) bestM = { x: cur.x + dx, y: cur.y + dy, c };
      }
      for (const o of ids) {
        if (o === id || anchors.has(o)) continue;
        if (Math.abs(pos[o].x - cur.x) > 2 || Math.abs(pos[o].y - cur.y) > 2) continue;
        const ox = pos[o].x, oy = pos[o].y;
        const oBefore = localCost(pos, o);
        pos[id].x = ox; pos[id].y = oy; pos[o].x = cur.x; pos[o].y = cur.y;
        const c = localCost(pos, id) + localCost(pos, o) - oBefore;
        pos[o].x = ox; pos[o].y = oy; pos[id].x = cur.x; pos[id].y = cur.y;
        if (c < bestM.c - 1e-9) bestM = { x: ox, y: oy, c, swapWith: o, oOld: { x: cur.x, y: cur.y } };
      }
      if (bestM.swapWith) { const o = bestM.swapWith; pos[o].x = bestM.oOld.x; pos[o].y = bestM.oOld.y; pos[id].x = bestM.x; pos[id].y = bestM.y; improved = true; }
      else if (bestM.x !== cur.x || bestM.y !== cur.y) { pos[id].x = bestM.x; pos[id].y = bestM.y; improved = true; }
      else { pos[id].x = cur.x; pos[id].y = cur.y; }
    }
    if (!improved) break;
  }
  return pos;
}
const worldPos = globalLayout();

/* ---------- 第二步：分部配置 ---------- */
const PARTS = [
  {
    ch: '第四部 · 丰收之印',
    title: '第四部 · 丰收之印 —— 金穗平原行记图',
    boundary: ['coast_road'],
    out: 'map_part4.html',
    SUB_STYLE: {
      '小节一 · 金穗平原': { fill: '#2e3216', stroke: '#b9b34a', label: '小节一 · 金穗平原' },
      '小节二 · 磨坊与守穗人': { fill: '#33301c', stroke: '#c2a05c', label: '小节二 · 磨坊与守穗人' },
      '小节三 · 丰年祭': { fill: '#3a2c12', stroke: '#e6c352', label: '小节三 · 丰年祭' },
    },
    foot: [
      '主线：海风岬 → 金穗官道（麦浪枯萎·存档点）→ 穗安村（蝗灾之源·村长与渡鸦）→ 老磨坊 · 守穗人树林 → 丰年祭坛',
      '环路：穗安村—蝗灾的田垄 / 穗安村—老磨坊—守穗人树林—丰年祭坛　　跨部：海风岬（第三部）、北 · 战痕古道（第五部）',
    ],
  },
  {
    ch: '第五部 · 战争之印',
    title: '第五部 · 战争之印 —— 战痕古战场行记图',
    boundary: ['golden_road'],
    out: 'map_part5.html',
    SUB_STYLE: {
      '小节一 · 北望古战场': { fill: '#33201d', stroke: '#c26b4a', label: '小节一 · 北望古战场' },
      '小节二 · 荒原与碑林': { fill: '#3a2622', stroke: '#d08a66', label: '小节二 · 荒原与碑林' },
      '小节三 · 战旗高台': { fill: '#402a1c', stroke: '#e0a05c', label: '小节三 · 战旗高台' },
    },
    foot: [
      '主线：金穗官道 → 战痕古道 · 界碑（存档点）→ 铁锈荒原 → 战旗高台（战争之印）',
      '环路：荒原—亡者碑林 / 荒原—折戟丘 / 荒原—影蚀辎重营　　白骨哨塔由荒原的剧情行动进入　　跨部：回金穗平原（第四部）、西 · 暮色山道（第六部）',
    ],
  },
  {
    ch: '第六部 · 暮钟之印',
    title: '第六部 · 暮钟之印 —— 暮色修道院行记图',
    boundary: ['war_road'],
    out: 'map_part6.html',
    SUB_STYLE: {
      '小节一 · 暮色山道': { fill: '#241a36', stroke: '#9b7fd0', label: '小节一 · 暮色山道' },
      '小节二 · 晚课与静室': { fill: '#2a2044', stroke: '#af94dc', label: '小节二 · 晚课与静室' },
      '小节三 · 钟楼之夜': { fill: '#31265a', stroke: '#c2a8ec', label: '小节三 · 钟楼之夜' },
    },
    foot: [
      '主线：战痕古道 → 暮色山道 → 修道院山门（存档点）→ 晚课堂 · 静室 → 钟楼之夜（暮钟之印）',
      '晚课堂由山门的剧情行动进入，钟楼顶层经下层旋梯而上　　跨部：回界碑古道（第五部）、北 · 影渊谷口（终部）',
    ],
  },
  {
    ch: '终部 · 深渊之印',
    title: '终部 · 深渊之印 —— 影渊要塞行记图',
    boundary: ['abbey_gate'],
    out: 'map_final.html',
    SUB_STYLE: {
      '终章前夜 · 影渊谷口': { fill: '#160d1e', stroke: '#6d4f96', label: '终章前夜 · 影渊谷口' },
      '终章 · 王座与黎明': { fill: '#221340', stroke: '#c8a86a', label: '终章 · 王座与黎明' },
    },
    foot: [
      '主线：暮色修道院 → 影渊谷口（最后营地·存档点）→ 独石桥 / 崖壁暗渠（两路入塞）→ 影渊要塞 · 内庭 → 王座大厅（终局）',
      '王座大厅经内庭主堡而上　　跨部：回暮色修道院（第六部）',
    ],
  },
];

/* ---------- 分部布局 + 渲染 ---------- */
for (const cfg of PARTS) {
  const ids = Object.keys(WORLD).filter(id => WORLD[id].ch === cfg.ch);
  const all = [...ids, ...cfg.boundary.filter(id => WORLD[id])];

  /* 本部边（含通往边界节点的边） */
  const edges = [];
  for (const a of ids) {
    for (const [d, ex] of Object.entries(WORLD[a].exits || {})) {
      if (!all.includes(ex.to)) continue;
      const v = DIRV[d]; if (!v) continue;
      edges.push({ a, b: ex.to, v, strong: !(ex.label || '').startsWith('回'), dash: d === 'up' || d === 'down' });
    }
  }

  /* 种子 = 全局坐标；对本部子图再抛光 */
  const pos = {};
  for (const id of all) pos[id] = { x: worldPos[id].x, y: worldPos[id].y };
  const adj = {}; for (const id of all) adj[id] = [];
  edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
  const edgeCostE = (p, e) => {
    const dx = p[e.b].x - p[e.a].x, dy = p[e.b].y - p[e.a].y;
    const len = Math.hypot(dx, dy) || 1e-9, vlen = Math.hypot(e.v[0], e.v[1]) || 1e-9;
    const align = 1 - (dx * e.v[0] + dy * e.v[1]) / (len * vlen);
    const stretch = Math.max(0, len - 2.4);
    return (e.strong ? 1 : 0.12) * (2.2 * align + 0.35 * stretch * stretch);
  };
  const sepCost = (p, i, j) => {
    const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
    const d2 = dx * dx + dy * dy;
    return d2 < 0.81 ? 3 * (0.81 - d2) : 0;
  };
  const localCost = (p, id) => {
    let c = 0;
    for (const ei of adj[id]) c += edgeCostE(p, edges[ei]);
    for (const o of all) if (o !== id) c += sepCost(p, id, o);
    return c;
  };
  const occupied = id => all.some(o => o !== id && pos[o].x === pos[id].x && pos[o].y === pos[id].y);
  for (let round = 0; round < 80; round++) {
    let improved = false;
    for (const id of all.sort(() => Math.random() - 0.5)) {
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
        if (o === id) continue;
        if (Math.abs(pos[o].x - cur.x) > 2 || Math.abs(pos[o].y - cur.y) > 2) continue;
        const ox = pos[o].x, oy = pos[o].y;
        const oBefore = localCost(pos, o);
        pos[id].x = ox; pos[id].y = oy; pos[o].x = cur.x; pos[o].y = cur.y;
        const c = localCost(pos, id) + localCost(pos, o) - oBefore;
        pos[o].x = ox; pos[o].y = oy; pos[id].x = cur.x; pos[id].y = cur.y;
        if (c < bestM.c - 1e-9) bestM = { x: ox, y: oy, c, swapWith: o, oOld: { x: cur.x, y: cur.y } };
      }
      if (bestM.swapWith) { const o = bestM.swapWith; pos[o].x = bestM.oOld.x; pos[o].y = bestM.oOld.y; pos[id].x = bestM.x; pos[id].y = bestM.y; improved = true; }
      else if (bestM.x !== cur.x || bestM.y !== cur.y) { pos[id].x = bestM.x; pos[id].y = bestM.y; improved = true; }
      else { pos[id].x = cur.x; pos[id].y = cur.y; }
    }
    if (!improved) break;
  }
  const cost = edges.reduce((s, e) => s + edgeCostE(pos, e), 0);
  console.log(`\n[${cfg.ch}] 节点 ${ids.length} + 边界 ${all.length - ids.length}，边 ${edges.length}，方向保真代价 ${cost.toFixed(2)}`);

  const cells = new Set(all.map(id => key(pos[id].x, pos[id].y)));
  if (cells.size !== all.length) throw new Error(cfg.ch + ' 布局重叠未消解干净');

  /* ---------- 渲染（与 map_part1 同版式） ---------- */
  const BOUNDARY_STYLE = { fill: '#23242e', stroke: '#6b6d7c', label: '邻接章节' };
  const CW = 176, CH = 108, PAD = 30;
  const xs = all.map(id => pos[id].x), ys = all.map(id => pos[id].y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  /* 最小画布宽 1150：保证标题与图例长行不被裁切；窄分部图形水平居中 */
  const W = Math.max((maxX - minX + 1) * CW + PAD * 2, 1150), H = (maxY - minY + 1) * CH + PAD * 2 + 185;
  const OFF = (W - ((maxX - minX + 1) * CW + PAD * 2)) / 2;
  const cx = id => OFF + PAD + (pos[id].x - minX) * CW + CW / 2;
  const cy = id => PAD + 70 + (pos[id].y - minY) * CH + CH / 2;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
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

  const svg = [];
  svg.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0b0c14"/>`);
  svg.push(`<text x="${W / 2}" y="40" text-anchor="middle" fill="#e8d9a0" font-size="26" letter-spacing="6">${esc(cfg.title)}</text>`);
  svg.push(`<text x="${W / 2}" y="64" text-anchor="middle" fill="#8a8ca0" font-size="13">共 ${ids.length} 处地点 · 布局由游戏出口数据推导（全境布局取种 + 分部方向保真抛光）· node tools/gen_part456_map.js 重新生成</text>`);

  for (const e of edges) {
    const x1 = cx(e.a), y1 = cy(e.a), x2 = cx(e.b), y2 = cy(e.b);
    if (e.dash) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#566" stroke-width="2" stroke-dasharray="5 4"/>`);
    else if (e.strong) svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3c3e52" stroke-width="2"/>`);
    else svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2e3044" stroke-width="1.4" stroke-dasharray="2 4"/>`);
  }
  for (const id of all) {
    const l = WORLD[id];
    const inPart = ids.includes(id);
    const st = inPart ? (cfg.SUB_STYLE[l.sub] || Object.values(cfg.SUB_STYLE)[0]) : BOUNDARY_STYLE;
    const x = cx(id), y = cy(id);
    const bw = 152, bh = l.name.includes(' · ') ? 62 : 48;
    /* 强调翻转：加粗行 = 区分本名（如「铁锈荒原」），小字 = 地区前缀（如「战痕古道」） */
    const [pre, base] = l.name.split(' · ');
    const nm = base || pre, sub2 = base ? pre : null;
    svg.push(`<rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${inPart ? 1.6 : 1.2}" ${inPart ? '' : 'stroke-dasharray="4 3"'}/>`);
    svg.push(`<text x="${x}" y="${y - (sub2 ? 4 : -5)}" text-anchor="middle" fill="${inPart ? '#f0e6c8' : '#9a9cae'}" font-size="14" font-weight="bold">${esc(nm)}</text>`);
    if (sub2) svg.push(`<text x="${x}" y="${y + 13}" text-anchor="middle" fill="${inPart ? '#b8ac86' : '#77798a'}" font-size="11">${esc(sub2)}</text>`);
    const bd = badges(id);
    if (bd) svg.push(`<text x="${x + bw / 2 - 8}" y="${y - bh / 2 + 14}" text-anchor="end" font-size="11" fill="#c9b06a">${bd}</text>`);
    if (!inPart) svg.push(`<text x="${x}" y="${y + bh / 2 + 13}" text-anchor="middle" fill="#6b6d7c" font-size="11">${(l.ch || '').replace(' · ', '')}</text>`);
  }

  const legY = H - 114;
  svg.push(`<rect x="${PAD}" y="${legY - 18}" width="${W - PAD * 2}" height="102" rx="8" fill="#101120" stroke="#2b2c40"/>`);
  let lx = PAD + 20;
  svg.push(`<text x="${lx}" y="${legY + 6}" fill="#8a8ca0" font-size="12">小节：</text>`);
  lx += 44;
  for (const st of Object.values(cfg.SUB_STYLE)) {
    svg.push(`<rect x="${lx}" y="${legY - 6}" width="14" height="14" rx="3" fill="${st.fill}" stroke="${st.stroke}"/>`);
    svg.push(`<text x="${lx + 20}" y="${legY + 6}" fill="#c8c9d8" font-size="12">${st.label.replace('小节', '').replace('终章', '')}</text>`);
    lx += 20 + st.label.replace('小节', '').replace('终章', '').length * 12 + 34;
  }
  svg.push(`<text x="${PAD + 20}" y="${legY + 30}" fill="#8a8ca0" font-size="12">徽标：⚠ 野外遭遇　🏕 可休息　💾 存档点　👤 有 NPC　❖ 藏宝图埋宝处　　虚线边 = 上/下楼　点线边 = 「回」折返捷径　虚线框 = 邻接章节入口</text>`);
  cfg.foot.forEach((f, i) => svg.push(`<text x="${PAD + 20}" y="${legY + 52 + i * 20}" fill="#66687e" font-size="11">${esc(f)}</text>`));

  const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.title)}</title>
<style>
  body{margin:0;background:#0b0c14;font-family:"Microsoft YaHei","PingFang SC",sans-serif;display:flex;flex-direction:column;align-items:center;padding:18px;}
  svg{max-width:100%;height:auto;}
</style></head><body>
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${svg.join('\n')}</svg>
</body></html>`;
  /* 输出文件名来自本文件内的固定配置：取 basename 消毒，杜绝任何路径拼接 */
  const out = path.join(__dirname, '..', path.basename(cfg.out));
  fs.writeFileSync(out, html);
  console.log(`输出：${out}  （画布 ${W}×${H}）`);
}
console.log('\n完成：map_part4.html / map_part5.html / map_part6.html / map_final.html（PNG 请用 headless Edge 截图刷新）');
