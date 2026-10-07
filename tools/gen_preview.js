/* ============================================================
 * 游戏流程总览 & 全境地图预览页生成器
 * 运行：node tools/gen_preview.js
 * 布局：与 gen_world_map.js 同源（同种子同锚点 → 与 map_world 一致）
 * 输出：game_flow_map.html（自包含：主线流程卡 + 可缩放全境地图 + 章节高亮）
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

const all = Object.keys(WORLD);
const ROOT = 'grayridge_gate';

/* ---------- 边（与 gen_world_map.js 一致） ---------- */
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

/* ---------- 布局：锚点 + BFS + 整数贪心抛光（照抄 gen_world_map.js，保证布局一致） ---------- */
const ANCHORS = {
  grayridge_gate: [0, 0],
  road_town: [7, 1],
  whitestone_gate: [8, -4],
  tidesong_harbor: [9, 3],
  harvest_village: [16, 3],
  rust_field: [16, -1],
  abbey_gate: [13, -3],
  abyss_mouth: [13, -6],
};
const anchors = new Set(Object.keys(ANCHORS));
const pos = {};
pos[ROOT] = { x: 0, y: 0 };
const taken = new Set([`${pos[ROOT].x},${pos[ROOT].y}`]);
const key = (x, y) => x + ',' + y;
function nearestFree(cx0, cy0) {
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!taken.has(key(cx0 + dx, cy0 + dy))) return { x: cx0 + dx, y: cy0 + dy };
    }
  }
  throw new Error('螺旋避让失败');
}
{
  const und = {}; for (const id of all) und[id] = [];
  edges.forEach(e => {
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
  if (seen.size !== all.length) throw new Error('BFS 未覆盖全部地点');
}
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

/* ---------- 章节样式 ---------- */
const CH_ORDER = ['序章 · 风雨之夜', '第一部 · 晨曦之印', '第二部 · 星辰之印', '第三部 · 海洋之印', '第四部 · 丰收之印', '第五部 · 战争之印', '第六部 · 暮钟之印', '终部 · 深渊之印'];
const CH_STYLE = {
  '序章 · 风雨之夜': { fill: '#23242e', stroke: '#9a9cae', label: '序章', accent: '#b9bccf' },
  '第一部 · 晨曦之印': { fill: '#3a2f1e', stroke: '#c98227', label: '第一部 · 晨曦之印', accent: '#c98227' },
  '第二部 · 星辰之印': { fill: '#1e2440', stroke: '#7f92d8', label: '第二部 · 星辰之印', accent: '#7f92d8' },
  '第三部 · 海洋之印': { fill: '#14283a', stroke: '#4fa3c7', label: '第三部 · 海洋之印', accent: '#4fa3c7' },
  '第四部 · 丰收之印': { fill: '#2e3216', stroke: '#b9b34a', label: '第四部 · 丰收之印', accent: '#b9b34a' },
  '第五部 · 战争之印': { fill: '#33201d', stroke: '#c26b4a', label: '第五部 · 战争之印', accent: '#c26b4a' },
  '第六部 · 暮钟之印': { fill: '#241a36', stroke: '#9b7fd0', label: '第六部 · 暮钟之印', accent: '#9b7fd0' },
  '终部 · 深渊之印': { fill: '#160d1e', stroke: '#6d4f96', label: '终部 · 深渊之印', accent: '#a678e0' },
};

/* ---------- 主线流程（编辑内容，依据 README 与 world.js 关键事件整理） ---------- */
const FLOW = [
  {
    ch: '序章 · 风雨之夜', region: '灰岭镇',
    goal: '风雨之夜投宿黑鸦旅店；地窖惊变后替死者启程。',
    beats: [
      ['暮雨投宿', '灰岭镇口投宿黑鸦旅店；集市备货，古井与地窖藏着第一桩怪事。'],
      ['子夜惊变', '影蚀刺客夜袭——客商塞德里克临终托付「晨曦之痕」碎片与迷雾古图；击杀刺客（首场 BOSS 战），天亮解锁南下古道与山口小径。'],
    ],
    boss: '影蚀刺客（旅店地窖）', gain: '晨曦之痕碎片 · 迷雾古图', locs: 0,
  },
  {
    ch: '第一部 · 晨曦之印', region: '南下古道 → 迷雾森林 → 符文圣殿',
    goal: '南寻三百年前熄灭的晨曦符文，重燃第一印。',
    beats: [
      ['南下古道', '荒废烽燧、白花泉、石桥渡、荒石料场——狼群与雾中魅影把守官道。'],
      ['迷雾森林', '雾林救援商队获先手（哥布林掠袭者）；黄昏营地 ✦艾莉娅入队（传授照明术「星火引灯」）。'],
      ['符文圣殿', '石兽灯庭（被蚀的石兽）、智慧回廊、勇气之影——三过其二方可承符文。'],
      ['晨曦重燃', '晨曦祭坛重燃符文 ✦索恩入队；【第一部 · 完】。'],
    ],
    boss: '被蚀的石兽 · 勇气之影（圣殿试炼）', gain: '晨曦之痕（符文重燃，斗气上限+4）', locs: 0,
  },
  {
    ch: '第二部 · 星辰之印', region: '霜脊山道 → 官道驿镇 → 白石城',
    goal: '北上白石城，抢在影蚀之前保住王室秘藏的星辰之印。',
    beats: [
      ['霜脊山道', '灰岭镇东的山口小径直通风口山神祠——两部地图自此连成一张网。'],
      ['官道北行', '官道驿镇的委托板与传闻；空营矿村的矿灯之谜（何十斤的家书要送回灰岭）。'],
      ['白石城中', '宵禁下的白石城：城西老井、官仓、慈幼堂——三条证据链当庭揭发内应。'],
      ['星塔之夜', '月晦之夜影蚀领主亲取星辰之印——赶到星塔观星台决战。【第二部 · 完】。'],
    ],
    boss: '影蚀领主 · 噬星者（星塔观星台）', gain: '星辰之印 · 技能解锁线开启', locs: 0,
  },
  {
    ch: '第三部 · 海洋之印', region: '潮歌湾',
    goal: '南下潮歌湾，等一场大退潮，走进海底神殿。',
    beats: [
      ['南下潮歌湾', '渔港、盐灶滩、老船坞——船坞货单上「鸦羽车」的老主顾埋着渡鸦暗线。'],
      ['灯塔与礁滩', '潮歌灯塔 ✦卡雅入队；望潮崖、沉船湾、鲸骨滩各有潮路线索（卡雅家传半图暗线）。'],
      ['大退潮之夜', '大退潮海路自现 → 海底神殿咏泉回廊，潮祭司镇守第三印。【第三部 · 完】。'],
    ],
    boss: '影蚀潮祭司 · 溟汐（海底神殿）', gain: '海洋之印 · 技能【潮汐之刃】', locs: 0,
  },
  {
    ch: '第四部 · 丰收之印', region: '金穗平原',
    goal: '东行金穗平原，解蝗灾与腐穗背后的第四印之谋。',
    beats: [
      ['金穗平原', '穗安村安顿，田垄间蝗群与稻草人怀里揣着麦穗的怪谈。'],
      ['磨坊与守穗人', '老磨坊的磨盘刻痕指向丰年祭坛农谚；泥沼腐行者盘踞水路。'],
      ['丰年祭', '丰年祭坛决战腐穗巨灵，金穗重熟。【第四部 · 完】。'],
    ],
    boss: '腐穗巨灵 · 饕穰（丰年祭坛）', gain: '丰收之印 · 技能【穗浪千重】（全体）', locs: 0,
  },
  {
    ch: '第五部 · 战争之印', region: '战痕古战场',
    goal: '北行战痕古战场，从亡者地界夺回战旗之下的第五印。',
    beats: [
      ['北望古战场', '铁锈荒原、界碑驿棚——荒原的亡者不得安眠。'],
      ['荒原与碑林', '碑林石龛、折戟丘、哨塔——溃兵营地的调令与白石城的情报指向同一只手。'],
      ['战旗高台', '战旗台上影蚀战将拄断矛而起，一战定旗。【第五部 · 完】。'],
    ],
    boss: '影蚀战将 · 断矛（战旗台）', gain: '战争之印 · 技能【战号之锋】', locs: 0,
  },
  {
    ch: '第六部 · 暮钟之印', region: '暮色修道院',
    goal: '西行暮色修道院，登上为长夜计时的钟楼。',
    beats: [
      ['暮色山道', '山门、墓园、荒烽哨——风里有不属于钟的钟声。'],
      ['晚课与静室', '修道院静室歇脚；僧舍的守殿人暗记（需光亮）指向「与人换了价的祸」。'],
      ['钟楼之夜', '钟楼顶层圣咏者夜祷，哑钟重新鸣响。【第六部 · 完】。'],
    ],
    boss: '影蚀圣咏者 · 夜祷（钟楼顶层）', gain: '暮钟之印 · 技能【暮钟长鸣】（全体）', locs: 0,
  },
  {
    ch: '终部 · 深渊之印', region: '影渊要塞',
    goal: '最后一印不在途中，在底下——走进黑曜石要塞。',
    beats: [
      ['影渊谷口', '谷口旧货栈整备；独石桥影渊桥头守将拦路。'],
      ['王座与黎明', '无光前厅 → 内庭 → 王座大厅，决战暗影君主莫格拉斯。'],
      ['终局裁定', '三条暗线在此收束（渡鸦真身 / 女王莉安娜 / 卡雅潮路图）；侵蚀值与关键抉择决定 8 种章节收尾 + 5 种终局。'],
    ],
    boss: '影渊桥头守将 → 暗影君主 · 莫格拉斯（王座大厅）', gain: '深渊之印 · 结局收集', locs: 0,
  },
];
for (const f of FLOW) f.locs = all.filter(id => WORLD[id].ch === f.ch).length;

/* ---------- 徽标 ---------- */
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

/* ---------- 几何 ---------- */
const CW = 172, CH = 106, PAD = 30;
const xs = all.map(id => pos[id].x), ys = all.map(id => pos[id].y);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const W = (maxX - minX + 1) * CW + PAD * 2, H = (maxY - minY + 1) * CH + PAD * 2 + 40;
const cx = id => PAD + (pos[id].x - minX) * CW + CW / 2;
const cy = id => PAD + 30 + (pos[id].y - minY) * CH + CH / 2;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ---------- SVG 拼装（节点/边带 data-ch，供前端高亮） ---------- */
const chIdx = {}; CH_ORDER.forEach((c, i) => chIdx[c] = i);
let svg = [];
svg.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0b0c14"/>`);
for (const e of edges) {
  const x1 = cx(e.a), y1 = cy(e.a), x2 = cx(e.b), y2 = cy(e.b);
  const same = WORLD[e.a].ch === WORLD[e.b].ch ? chIdx[WORLD[e.a].ch] : -1;
  const cls = e.dash ? 'ed-dash' : (e.strong ? 'ed-strong' : 'ed-weak');
  svg.push(`<line class="edge ${cls}" data-ch="${same}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
}
for (const id of all) {
  const l = WORLD[id];
  const ci = chIdx[l.ch] ?? 0;
  const x = cx(id), y = cy(id);
  const bh = l.name.includes(' · ') ? 62 : 46, bw = 148;
  const [nm, sub2] = l.name.split(' · ');
  const bd = badges(id);
  svg.push(`<g class="node" data-ch="${ci}" data-name="${esc(l.name)}" data-sub="${esc(l.sub || '')}" data-badges="${esc(bd)}" transform="translate(${x},${y})">`);
  svg.push(`<rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="8" class="nbox"/>`);
  svg.push(`<text y="${-(sub2 ? 4 : -5)}" text-anchor="middle" class="nname">${esc(nm)}</text>`);
  if (sub2) svg.push(`<text y="13" text-anchor="middle" class="nsub">${esc(sub2)}</text>`);
  if (bd) svg.push(`<text x="${bw / 2 - 7}" y="${-bh / 2 + 14}" text-anchor="end" class="nbadge">${bd}</text>`);
  svg.push(`</g>`);
}

/* ---------- 汇总统计 ---------- */
const chStat = {};
for (const id of all) { const ch = WORLD[id].ch; chStat[ch] = (chStat[ch] || 0) + 1; }

/* ---------- 生成页面 ---------- */
const flowCards = FLOW.map((f, i) => {
  const st = CH_STYLE[f.ch];
  const beats = f.beats.map(b => `<div class="beat"><span class="bsub">${esc(b[0])}</span><span class="btxt">${esc(b[1])}</span></div>`).join('');
  return `<div class="fcard" data-ch="${i}" style="--ac:${st.accent};--fl:${st.fill}">
    <div class="fchead"><span class="fnum">${i === 0 ? '序' : (i === 7 ? '终' : '第' + '一二三四五六'[i - 1] + '部')}</span>
      <span class="ftitle">${esc(f.ch.split(' · ')[1] || st.label)}</span><span class="flocs">${f.locs} 地点</span></div>
    <div class="fregion">${esc(f.region)}</div>
    <div class="fgoal">${esc(f.goal)}</div>
    ${beats}
    <div class="fmeta"><span class="mk">BOSS</span>${esc(f.boss)}</div>
    <div class="fmeta"><span class="mk">收获</span>${esc(f.gain)}</div>
  </div>`;
}).join('\n');

const legendChips = CH_ORDER.map((c, i) => {
  const st = CH_STYLE[c];
  return `<button class="chip" data-ch="${i}" style="--ac:${st.accent};--fl:${st.fill}"><i></i>${esc(st.label.split(' · ')[0])} <b>${chStat[c] || 0}</b></button>`;
}).join('');

const pageCss = `
:root{--bg:#0b0c14;--panel:#101120;--line:#2b2c40;--ink:#f0e6c8;--dim:#8a8ca0;--gold:#e8d9a0;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Microsoft YaHei","PingFang SC",sans-serif;}
.wrap{max-width:1560px;margin:0 auto;padding:20px 18px 40px;}
header{text-align:center;padding:14px 0 6px;}
h1{margin:0;font-size:26px;letter-spacing:5px;color:var(--gold);font-weight:700;}
.sub{margin-top:8px;color:var(--dim);font-size:13px;}
.sub b{color:#c8c9d8;}
/* 流程卡 */
.flow{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin:18px 0 8px;}
@media(max-width:1280px){.flow{grid-template-columns:repeat(4,1fr);}}
@media(max-width:760px){.flow{grid-template-columns:repeat(2,1fr);}}
.fcard{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--ac);border-radius:10px;padding:12px 12px 10px;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .15s;position:relative;}
.fcard:hover{transform:translateY(-3px);box-shadow:0 6px 22px rgba(0,0,0,.5);}
.fcard.active{box-shadow:0 0 0 2px var(--ac),0 8px 26px rgba(0,0,0,.55);background:linear-gradient(180deg,var(--fl),var(--panel) 70%);}
.flow.muted .fcard:not(.active){opacity:.38;}
.fchead{display:flex;align-items:baseline;gap:7px;}
.fnum{font-size:11px;color:var(--ac);border:1px solid var(--ac);border-radius:4px;padding:0 5px;white-space:nowrap;}
.ftitle{font-size:14.5px;font-weight:700;color:var(--ink);flex:1;}
.flocs{font-size:11px;color:var(--dim);white-space:nowrap;}
.fregion{margin-top:6px;font-size:12px;color:var(--ac);opacity:.95;}
.fgoal{margin-top:5px;font-size:12px;color:#c8c9d8;line-height:1.55;}
.beat{margin-top:7px;font-size:12px;line-height:1.5;color:#a7a9bd;display:flex;gap:6px;}
.beat .bsub{color:var(--ac);white-space:nowrap;font-weight:700;flex-shrink:0;}
.fmeta{margin-top:7px;font-size:11.5px;color:#b8ac86;line-height:1.5;display:flex;gap:6px;align-items:baseline;}
.fmeta .mk{flex-shrink:0;color:#77798e;border:1px solid #3a3b52;border-radius:3px;padding:0 4px;font-size:10px;}
/* 章节筛选 */
.chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 6px;}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line);color:#c8c9d8;font-size:12.5px;padding:5px 11px;border-radius:999px;cursor:pointer;font-family:inherit;}
.chip i{width:11px;height:11px;border-radius:3px;background:var(--fl);border:1.5px solid var(--ac);}
.chip b{color:var(--dim);font-weight:400;font-size:11px;}
.chip.active{border-color:var(--ac);color:var(--ink);box-shadow:0 0 0 1px var(--ac);}
.chip.allbtn.active{box-shadow:0 0 0 1px var(--gold);border-color:var(--gold);}
/* 地图 */
.mapbox{position:relative;margin-top:8px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0b0c14;}
.mapbox svg{display:block;width:100%;height:auto;cursor:grab;touch-action:none;}
.mapbox svg.grabbing{cursor:grabbing;}
.edge{stroke:#3c3e52;stroke-width:2;}
.ed-dash{stroke:#566;stroke-dasharray:5 4;}
.ed-weak{stroke:#2e3044;stroke-width:1.4;stroke-dasharray:2 4;}
.node{cursor:pointer;}
.nbox{fill:#1a1b26;stroke:#55586e;stroke-width:1.5;}
.node[data-ch="0"] .nbox{fill:#23242e;stroke:#9a9cae;}
.node[data-ch="1"] .nbox{fill:#3a2f1e;stroke:#c98227;}
.node[data-ch="2"] .nbox{fill:#1e2440;stroke:#7f92d8;}
.node[data-ch="3"] .nbox{fill:#14283a;stroke:#4fa3c7;}
.node[data-ch="4"] .nbox{fill:#2e3216;stroke:#b9b34a;}
.node[data-ch="5"] .nbox{fill:#33201d;stroke:#c26b4a;}
.node[data-ch="6"] .nbox{fill:#241a36;stroke:#9b7fd0;}
.node[data-ch="7"] .nbox{fill:#160d1e;stroke:#6d4f96;}
.nname{fill:#f0e6c8;font-size:13.5px;font-weight:bold;}
.nsub{fill:#b8ac86;font-size:10.5px;}
.nbadge{fill:#c9b06a;font-size:10.5px;}
svg.filtered .node{opacity:.1;transition:opacity .2s;}
svg.filtered .node.on{opacity:1;}
svg.filtered .node.on .nbox{stroke-width:2.4;filter:drop-shadow(0 0 5px rgba(255,255,255,.25));}
svg.filtered .edge{opacity:.05;transition:opacity .2s;}
svg.filtered .edge.on{opacity:.85;}
.hint{margin-top:10px;color:#66687e;font-size:12px;text-align:center;line-height:1.8;}
.hint em{color:#9a9cae;font-style:normal;}
/* tooltip */
#tip{position:fixed;pointer-events:none;background:#151623;border:1px solid #3c3e52;border-radius:8px;padding:9px 12px;font-size:12.5px;color:#e8e2c8;box-shadow:0 8px 24px rgba(0,0,0,.6);opacity:0;transition:opacity .12s;z-index:50;max-width:260px;line-height:1.6;}
#tip .t1{font-weight:700;color:var(--gold);}
#tip .t2{color:#8a8ca0;font-size:11.5px;}
#tip .t3{color:#c9b06a;font-size:11px;}
@media print{.chips{display:none}}
`;

const pageJs = `
(function(){
  var svg=document.getElementById('map');
  var wrap=document.getElementById('mapbox');
  var tip=document.getElementById('tip');
  var vb={x:0,y:0,w:svg.viewBox.baseVal.width,h:svg.viewBox.baseVal.height};
  function apply(){svg.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h);}
  /* 滚轮缩放（以指针为中心） */
  wrap.addEventListener('wheel',function(e){
    e.preventDefault();
    var k=e.deltaY<0?0.86:1/0.86;
    var r=wrap.getBoundingClientRect();
    var mx=vb.x+(e.clientX-r.left)/r.width*vb.w;
    var my=vb.y+(e.clientY-r.top)/r.height*vb.h;
    var nw=Math.min(vb.w*k,svg.viewBox.baseVal.width*1.6),nh=nw*vb.h/vb.w;
    nw=Math.max(nw,420);
    vb.x=mx-(mx-vb.x)*(nw/vb.w);vb.y=my-(my-vb.y)*(nh/vb.h);
    vb.w=nw;vb.h=nw*svg.viewBox.baseVal.height/svg.viewBox.baseVal.width;apply();
  },{passive:false});
  /* 拖拽平移 */
  var drag=null;
  wrap.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y};svg.classList.add('grabbing');wrap.setPointerCapture(e.pointerId);});
  wrap.addEventListener('pointermove',function(e){
    if(drag){
      var r=wrap.getBoundingClientRect();
      vb.x=drag.vx-(e.clientX-drag.x)/r.width*vb.w;
      vb.y=drag.vy-(e.clientY-drag.y)/r.height*vb.h;apply();
    }
  });
  wrap.addEventListener('pointerup',function(){drag=null;svg.classList.remove('grabbing');});
  wrap.addEventListener('pointercancel',function(){drag=null;svg.classList.remove('grabbing');});
  /* 节点 tooltip */
  var fig=document.getElementById('fig');
  fig.addEventListener('pointermove',function(e){
    var n=e.target.closest('.node');
    if(n){
      tip.innerHTML='<div class="t1">'+n.dataset.name+'</div><div class="t2">'+n.dataset.sub+'</div>'+(n.dataset.badges?'<div class="t3">'+n.dataset.badges+'</div>':'');
      tip.style.opacity=1;
      var px=e.clientX+14,py=e.clientY+14;
      if(px+270>innerWidth)px=e.clientX-274;
      tip.style.left=px+'px';tip.style.top=py+'px';
    }else{tip.style.opacity=0;}
  });
  fig.addEventListener('pointerleave',function(){tip.style.opacity=0;});
  /* 章节高亮 */
  var flow=document.getElementById('flow');
  var chips=document.getElementById('chips');
  function setFilter(ci){
    var allbtn=document.querySelector('.chip.allbtn');
    document.querySelectorAll('.chip:not(.allbtn)').forEach(function(c){c.classList.toggle('active',+c.dataset.ch===ci);});
    if(allbtn)allbtn.classList.toggle('active',ci<0);
    flow.classList.toggle('muted',ci>=0);
    document.querySelectorAll('.fcard').forEach(function(c){c.classList.toggle('active',+c.dataset.ch===ci);});
    if(ci<0){svg.classList.remove('filtered');}
    else{
      svg.classList.add('filtered');
      svg.querySelectorAll('.node').forEach(function(n){n.classList.toggle('on',+n.dataset.ch===ci);});
      svg.querySelectorAll('.edge').forEach(function(ed){
        var c=+ed.dataset.ch;ed.classList.toggle('on',c===ci);
      });
    }
  }
  document.querySelectorAll('.fcard').forEach(function(c){c.addEventListener('click',function(){
    setFilter(+c.dataset.ch===getCurrent()?-1:+c.dataset.ch);});
  });
  function getCurrent(){
    var a=document.querySelector('.chip.active:not(.allbtn)');
    return a?+a.dataset.ch:-1;
  }
  document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){
    setFilter(+c.dataset.ch);
  });});
})();
`;

const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>符文王座 · 暗影觉醒 —— 游戏流程总览 & 全境地图</title>
<style>${pageCss}</style></head><body>
<div class="wrap">
  <header>
    <h1>符文王座 · 暗影觉醒 —— 游戏流程总览 &amp; 全境地图</h1>
    <div class="sub">西方幻想 · 自由探索文字RPG · 全七章完整收官　共 <b>${all.length} 地点</b> · <b>49</b> 种敌人 · <b>28</b> 条支线 · <b>8</b> 张藏宝图 · <b>4</b> 座秘窟副本 · <b>15</b> 种结局 · 单周目约 <b>270~330</b> 分钟</div>
  </header>
  <div class="flow" id="flow">
${flowCards}
  </div>
  <div class="chips" id="chips">
    <button class="chip allbtn active" data-ch="-1" style="--ac:#e8d9a0;--fl:#23242e">🗺 全境一览</button>
    ${legendChips}
  </div>
  <div class="mapbox" id="mapbox">
    <svg id="map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Microsoft YaHei','PingFang SC',sans-serif"><g id="fig">${svg.join('\n')}</g></svg>
  </div>
  <div class="hint">滚轮缩放 · 拖拽平移 · 悬停查看地点详情 · 点击流程卡或章节筛选可点亮对应区域　　徽标：<em>⚠ 野外遭遇　🏕 可休息　💾 存档点　👤 有 NPC　❖ 藏宝图埋宝处</em>　　实线=罗盘通路　虚线=上/下楼　点线=「回」折返捷径</div>
</div>
<div id="tip"></div>
<script>${pageJs}</script>
</body></html>`;

const out = path.join(__dirname, '../game_flow_map.html');
fs.writeFileSync(out, html);
console.log(`输出：${out}（画布 ${W}×${H}，地点 ${all.length}，边 ${edges.length}）`);
for (const f of FLOW) console.log(`  ${CH_STYLE[f.ch].label}：${f.locs} 地点`);
