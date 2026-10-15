/* 扫描 world.js：按顶层块归属，列出同伴名字的每处提及，标注是否落在「入队前可达」区 */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8');
const lines = src.split('\n');

/* ---------- 一次遍历：收集顶层块头（0 基行号） ---------- */
const heads = [];
for (let i = 0; i < lines.length; i++) {
  let m = lines[i].match(/^const (\w+)/);
  if (m) { heads.push({ at: i, kind: 'const', id: m[1], ch: '', name: m[1] }); continue; }
  m = lines[i].match(/^  ([A-Za-z_]\w*): (\[|\{)/);
  if (m) {
    /* 位置块：从块头往下 6 行找 ch / sub 与 name */
    let ch = '', sub = '', name = m[1];
    for (let j = i; j < Math.min(i + 6, lines.length); j++) {
      const c = lines[j].match(/ch: '([^']+)'/); if (c && !ch) ch = c[1];
      const s = lines[j].match(/sub: '([^']+)'/); if (s && !sub) sub = s[1];
      const n = lines[j].match(/name: '([^']+)'/); if (n && name === m[1]) name = n[1];
    }
    heads.push({ at: i, kind: 'loc', id: m[1], ch: ch + (sub ? ' · ' + sub : ''), name });
  }
}
heads.sort((a, b) => a.at - b.at);

function blockOf(lineIdx) {
  let lo = 0, hi = heads.length - 1, best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (heads[mid].at <= lineIdx) { best = heads[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  return best || { kind: '?', id: '?', ch: '', name: '?' };
}

/* ---------- 入队锚点 ----------
 * aria   → dusk_camp 营火救人（第一部·小节二）后才在队
 * thorne → temple_altar 重燃祭坛（第一部·小节四）后才在队（此前在圣殿以守殿人身份在场，属正常 NPC）
 * kaya   → lighthouse 灯塔救人（第三部）后才在队 */
const WORLD_AT = id => heads.find(h => h.kind === 'loc' && h.id === id);
const ariaJoin = WORLD_AT('dusk_camp'), thorneJoin = WORLD_AT('temple_altar'), kayaJoin = WORLD_AT('lighthouse');
const CH_SEQ = ['序章', '第一部', '第二部', '第三部', '第四部', '第五部', '第六部', '终部'];
const chRank = ch => { for (let i = 0; i < CH_SEQ.length; i++) if ((ch || '').startsWith(CH_SEQ[i])) return i; return -1; };
const subNum = h => { const m = (h.ch || '').match(/小节([一二三四五六七八九])/); return m ? m[1] : '九'; };

function risky(who, h) {
  if (!h || h.kind !== 'loc') return false;
  const r = chRank(h.ch);
  if (who === 'aria') {
    if (r < 1) return true;                                   // 序章
    if (r > 1) return false;                                  // 第一部之后必然已入队
    return ['一', '二'].includes(subNum(h)) && h.id !== 'dusk_camp'; // 小节一/二可先逛，救人前艾莉娅不在
  }
  if (who === 'thorne') return false;                         // 圣殿阶段索恩以 NPC 身份在场，只列出不判定
  if (who === 'kaya') {
    if (r < 0) return false;                                  // 非位置块（任务/传闻等）人工看
    return r < 2 || (r === 2);                                // 第三部全部地点在灯塔救人前都可能没卡雅
  }
  return false;
}

const NAME_RE = { aria: /艾莉娅/, thorne: /索恩/, kaya: /卡雅/ };
const out = { aria: [], thorne: [], kaya: [] };
for (let i = 0; i < lines.length; i++) {
  for (const who of Object.keys(NAME_RE)) {
    if (NAME_RE[who].test(lines[i])) out[who].push({ line: i + 1, text: lines[i].trim().replace(/\s+/g, ' ').slice(0, 100), h: blockOf(i) });
  }
}

for (const who of Object.keys(out)) {
  const J = { aria: ariaJoin, thorne: thorneJoin, kaya: kayaJoin }[who];
  console.log(`\n======== ${who}：${out[who].length} 处提及；入队锚 ${J ? J.id + '《' + J.ch + '》' : '?'} ========`);
  for (const it of out[who]) {
    const tag = risky(who, it.h) ? '⚠️入队前' : '        ';
    const b = it.h;
    console.log(`${tag} L${String(it.line).padStart(5)} [${b.kind}:${b.id}]${b.ch ? '《' + b.ch + '》' : ''} ${it.text}`);
  }
}
