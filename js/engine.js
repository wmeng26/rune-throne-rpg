/* ============================================================
 * 符文王座 · 暗影觉醒 — 文字RPG引擎
 * 依赖：world.js（WORLD 地点表 / ITEMS / SKILLS / ENEMIES / QUESTS / ENDINGS / PARTY）
 *
 * 交互模型：
 *   - 冒险以滚动日志呈现（打字机），所有移动/战斗/对话都写入日志
 *   - 玩家通过底部指令栏自由移动（方位按钮）与做事（交谈/调查/休息）
 *   - 顶栏随时打开 背包 / 技能 / 角色 / 地图 面板（地图按探索进度逐格点亮）
 *   - 战斗为指令式回合制：意图宣告 → 玩家行动 → 同伴协同（态势AI）→ 敌方行动
 * 事件原语：say / choose / battle / move / fx / give / take / setFlag / ev /
 *           checkpoint / quest / gainExp / partyJoin / ending / sleepMs
 * ============================================================ */
'use strict';

const SAVE_KEY = 'rune_throne_rpg_v1';
const ENDINGS_KEY = 'rune_throne_endings_v2';
const $ = s => document.querySelector(s);

let S = null;          // 玩家状态（可序列化）
let C = null;          // 当前战斗临时状态（不进存档）
let mode = 'title';    // title | explore | combat
let busy = false;      // 事件/战斗进行中，锁住指令栏
let lastCh = '';
let lastSub = '';
let typing = false;
let typeSkip = false;

const FAST = /[?&]fast=1/.test(location.search);
const DIRS = { n: '↑ 北', s: '↓ 南', w: '← 西', e: '→ 东', up: '↥ 上', down: '↧ 下', se: '↘ 东北', nw: '↖ 西北', sw: '↙ 西南', ne: '↗ 东北', enter: '▸ 进入' };

const rnd = n => Math.floor(Math.random() * n);
const sleepMs = ms => new Promise(r => { if (FAST || document.hidden) r(); else setTimeout(r, ms); });

/* 可饮用的回复品：id → 回复量（战斗/行囊通用） */
const HEALS = { potion: 10, potion_big: 25, honey: 6, roast_fish: 8 };

/* ================= 同伴战斗单位 =================
 * 同伴是独立单位：生命/斗气随主角等级成长（上限由等级推导，存档只存当前值）。
 * 生命归零为「昏厥」，可用药剂救醒；战斗胜利/撤离后自动缓复两成，休息点全队恢复。 */
const ALLY_DEF = {
  aria:   { short: '艾莉娅', baseHp: 12, hpLv: 2, baseSp: 10 },
  thorne: { short: '索恩',   baseHp: 20, hpLv: 3, baseSp: 8 },
  kaya:   { short: '卡雅',   baseHp: 15, hpLv: 2, baseSp: 9 },
};
const PARTY_IDS = ['aria', 'thorne', 'kaya'];   // 入队顺序（界面/战斗遍历用）
const STANCE = { balanced: '均衡', aggressive: '强攻', guard: '守护' };
const STANCE_ORDER = ['balanced', 'aggressive', 'guard'];

function allyMaxHp(id) {
  const d = ALLY_DEF[id], b = (S.boons && S.boons.partyHp) || 0;
  return d.baseHp + d.hpLv * (S.level - 1) + b;
}
function allySpMax(id) {
  const d = ALLY_DEF[id], b = (S.boons && S.boons.partySp) || 0;
  return d.baseSp + Math.floor((S.level - 1) / 2) + b;
}
function ensureTeam() {
  if (!S.team) S.team = {};
  for (const id of Object.keys(ALLY_DEF)) {
    if (S.flags[id]) {
      if (!S.team[id]) S.team[id] = { hp: allyMaxHp(id), sp: allySpMax(id) };
      S.team[id].hp = Math.max(0, Math.min(S.team[id].hp, allyMaxHp(id)));
      S.team[id].sp = Math.max(0, Math.min(S.team[id].sp, allySpMax(id)));
    } else delete S.team[id];
  }
}

/* ================= 存档 ================= */
function defaultState() {
  return {
    name: '无名旅者',
    level: 1, exp: 0,
    hp: 20, maxHp: 20,
    sp: 10, spMax: 10,
    gold: 20, rep: 0, corruption: 0,
    items: {}, flags: {}, events: {}, sideQuests: {},
    equip: { weapon: null, armor: null, accessory: null },
    team: {},                                  // 同伴战斗单位：{ aria:{hp,sp}, thorne:{hp,sp} }
    boons: { vit: 0, spi: 0, atk: 0, partyHp: 0, partySp: 0 },  // 升级自选强化累计
    stance: 'balanced',                        // 同伴态势：balanced | aggressive | guard
    loc: null, prevLoc: null,
    checkpoint: null, snap: null,
    visits: {}, quest: 'q_inn',
    wrongWisdom: 0, roamCd: 0, travelCd: 0,
    time: { ticks: 4 },                        // 时间：8刻=1天，2刻=1时段；开局第1天·黄昏
    kills: {},                                 // 击杀计数（讨伐委托用）
    bounty: null,                              // 当前接下的委托 { id, base, day }
    doneBounties: [],                          // 已完成的委托（不再刷新）
  };
}
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
function saveGame() { if (S && S.loc) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
function loadGame() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function getEndings() { try { return JSON.parse(localStorage.getItem(ENDINGS_KEY)) || []; } catch (e) { return []; } }
function addEnding(id) {
  const list = getEndings();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(ENDINGS_KEY, JSON.stringify(list)); return true; }
  return false;
}

/* ================= 时间系统 =================
 * 8 刻 = 1 天；2 刻 = 1 个时段（清晨/白昼/黄昏/夜晚）。
 * 移动 +1 刻；休息睡到次日清晨；部分剧情会拨动时间。
 * 夜晚野外会换一批更凶的游荡者（见各地点 roam.byTime）。 */
const SLOT_NAMES = ['清晨', '白昼', '黄昏', '夜晚'];
const SLOT_KEYS = ['dawn', 'day', 'dusk', 'night'];
function timeTicks() { return S.time && typeof S.time.ticks === 'number' ? S.time.ticks : 4; }
function timeSlot() { return Math.floor((timeTicks() % 8) / 2); }
function timeDay() { return Math.floor(timeTicks() / 8) + 1; }
function timeKey() { return SLOT_KEYS[timeSlot()]; }
function timeText() { return `第${timeDay()}天 · ${SLOT_NAMES[timeSlot()]}`; }
function isNight() { return timeSlot() === 3; }
function advanceTime(n = 1) {
  if (!S) return;
  if (!S.time) S.time = { ticks: 4 };
  const prev = timeSlot();
  S.time.ticks += n;
  const now = timeSlot();
  if (now !== prev) {
    if (now === 3) logLine('☾ 夜幕四合。野外的雾，开始不认人了。', 'sys');
    else if (now === 0) logLine(`☀ 天光渐亮——${timeText()}。`, 'sys');
    else if (now === 2) logLine('黄昏把雾染成了旧金色。', 'sys');
    updateHUD(); updateSidebar();
  }
}
function sleepToDawn() {
  if (!S) return;
  if (!S.time) S.time = { ticks: 4 };
  S.time.ticks = Math.ceil((timeTicks() + 1) / 8) * 8;   // 睡到次日清晨
  logLine(`☀ 一夜好睡——${timeText()}。`, 'sys');
  updateHUD(); updateSidebar();
}
function setSlot(key) {
  if (!S) return;
  if (!S.time) S.time = { ticks: 4 };
  const slot = Math.max(0, SLOT_KEYS.indexOf(key));
  S.time.ticks = Math.floor(timeTicks() / 8) * 8 + slot * 2 + 1;
  updateHUD(); updateSidebar();
}

/* ================= 效果 / 条件 ================= */
function fmtText(t) { return String(t).replace(/\{name\}/g, S.name); }

function fx(o) {
  if (!o) return;
  if (o.hp) {
    S.hp = Math.max(1, Math.min(S.maxHp, S.hp + o.hp));
    showToast(`生命 ${o.hp > 0 ? '+' : ''}${o.hp}`, o.hp < 0);
  }
  if (o.maxHp) { S.maxHp += o.maxHp; S.hp = Math.min(S.maxHp, S.hp + o.maxHp); showToast(`生命上限 +${o.maxHp}`); }
  if (o.spMax) { S.spMax += o.spMax; S.sp = Math.min(S.spMax, S.sp + o.spMax); showToast(`斗气上限 +${o.spMax}`); }
  if (o.sp) { S.sp = Math.max(0, Math.min(S.spMax, S.sp + o.sp)); }
  if (o.gold) { S.gold = Math.max(0, S.gold + o.gold); showToast(`金币 ${o.gold > 0 ? '+' : ''}${o.gold}`, o.gold < 0); }
  if (o.rep) { S.rep += o.rep; showToast(`声望 ${o.rep > 0 ? '+' : ''}${o.rep}`, o.rep < 0); }
  if (o.corruption) { S.corruption = Math.max(0, S.corruption + o.corruption); showToast(`黑暗侵蚀 +${o.corruption}`, true); }
  if (o.item) for (const part of [].concat(o.item)) { const [id, n] = part.split(':'); give(id, parseInt(n || '1', 10)); }
  if (o.take) for (const part of [].concat(o.take)) { const [id, n] = part.split(':'); take(id, parseInt(n || '1', 10)); }
  if (o.flag) for (const f of [].concat(o.flag)) S.flags[f] = true;
  updateHUD(); updateSidebar();
}
function give(id, n = 1) {
  S.items[id] = (S.items[id] || 0) + n;
  const it = ITEMS[id];
  showToast(`获得：${it ? it.name : id}${n > 1 ? ' ×' + n : ''}`);
  logLine(`【行囊】获得了 ${it ? it.icon + ' ' + it.name : id}${n > 1 ? ' ×' + n : ''}。`, 'sys');
  updateHUD();
}
function take(id, n = 1) {
  S.items[id] = Math.max(0, (S.items[id] || 0) - n);
  if (!S.items[id]) delete S.items[id];
  const it = ITEMS[id];
  showToast(`失去：${it ? it.name : id}`, true);
  updateHUD();
}
function setFlag() { for (const f of arguments) S.flags[f] = true; }
function ev(id) { if (S.events[id]) return false; S.events[id] = true; return true; }
function quest(id) { S.quest = id; updateSidebar(); }
/* 支线任务：与主线并存，不互相覆盖；done 后保留在侧栏显示 ✓ */
function sideQuest(id) {
  if (S.sideQuests[id]) return;
  S.sideQuests[id] = 'active';
  const q = SIDE_QUESTS[id];
  if (q) { showToast(`📜 支线接取：${q.title}`); logLine(`【支线】${q.title} —— ${q.hint}`, 'sys'); }
  updateSidebar();
}
function finishSide(id) {
  if (S.sideQuests[id] !== 'active') return;
  S.sideQuests[id] = 'done';
  const q = SIDE_QUESTS[id];
  if (q) { showToast(`✓ 支线完成：${q.title}`); logLine(`【支线】「${q.title}」完成。`, 'sys'); }
  updateSidebar();
}
function partyJoin(id) {
  S.flags[id] = true;
  const p = PARTY[id];
  if (p) showToast(`${p.name} 加入了队伍！`);
  updateSidebar();
}

/* ================= 装备 ================= */
const SLOT_NAME = { weapon: '武器', armor: '防具', accessory: '饰品' };

function equipAttrText(it) {
  const p = [];
  if (it.atk) p.push(`攻击 +${it.atk}`);
  if (it.def) p.push(`受伤 -${it.def}`);
  if (it.maxHp) p.push(`生命上限 +${it.maxHp}`);
  if (it.spMax) p.push(`斗气上限 +${it.spMax}`);
  if (it.crit) p.push(`会心 +${Math.round(it.crit * 100)}%`);
  return p.length ? `（${p.join('，')}）` : '';
}

function equipTotals() {
  const t = { atk: 0, def: 0, maxHp: 0, spMax: 0, crit: 0 };
  if (!S.equip) return t;
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const it = S.equip[slot] && ITEMS[S.equip[slot]];
    if (it) { t.atk += it.atk || 0; t.def += it.def || 0; t.maxHp += it.maxHp || 0; t.spMax += it.spMax || 0; t.crit += it.crit || 0; }
  }
  return t;
}

function equipItem(id) {
  const it = ITEMS[id];
  if (!it || it.kind !== 'equip' || !S.equip) return;
  const slot = it.slot;
  const prev = S.equip[slot];
  // 新装备入位（从行囊扣除）
  S.items[id] = Math.max(0, (S.items[id] || 0) - 1);
  if (!S.items[id]) delete S.items[id];
  S.equip[slot] = id;
  if (it.maxHp) S.maxHp += it.maxHp;
  if (it.spMax) { S.spMax += it.spMax; S.sp = Math.min(S.spMax, S.sp + it.spMax); }
  // 旧装备回行囊
  if (prev && prev !== id) {
    const p = ITEMS[prev];
    S.items[prev] = (S.items[prev] || 0) + 1;
    if (p && p.maxHp) { S.maxHp = Math.max(1, S.maxHp - p.maxHp); S.hp = Math.min(S.hp, S.maxHp); }
    if (p && p.spMax) { S.spMax = Math.max(1, S.spMax - p.spMax); S.sp = Math.min(S.sp, S.spMax); }
  }
  showToast(`已装备：${it.name}`);
  logLine(`【装备】${it.icon} ${it.name} 装到了${SLOT_NAME[slot]}位${equipAttrText(it)}。`, 'sys');
  updateHUD(); updateSidebar();
}

function unequipItem(slot) {
  if (!S.equip || !S.equip[slot]) return;
  const id = S.equip[slot];
  const it = ITEMS[id];
  S.equip[slot] = null;
  S.items[id] = (S.items[id] || 0) + 1;
  if (it && it.maxHp) { S.maxHp = Math.max(1, S.maxHp - it.maxHp); S.hp = Math.min(S.hp, S.maxHp); }
  if (it && it.spMax) { S.spMax = Math.max(1, S.spMax - it.spMax); S.sp = Math.min(S.sp, S.spMax); }
  showToast(`已卸下：${it ? it.name : id}`);
  updateHUD(); updateSidebar();
}

function checkpoint() {
  S.checkpoint = S.loc;
  const snap = Object.assign({}, S);
  delete snap.snap;
  S.snap = JSON.stringify(snap);
  showToast('✚ 已记录命运节点');
}
function expNeed() { return 20 + (S.level - 1) * 15; }

/* 升级自选强化：每升 1 级四选一 */
const BOONS = [
  { id: 'vit',   icon: '🫀', text: '生命强化 · 生命上限 +6（并回复）' },
  { id: 'spi',   icon: '✦',  text: '斗气淬炼 · 斗气上限 +2' },
  { id: 'atk',   icon: '🗡', text: '剑锋磨砺 · 攻击 +1' },
  { id: 'party', icon: '🤝', text: '同袍协力 · 同伴生命上限 +3、斗气上限 +1' },
];
function applyBoon(id) {
  if (!S.boons) S.boons = { vit: 0, spi: 0, atk: 0, partyHp: 0, partySp: 0 };
  ensureTeam();
  if (id === 'vit') {
    S.boons.vit++;
    S.maxHp += 6; S.hp = Math.min(S.maxHp, S.hp + 6);
    logLine('【强化·生命】你的体魄愈发坚韧。（生命上限 +6）', 'good');
  } else if (id === 'spi') {
    S.boons.spi++;
    S.spMax += 2; S.sp = Math.min(S.spMax, S.sp + 2);
    logLine('【强化·斗气】斗气在经脉中奔涌不息。（斗气上限 +2）', 'good');
  } else if (id === 'atk') {
    S.boons.atk++;
    logLine('【强化·剑锋】你的出手更加狠辣。（攻击 +1）', 'good');
  } else {
    S.boons.partyHp += 3; S.boons.partySp += 1;
    for (const k of Object.keys(S.team)) S.team[k].hp = Math.min(allyMaxHp(k), S.team[k].hp + 3);
    logLine('【强化·同袍】同伴与你配合愈发默契。（同伴生命上限 +3、斗气上限 +1）', 'good');
  }
}
async function gainExp(n) {
  if (!n) return;
  S.exp += n;
  showToast(`经验 +${n}`);
  while (S.exp >= expNeed()) {
    S.exp -= expNeed();
    S.level++;
    S.maxHp += 5; S.hp = Math.min(S.maxHp, S.hp + 5);
    S.spMax += 1; S.sp = Math.min(S.spMax, S.sp + 1);
    ensureTeam();
    for (const id of Object.keys(S.team)) S.team[id].hp = Math.min(allyMaxHp(id), S.team[id].hp + 3);
    logLine(`✦ 等级提升！Lv.${S.level}（生命上限 +5，斗气上限 +1，同伴同步成长）`, 'sys');
    showToast(`等级提升！Lv.${S.level}`);
    const i = await choose(BOONS.map(b => ({ text: `${b.icon} ${b.text}`, run: async () => {} })));
    applyBoon(BOONS[i] ? BOONS[i].id : 'vit');
  }
  updateHUD(); updateSidebar();
}

/* ================= 日志与打字机 ================= */
function scrollLog() { const el = $('#log'); el.scrollTop = el.scrollHeight; }

function logLine(text, cls) {
  const box = $('#log');
  const d = document.createElement('div');
  d.className = 'ln' + (cls ? ' ' + cls : '');
  d.textContent = text;
  box.appendChild(d);
  scrollLog();
}

// 打字机输出若干段（返回 Promise，点击日志或空格可跳过）
function say(paras, opts = {}) {
  const list = (Array.isArray(paras) ? paras : [paras]).filter(Boolean).map(fmtText);
  return new Promise(resolve => {
    let pi = 0;
    typing = true; typeSkip = false;
    const nextPara = () => {
      if (pi >= list.length) { typing = false; $('#log').onclick = null; scrollLog(); resolve(); return; }
      const text = list[pi++];
      const p = document.createElement('p');
      p.className = 'para' + (opts.cls ? ' ' + opts.cls : '');
      $('#log').appendChild(p);
      // 后台标签页的定时器会被浏览器强节流，此时直接整段输出，避免叙事卡住
      if (document.hidden || FAST) {
        p.textContent = text;
        scrollLog();
        nextPara();
        return;
      }
      const caret = document.createElement('span'); caret.className = 'caret';
      const SPEED = 83;
      const start = performance.now();
      let shown = 0;
      const timer = setInterval(() => {
        if (typeSkip) {
          p.textContent = text; scrollLog(); clearInterval(timer);
          setTimeout(() => { caret.remove(); nextPara(); }, FAST ? 10 : 60);
          return;
        }
        shown = Math.max(shown, Math.floor((performance.now() - start) / 1000 * SPEED) + 2);
        if (shown >= text.length) {
          p.textContent = text; p.appendChild(caret); scrollLog(); clearInterval(timer);
          setTimeout(() => { caret.remove(); nextPara(); }, FAST ? 10 : 240);
        } else { p.textContent = text.slice(0, shown); p.appendChild(caret); scrollLog(); }
      }, 24);
      $('#log').onclick = () => { typeSkip = true; };
    };
    nextPara();
  });
}

// 在指令栏渲染一组选项，等待玩家点选（返回原始下标）
function choose(opts) {
  return new Promise(resolve => {
    const box = $('#cmd-actions');
    box.innerHTML = '';
    opts.forEach((o, i) => {
      if (o.when && !o.when()) return;
      const btn = document.createElement('button');
      btn.className = 'choice';
      const ok = !o.req || o.req(S);
      if (!ok) {
        btn.disabled = true;
        btn.innerHTML = fmtText(o.text) + `<span class="lock">🔒 ${o.lock || '条件不足'}</span>`;
      } else {
        btn.textContent = fmtText(o.text);
        btn.addEventListener('click', () => { box.innerHTML = ''; resolve(i); });
      }
      box.appendChild(btn);
    });
    if (!box.children.length) resolve(-1);
  });
}

/* ================= HUD / 侧栏 ================= */
function updateHUD() {
  if (!S) return;
  $('#hud-name').textContent = `${S.name} · Lv.${S.level}`;
  $('#hud-hp-bar').style.width = Math.max(0, (S.hp / S.maxHp) * 100) + '%';
  $('#hud-hp-text').textContent = `❤ ${S.hp}/${S.maxHp}`;
  $('#hud-sp').textContent = `✦ ${S.sp}/${S.spMax}`;
  $('#hud-gold').textContent = `💰 ${S.gold}`;
  $('#hud-rep').textContent = `★ ${S.rep}`;
  $('#hud-corr').textContent = S.corruption > 0 ? `✴ ${S.corruption}` : '';
  $('#hud-corr').style.display = S.corruption > 0 ? '' : 'none';
}

function exitsOf(loc) { return Object.entries(loc.exits || {}); }

function exitsSentence(loc) {
  const parts = exitsOf(loc).map(([d, ex]) => `${(DIRS[d] || d).split(' ')[1] || d}面·${ex.label}`);
  return '去路：' + parts.join('，') + '。';
}

function updateSidebar() {
  if (!S) return;
  const loc = WORLD[S.loc];
  if (loc) {
    $('#loc-name').textContent = loc.name;
    $('#loc-ch').textContent = loc.ch || '';
    $('#loc-exits').innerHTML = exitsOf(loc).map(([d, ex]) => {
      const ok = !ex.req || ex.req(S);
      return `<div class="loc-exit${ok ? '' : ' locked'}">${DIRS[d] || '▸'} ${ex.label}${ok ? '' : ' 🔒'}</div>`;
    }).join('');
  }
  const q = QUESTS[S.quest];
  $('#quest-box').innerHTML = q ? `<b>${q.title}</b><small>${q.hint}</small>` : '';
  const sides = Object.entries(S.sideQuests || {}).filter(([, v]) => v === 'active')
    .map(([id]) => SIDE_QUESTS[id]).filter(Boolean);
  if (sides.length) {
    $('#quest-box').innerHTML += `<div class="side-quests">${sides.map(sq =>
      `<div class="side-quest"><b>◇ ${sq.title}</b><small>${sq.hint}</small></div>`).join('')}</div>`;
  }
  // 委托板进度（酒馆告示接下的随机任务）
  if (S.bounty && typeof BOUNTIES !== 'undefined') {
    const b = BOUNTIES.find(x => x.id === S.bounty.id);
    if (b) {
      const prog = Math.max(0, b.type === 'kill' ? (S.kills[b.en] || 0) - (S.bounty.base || 0) : Math.min((S.items[b.item] || 0), b.n));
      $('#quest-box').innerHTML += `<div class="side-quest"><b>◇ 委托·${b.title}</b><small>${b.type === 'kill' ? '猎杀 ' + b.n + ' 拨' : '备齐 ' + b.n + ' 份'}（进度 ${prog}/${b.n}）· 回酒馆领赏</small></div>`;
    }
  }
  // 队伍
  ensureTeam();
  let party = `<img src="assets/chars/hero.svg" title="${S.name} ❤${S.hp}/${S.maxHp}" alt="">`;
  for (const id of PARTY_IDS) if (S.flags[id] && S.team[id]) {
    const t = S.team[id];
    party += `<img src="${PARTY[id].img}" title="${PARTY[id].name} ❤${t.hp}/${allyMaxHp(id)} ✦${t.sp}/${allySpMax(id)}" alt="">`;
  }
  const joined = PARTY_IDS.filter(id => S.flags[id]).length;
  for (let i = 0; i < 3 - joined; i++) party += '<div class="party-slot"></div>';
  $('#party-row').innerHTML = party;
  // 属性
  let statHtml = `
    <div class="stat-row"><span>时辰</span><b>${timeText()}</b></div>
    <div class="stat-row"><span>等级</span><b>Lv.${S.level}（${S.exp}/${expNeed()}）</b></div>
    <div class="stat-row"><span>生命</span><b>${S.hp} / ${S.maxHp}</b></div>
    <div class="stat-row"><span>斗气</span><b>${S.sp} / ${S.spMax}</b></div>
    <div class="stat-row"><span>金币</span><b>${S.gold}</b></div>
    <div class="stat-row"><span>声望</span><b>${S.rep}</b></div>`;
  for (const id of PARTY_IDS) {
    if (S.flags[id] && S.team[id]) {
      const t = S.team[id];
      statHtml += `<div class="stat-row"><span>${ALLY_DEF[id].short}</span><b>❤ ${t.hp}/${allyMaxHp(id)} · ✦ ${t.sp}/${allySpMax(id)}</b></div>`;
    }
  }
  if (S.corruption > 0) statHtml += `<div class="stat-row"><span class="corr">侵蚀</span><b class="corr">${S.corruption}</b></div>`;
  $('#stat-rows').innerHTML = statHtml;
}

/* ================= 移动 ================= */
async function move(id, opts = {}) {
  const from = WORLD[S.loc];
  advanceTime(1);   // 赶路消耗时间：每段路程 +1 刻
  let flavor = null;
  if (from) for (const [, ex] of exitsOf(from)) if (ex.to === id) { flavor = ex.flavor; break; }
  S.prevLoc = S.loc;
  S.loc = id;
  S.visits[id] = (S.visits[id] || 0) + 1;
  S.roamCd = Math.max(0, S.roamCd - 1);
  S.travelCd = Math.max(0, (S.travelCd || 0) - 1);
  await enterLoc(id, { first: S.visits[id] === 1, flavor, ...opts });
  if (S.loc === id && !opts.respawn) await travelEvent(id);
}

/* ---------- 旅途随机事件：荒野（wild）之间赶路时小概率遭遇，带冷却 ---------- */
async function travelEvent(dest) {
  const loc = WORLD[dest];
  if (!loc || !loc.wild || FAST) return;
  if ((S.travelCd || 0) > 0 || mode !== 'explore' || C) return;
  if (Math.random() > 0.22) return;
  const pool = (typeof TRAVEL_EVENTS !== 'undefined' ? TRAVEL_EVENTS : []).filter(t => !t.when || t.when(S));
  if (!pool.length) return;
  S.travelCd = 2;
  logLine('～ 旅途中 ～', 'divider');
  const t = pool[rnd(pool.length)];
  await say([t.intro]);
  await t.run();
}

async function enterLoc(id, opts = {}) {
  const loc = WORLD[id];
  if (!loc) { console.error('[世界缺失地点]', id); return; }
  S.loc = id;
  const first = opts.first !== undefined ? opts.first : (S.visits[id] || 0) <= 1;

  // 章节与小节分隔
  if (loc.ch && loc.ch !== lastCh) {
    lastCh = loc.ch;
    lastSub = '';
    logLine('—— ' + loc.ch + ' ——', 'divider');
  }
  if (loc.sub && loc.sub !== lastSub) {
    lastSub = loc.sub;
    logLine('◈ ' + loc.sub, 'subdivider');
  }
  $('#chapter-label').textContent = (loc.ch || '') + (loc.sub ? ' · ' + loc.sub : '');
  $('#loc-bg-img').src = loc.bg || '';
  const panel = $('#log-panel');
  panel.className = 'mood-' + (loc.mood || 'dark');

  if (opts.flavor) await say([opts.flavor]);
  if (first && loc.desc) await say(loc.desc);
  else if (loc.brief) await say([loc.brief]);
  if (first) await say([exitsSentence(loc)]);

  if (loc.checkpoint && first) checkpoint();

  updateHUD(); updateSidebar(); renderExplore();

  // 剧情事件
  const wasLoc = id;
  if (loc.onEnter) await loc.onEnter();
  if (S.loc !== wasLoc) return; // 事件中已转场

  // 游荡遭遇（按时段取表：夜晚常换一批更凶的东西）
  if (loc.roam && !opts.respawn && S.roamCd === 0) {
    const rv = (loc.roam.byTime && loc.roam.byTime[timeKey()]) ? Object.assign({}, loc.roam, loc.roam.byTime[timeKey()]) : loc.roam;
    if (Math.random() < rv.chance) {
      S.roamCd = 2;
      const enId = Array.isArray(rv.en) ? rv.en[rnd(rv.en.length)] : rv.en;
      await say([rv.intro]);
      const r = await battle(enId, { fleeTo: rv.fleeTo });
      if (r === 'win' && rv.loot && !S.flags[rv.loot.flag]) {
        setFlag(rv.loot.flag);
        fx({ gold: rv.loot.gold, item: rv.loot.item });
        await say([rv.loot.text]);
      }
    }
  }
  if (S.loc === wasLoc) { updateHUD(); updateSidebar(); renderExplore(); }
}

function renderExplore() {
  if (mode === 'combat' || !S) return;
  const loc = WORLD[S.loc];
  if (!loc) return;
  const exBox = $('#cmd-exits');
  exBox.innerHTML = '';
  for (const [d, ex] of exitsOf(loc)) {
    const btn = document.createElement('button');
    btn.className = 'cmd exit';
    const ok = !ex.req || ex.req(S);
    if (!ok) {
      btn.disabled = true;
      btn.innerHTML = `${DIRS[d] || '▸'} ${ex.label}<span class="lock">🔒 ${ex.lock || '去路未明'}</span>`;
    } else {
      btn.innerHTML = `${DIRS[d] || '▸'} ${ex.label}`;
      btn.addEventListener('click', () => act(() => move(ex.to)));
    }
    exBox.appendChild(btn);
  }
  const acBox = $('#cmd-actions');
  acBox.innerHTML = '';
  const add = (text, fn, cls) => {
    const btn = document.createElement('button');
    btn.className = 'cmd' + (cls ? ' ' + cls : '');
    btn.textContent = text;
    btn.addEventListener('click', () => act(fn));
    acBox.appendChild(btn);
  };
  add('👁 环顾四周', async () => {
    await say([loc.brief || '一切如常。']);
    await say([exitsSentence(loc)]);
  });
  for (const [nid, npc] of Object.entries(loc.npcs || {})) {
    if (npc.hidden && npc.hidden()) continue;
    add(`💬 与${npc.name}交谈`, npc.talk);
  }
  for (const a of loc.actions || []) {
    if (a.when && !a.when()) continue;
    add('✦ ' + a.text, a.run);
  }
  if (loc.rest) {
    add(`🏕 ${loc.rest.label}${loc.rest.cost ? '（' + loc.rest.cost + '金币）' : ''}`, async () => {
      if (S.hp >= S.maxHp && S.sp >= S.spMax) { showToast('你已状态全满'); return; }
      if (loc.rest.cost && S.gold < loc.rest.cost) { showToast('金币不足', true); return; }
      if (loc.rest.cost) fx({ gold: -loc.rest.cost });
      S.hp = S.maxHp; S.sp = S.spMax;
      ensureTeam();
      for (const id of Object.keys(S.team)) { S.team[id].hp = allyMaxHp(id); S.team[id].sp = allySpMax(id); }
      await say(['你阖眼休息。炉火与远处的风声此起彼伏——醒来时，伤痛已被驱散，同伴们的气色也好了许多。（全队生命与斗气全满）']);
      sleepToDawn();
      updateHUD(); updateSidebar();
    });
  }
  if (busy) document.querySelectorAll('#cmd button').forEach(b => b.disabled = true);
}

/* 事件/动作统一入口：锁住指令栏，结束后刷新界面并存档 */
async function act(fn) {
  if (busy || mode === 'combat') return;
  busy = true;
  document.querySelectorAll('#cmd button').forEach(b => b.disabled = true);
  try { await fn(); }
  finally {
    busy = false;
    saveGame();
    if (mode === 'explore') renderExplore();
    updateHUD(); updateSidebar();
  }
}

/* ================= 面板 ================= */
function openModal(html, buttons) {
  $('#modal-content').innerHTML = html;
  const box = $('#modal-btns');
  box.innerHTML = '';
  (buttons || [{ text: '合上', primary: true }]).forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (b.primary ? ' btn-primary' : '');
    btn.style.margin = '0 8px';
    btn.textContent = b.text;
    btn.addEventListener('click', () => { closeModal(); b.fn && b.fn(); });
    box.appendChild(btn);
  });
  $('#modal-root').classList.remove('hidden');
}
function closeModal() { $('#modal-root').classList.add('hidden'); }

function openBag() {
  if (C) { showToast('战斗中请使用指令栏的药水', true); return; }
  const ids = Object.keys(S.items).filter(id => S.items[id] > 0);
  let rows = '';
  if (!ids.length) rows = '<div class="inv-empty">行囊空空，如夜之风。</div>';
  for (const id of ids) {
    const it = ITEMS[id]; if (!it) continue;
    let useBtn = '';
    if (it.kind === 'use') useBtn = `<button class="use" data-use="${id}">使用</button>`;
    else if (it.kind === 'equip') useBtn = `<button class="use" data-equip="${id}">装备</button>`;
    rows += `<div class="inv-item"><span class="ic">${it.icon}</span><span class="nm">${it.name}${S.items[id] > 1 ? ' ×' + S.items[id] : ''}${it.kind === 'equip' ? '<small>' + equipAttrText(it) + '</small>' : ''}<small>${it.desc}</small></span>${useBtn}</div>`;
  }
  openModal(`<h2 class="lore-title">🎒 行囊</h2><div class="inv-list">${rows}</div>`, [{ text: '合上行囊', primary: true }]);
  $('#modal-content').querySelectorAll('[data-equip]').forEach(btn => {
    btn.addEventListener('click', () => { equipItem(btn.dataset.equip); openBag(); });
  });
  $('#modal-content').querySelectorAll('[data-use]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.use;
      if (HEALS[id] && (S.items[id] || 0) > 0) {
        if (doPotion(id) === false) return;
        updateSidebar(); openBag();
      }
    });
  });
}

function openSkills() {
  const group = (title, ids, auto) => {
    let html = `<h3>${title}</h3>`;
    let any = false;
    for (const id of ids) {
      const sk = SKILLS[id];
      if (!sk) continue;
      if (sk.reqFlag && !S.flags[sk.reqFlag]) continue;
      any = true;
      const locked = sk.lv && S.level < sk.lv;
      const tag = locked ? `<span class="tag">Lv.${sk.lv} 解锁</span>`
        : auto ? '<span class="tag">同伴自动施展</span>'
        : '<span class="tag">战斗技</span>';
      html += `<div class="inv-item"><span class="ic">${sk.icon}</span><span class="nm">${sk.name}${sk.by ? ' · ' + sk.by : ''}<small>${sk.desc}${sk.cost ? '（斗气 ' + sk.cost + '）' : '（无消耗）'}</small></span>${tag}</div>`;
    }
    return any ? html : '';
  };
  openModal(`<h2 class="lore-title">⚔ 技能栏</h2>
    ${group('主角 · ' + S.name, ['strike', 'heavy', 'whirlslash', 'taunt', 'runeb', 'tideb', 'harvestwave', 'warhorn', 'knell'])}
    ${group('艾莉娅 · 星语', ['starfire', 'starshield', 'starheal'], true)}
    ${group('索恩 · 铁须', ['whirl', 'ironwall', 'warcry'], true)}
    ${group('卡雅', ['harpoon', 'whalelash', 'tidecircle'], true)}
    <p class="panel-note">战斗中，主角技能会出现在指令栏；同伴是独立战斗单位，按「态势」（均衡 / 强攻 / 守护）自动施展各自的技能，可在战斗指令栏一键切换。主角的「防御」可以硬接敌人预告的重击。斗气每回合恢复：主角 +2，同伴 +1。</p>`,
    [{ text: '合上', primary: true }]);
}

function openChar() {
  ensureTeam();
  const marks = [];
  if (S.flags.darkTouched) marks.push('<span class="corr">✴ 黑暗侵蚀缠身</span>');
  if (S.flags.rune) marks.push('☀ 符文之约');
  if (S.flags.alliance || S.flags.exposed) marks.push('📜 女王的信任');
  if (S.flags.inCity) marks.push('🏰 已入白石城');
  const eq = equipTotals();
  const b = S.boons || { atk: 0 };
  const atkLo = 3 + eq.atk + (b.atk || 0) + S.corruption;
  const atkHi = 6 + eq.atk + (b.atk || 0) + S.corruption;
  const slotRow = sl => {
    const id = S.equip && S.equip[sl];
    const it = id && ITEMS[id];
    return `<div class="stat-row"><span>${SLOT_NAME[sl]}</span><b>${it ? it.icon + ' ' + it.name + ' ' + equipAttrText(it) + ' <button class="use" data-unequip="' + sl + '">卸下</button>' : '（空）'}</b></div>`;
  };
  const allyRows = PARTY_IDS.filter(id => S.flags[id] && S.team[id]).map(id => {
    const t = S.team[id];
    return `<div class="stat-row"><span>${ALLY_DEF[id].short}（${PARTY[id].role}）</span><b>❤ ${t.hp}/${allyMaxHp(id)}　✦ ${t.sp}/${allySpMax(id)}</b></div>`;
  }).join('');
  openModal(`<h2 class="lore-title">👤 ${S.name}</h2>
    <div class="char-grid">
      <div class="stat-row"><span>等级</span><b>Lv.${S.level}</b></div>
      <div class="stat-row"><span>经验</span><b>${S.exp} / ${expNeed()}</b></div>
      <div class="stat-row"><span>生命</span><b>${S.hp} / ${S.maxHp}</b></div>
      <div class="stat-row"><span>斗气</span><b>${S.sp} / ${S.spMax}</b></div>
      <div class="stat-row"><span>攻击</span><b>${atkLo}~${atkHi}（基础 +武器${eq.atk} +强化${b.atk || 0} +侵蚀${S.corruption}）</b></div>
      <div class="stat-row"><span>护甲</span><b>受伤 -${eq.def}${eq.crit ? ' · 会心 +' + Math.round(eq.crit * 100) + '%' : ''}</b></div>
      <div class="stat-row"><span>金币</span><b>${S.gold}</b></div>
      <div class="stat-row"><span>声望</span><b>${S.rep}</b></div>
      <div class="stat-row"><span>侵蚀</span><b>${S.corruption}${S.corruption > 0 ? '（攻击 +' + S.corruption + '，每战开始啃噬等量生命）' : ''}</b></div>
    </div>
    <h3>装备</h3>
    <div class="char-grid">${slotRow('weapon')}${slotRow('armor')}${slotRow('accessory')}</div>
    <h3>同伴（态势：${STANCE[S.stance || 'balanced']}）</h3>
    <div class="char-grid">${allyRows || '<p style="font-size:13px;color:#5d5e75;">（尚无同伴——孤身一人）</p>'}</div>
    <h3>同行者</h3>
    <div class="party-row">${$('#party-row').innerHTML}</div>
    <h3>印记</h3>
    <p>${marks.join('　') || '（尚无印记）'}</p>
    <h3>当前目标</h3>
    <p><b>${QUESTS[S.quest] ? QUESTS[S.quest].title : ''}</b> —— ${QUESTS[S.quest] ? QUESTS[S.quest].hint : ''}</p>`,
    [{ text: '合上', primary: true }]);
  $('#modal-content').querySelectorAll('[data-unequip]').forEach(btn => {
    btn.addEventListener('click', () => { unequipItem(btn.dataset.unequip); openChar(); });
  });
}

/* ================= 战斗 v2 =================
 * 回合流程：意图宣告 → 玩家行动（技能/防御/道具/逃跑/态势）→ 同伴协同（态势AI）→ 敌方行动 → 回合结算
 * opts.bonus 为「先手」：首回合敌人措手不及（跳过敌方行动）。 */
const MOVE_HINT = { heavy: '高伤害！', poison: '淬毒！', shield: '凝聚护盾', stun: '试图锁住你的行动', buff: '鼓舞敌众', drain: '汲取生命', evade: '雾化回避' };

function buildUnits(en) {
  const defs = en.units || [{
    name: en.name, hp: en.hp, dmg: en.dmg, def: en.def || 0,
    moves: en.moves, rageAt: en.rageAt, rageText: en.rageText, die: en.die,
  }];
  const seen = {};
  return defs.map(d => {
    seen[d.name] = (seen[d.name] || 0) + 1;
    const name = seen[d.name] > 1 ? `${d.name}·${'乙丙丁'[seen[d.name] - 2]}` : d.name;
    return {
      name, char: d.char || en.char, hp: d.hp, max: d.hp, dmg: d.dmg, def: d.def || 0,
      moves: d.moves, rageAt: d.rageAt, rageText: d.rageText, die: d.die,
      shield: 0, evade: false, raged: false, cd: {}, next: null,
    };
  });
}

function livingEnemies() { return C.units.filter(u => u.hp > 0); }
function weakestEnemy() { return livingEnemies().sort((a, b) => a.hp - b.hp)[0]; }

function playerAtkBase() {
  const b = S.boons || { atk: 0 };
  return 3 + rnd(4) + equipTotals().atk + (b.atk || 0) + (S.corruption || 0);
}
function allyAtkBase(id) { return (id === 'aria' ? 3 : 4) + rnd(3) + Math.floor(S.level / 3); }

/* 对敌方单位结算一次伤害（物免/护甲/会心/士气/护盾），返回实际伤害 */
function hitEnemy(u, dmg, opt = {}) {
  if (!u || u.hp <= 0) return 0;
  const kind = opt.kind || 'atk';
  if (u.evade && kind === 'atk') {
    logLine(`${u.name}隐在浓雾之中，【${opt.skill || '攻击'}】穿雾而过，没有落点！`);
    return 0;
  }
  let d = Math.max(1, Math.round(dmg));
  let crit = false;
  if (kind === 'atk' && Math.random() < 0.12 + equipTotals().crit) { crit = true; d = Math.round(d * 1.8); }
  if (kind === 'atk' && u.def) d = Math.max(1, d - u.def);
  if (C.atkUp) d += 2;
  if (u.shield > 0 && d > 0) {
    const ab = Math.min(u.shield, d);
    u.shield -= ab; d -= ab;
    logLine(`${u.name}的黑盾挡下了 ${ab} 点伤害${u.shield > 0 ? `（余 🛡${u.shield}）` : '，盾壁碎裂！'}`, 'hurt');
  }
  if (d > 0) {
    u.hp -= d;
    logLine(`${opt.actor || S.name}使出【${opt.skill || '攻击'}】！对${u.name}造成 ${d} 点伤害${crit ? '——会心一击！' : '。'}`, crit ? 'good' : '');
  }
  if (u.hp <= 0) { u.hp = 0; logLine(u.die || `${u.name}倒下了！`, 'good'); }
  return d;
}

function healUnit(u, v, actor, skill) {
  let healed;
  if (!u || u.id === 'player') { healed = Math.min(v, S.maxHp - S.hp); S.hp += healed; }
  else { const t = S.team[u.id]; healed = Math.min(v, allyMaxHp(u.id) - t.hp); t.hp += healed; }
  const who = (!u || u.id === 'player') ? '你' : u.name;
  logLine(`${actor}施展【${skill}】，暖光抚过${who === '你' ? '你的' : who + '的'}伤口。（${who === '你' ? '生命' : who + ' 生命'} +${healed}）`, 'good');
}

function livingTeamUnits() {
  const list = [{ id: 'player', name: S.name, hp: S.hp, max: S.maxHp }];
  ensureTeam();
  for (const k of Object.keys(S.team)) list.push({ id: k, name: ALLY_DEF[k].short, hp: S.team[k].hp, max: allyMaxHp(k) });
  return list;
}
function worstWounded() {
  return livingTeamUnits().filter(u => u.hp > 0).sort((a, b) => a.hp / a.max - b.hp / b.max)[0] || null;
}

/* 敌方一次攻击结算（破胆吼减伤 → 护甲 → 防御姿态）；victim 为 null 时打主角 */
function hitPlayer(raw, u, m) {
  let d = Math.max(1, Math.round(raw));
  if (C.enemyWeak) d = Math.max(1, d - 2);
  d = Math.max(1, d - equipTotals().def);
  if (C.guard) d = Math.max(1, Math.round(d * 0.35));
  const tag = C.guard ? '，护盾挡下大半' : '';
  if (m && m.type === 'heavy') logLine(`${u.name}${m.text || `使出【${m.name}】`}（${d} 点伤害${tag}）`, 'hurt');
  else logLine(`${u.name}以【${m ? m.name : '攻击'}】击中了你！（${d} 点伤害${tag}）`, 'hurt');
  S.hp -= d;
  return d;
}
function hitAlly(id, raw, u, m) {
  let d = Math.max(1, Math.round(raw));
  if (C.enemyWeak) d = Math.max(1, d - 2);
  d = Math.max(1, d - 1);                     // 同伴久经沙场，自带基础护甲
  if (C.guard) d = Math.max(1, Math.round(d * 0.35));
  const who = ALLY_DEF[id].short;
  logLine(`${u.name}转向${who}，以【${m ? m.name : '攻击'}】击中！（${d} 点伤害${C.guard ? '，护盾挡下大半' : ''}）`, 'hurt');
  S.team[id].hp -= d;
  if (S.team[id].hp <= 0) { S.team[id].hp = 0; logLine(`${who}眼前一黑，昏厥倒下！`, 'hurt'); }
  return d;
}
/* 敌人选择目标：70% 主角，30% 存活同伴 */
function pickVictim() {
  ensureTeam();
  const allies = Object.keys(S.team).filter(id => S.team[id].hp > 0);
  if (allies.length && Math.random() < 0.3) return allies[rnd(allies.length)];
  return null;
}

/* ---------- 意图 ---------- */
function pickMove(u) {
  const moves = (u.moves && u.moves.length) ? u.moves : [{ name: '攻击', type: 'atk' }];
  const avail = moves.filter(m => !(u.cd[m.name] > 0));
  const bag = [];
  for (const m of avail) { const w = m.weight || 1; for (let i = 0; i < w; i++) bag.push(m); }
  const m = bag.length ? bag[rnd(bag.length)] : { name: '攻击', type: 'atk' };
  if (m.cd) u.cd[m.name] = m.cd;
  if (m.type === 'shield') u.shield += m.amount || 5;   // 护盾在预告时就位，挡住本回合伤害
  if (m.type === 'evade') u.evade = true;               // 雾遁同上：本回合物理攻击落空
  if (m.type === 'buff') C.enemyBuff = 2;
  return m;
}
function declareIntents() {
  const parts = livingEnemies().map(u => {
    const m = u.next || {};
    const hint = MOVE_HINT[m.type] ? `（${MOVE_HINT[m.type]}）` : '';
    return `${u.name} → 【${m.name}】${hint}`;
  });
  logLine('⚠ 意图 ｜ ' + parts.join(' ｜ '), 'evil');
}
function checkRage() {
  for (const u of C.units) {
    if (u.hp > 0 && u.rageAt && !u.raged && u.hp <= u.rageAt) {
      u.raged = true;
      if (u.rageText) logLine(u.rageText, 'evil');
    }
  }
}

/* ---------- 玩家回合 ---------- */
async function playerPhase() {
  for (;;) {
    const acts = [];
    for (const sk of Object.values(SKILLS)) {
      if (sk.by) continue;                                  // 同伴技能由 AI 施展
      if (sk.reqFlag && !S.flags[sk.reqFlag]) continue;
      if (sk.lv && S.level < sk.lv) continue;
      acts.push({
        text: `${sk.icon} ${sk.name}${sk.cost ? '（✦' + sk.cost + '）' : ''}${sk.all ? '（全体）' : ''}`,
        req: () => S.sp >= sk.cost, lock: '斗气不足',
        run: async () => {
          let target = null;
          if (!sk.all && (sk.kind === 'atk' || sk.kind === 'magic')) {
            const living = livingEnemies();
            if (living.length > 1) {
              const ti = await choose(living.map(u => ({
                text: `🎯 攻击 ${u.name}（${u.hp}/${u.max}${u.shield ? ' 🛡' + u.shield : ''}${u.evade ? ' 🌫物免' : ''}）`,
                run: async () => {},
              })));
              target = living[ti] || living[0];
            } else target = living[0];
          }
          doSkill(sk, target);
        },
      });
    }
    acts.push({ text: '🛡 防御（本次受伤大减，斗气 +1）', run: () => {
      C.guard = true;
      S.sp = Math.min(S.spMax, S.sp + 1);
      logLine('你收剑蓄势，护住要害。（斗气 +1）', 'good');
    } });
    for (const [hid, hv] of Object.entries(HEALS)) {
      if ((S.items[hid] || 0) > 0) acts.push({ text: `${ITEMS[hid].icon} ${ITEMS[hid].name} · 回复${hv}（余 ${S.items[hid]}）`, run: () => doPotion(hid) });
    }
    // 濒死牺牲：仅限终部决战（en.sacrifice）——以命铸封印，直接终结战斗
    if (C.en.sacrifice && S.hp > 0 && S.hp <= Math.max(8, Math.round(S.maxHp * 0.25))) {
      acts.push({ text: '🕯 以命铸封印（把晨曦之痕当作祭品……终结此战）', run: async () => {
        const ok = await choose([
          { text: '还没到那一步。继续战斗', run: () => {} },
          { text: '——以我之名，铸此封印。（以此命换封印，见证另一种结局）', run: () => { C.ended = 'sacrifice'; } },
        ]);
        return ok === 1 ? undefined : false;
      } });
    }
    if (!C.en.noFlee) acts.push({ text: '🏃 逃离战斗', run: () => doFlee() });
    acts.push({ text: `⚖ 同伴态势：${STANCE[S.stance || 'balanced']}（切换，不耗回合）`, stance: true, run: async () => {} });

    const pick = await choose(acts);
    const a = acts[pick];
    if (!a) continue;
    if (a.stance) {
      S.stance = STANCE_ORDER[(STANCE_ORDER.indexOf(S.stance || 'balanced') + 1) % STANCE_ORDER.length];
      showToast(`同伴态势 → ${STANCE[S.stance]}`);
      renderCombat();
      continue;
    }
    if (await a.run() === false) continue;
    break;
  }
}

function doSkill(sk, target) {
  S.sp -= sk.cost;
  if (sk.kind === 'atk' || sk.kind === 'magic') {
    const targets = sk.all ? livingEnemies() : [target || weakestEnemy()].filter(Boolean);
    for (const u of targets) hitEnemy(u, playerAtkBase() * (sk.power || 1), { kind: sk.kind, skill: sk.name });
  } else if (sk.kind === 'guard') {
    C.guard = true;
    logLine('你摆出防御架势，稳稳守住阵脚。（本次受伤大减）', 'good');
  } else if (sk.kind === 'heal') {
    healUnit(target || worstWounded(), sk.heal || 10, S.name, sk.name);
  } else if (sk.kind === 'debuff') {
    C.enemyWeak = 2;
    logLine(`你发出【${sk.name}】！敌众的攻势明显畏缩。（全体敌人伤害 -2，持续2回合）`, 'good');
  } else if (sk.kind === 'buff') {
    C.atkUp = 3;
    logLine(`你发出【${sk.name}】！众人士气大振。（我方伤害 +2，持续2回合）`, 'good');
  }
  updateHUD(); renderCombat();
}

/* ---------- 同伴回合（态势 AI） ---------- */
function allyCast(id, skillId, target) {
  const t = S.team[id], sk = SKILLS[skillId];
  t.sp -= sk.cost;
  const actor = ALLY_DEF[id].short;
  if (sk.kind === 'atk' || sk.kind === 'magic') {
    hitEnemy(target || weakestEnemy(), allyAtkBase(id) * (sk.power || 1), { kind: sk.kind, skill: sk.name, actor });
  } else if (sk.kind === 'guard') {
    C.guard = true;
    if (C.poison) { C.poison = null; logLine('星辉净化了毒素！', 'good'); }
    if (sk.heal) { const u = worstWounded(); if (u) healUnit(u, sk.heal, actor, sk.name); }
    logLine(`${actor}展开【${sk.name}】，结界护住全队！（本次受伤大减）`, 'good');
  } else if (sk.kind === 'heal') {
    healUnit(worstWounded() || { id: 'player', name: S.name }, sk.heal || 12, actor, sk.name);
  } else if (sk.kind === 'buff') {
    C.atkUp = 3;
    logLine(`${actor}发出【${sk.name}】！众人士气大振。（我方伤害 +2，持续2回合）`, 'good');
  }
  renderCombat();
}

function allyAct(id, t) {
  const heavyComing = livingEnemies().some(u => u.next && (u.next.type === 'heavy' || u.next.type === 'stun'));
  const selfRatio = t.hp / allyMaxHp(id);
  const defensive = selfRatio < 0.35 && S.stance !== 'aggressive';   // 自保：残血转防御，不当靶子硬拼
  if (id === 'kaya') {
    if (livingEnemies().length > 1 && t.sp >= SKILLS.tidecircle.cost) return allyCast(id, 'tidecircle');
    if (S.stance !== 'guard' && !defensive && t.sp >= SKILLS.whalelash.cost) return allyCast(id, 'whalelash');
    if (t.sp >= SKILLS.harpoon.cost) return allyCast(id, 'harpoon');
    hitEnemy(weakestEnemy(), allyAtkBase(id) * 0.8, { kind: 'atk', skill: '掷叉', actor: '卡雅' });
    return;
  }
  if (id === 'aria') {
    const w = worstWounded();
    const healAt = S.stance === 'aggressive' ? 0.3 : 0.45;
    if (w && w.hp / w.max < healAt && t.sp >= SKILLS.starheal.cost) return allyCast(id, 'starheal', w);
    if ((heavyComing || defensive) && t.sp >= SKILLS.starshield.cost) return allyCast(id, 'starshield');
    if (t.sp >= SKILLS.starfire.cost) return allyCast(id, 'starfire');
    hitEnemy(weakestEnemy(), allyAtkBase(id) * 0.8, { kind: 'magic', skill: '星火微芒', actor: '艾莉娅' });
  } else {
    if ((heavyComing || defensive) && S.stance !== 'aggressive' && t.sp >= SKILLS.ironwall.cost) return allyCast(id, 'ironwall');
    if (!C.atkUp && S.stance !== 'guard' && t.sp >= SKILLS.warcry.cost) return allyCast(id, 'warcry');
    if (t.sp >= SKILLS.whirl.cost) return allyCast(id, 'whirl');
    hitEnemy(weakestEnemy(), allyAtkBase(id) * 0.8, { kind: 'atk', skill: '劈砍', actor: '索恩' });
  }
}
async function allyPhase() {
  ensureTeam();
  for (const id of PARTY_IDS) {
    const t = S.team[id];
    if (!t || t.hp <= 0) continue;
    allyAct(id, t);
    if (C.ended || !livingEnemies().length) return;
    renderCombat();
  }
}

/* ---------- 敌方回合 ---------- */
async function enemyPhase() {
  for (const u of C.units) {
    if (u.hp <= 0) continue;
    const m = u.next || { name: '攻击', type: 'atk' };
    const roll = u.dmg[0] + rnd(u.dmg[1] - u.dmg[0] + 1) + (u.raged ? 2 : 0) + (C.enemyBuff > 0 ? 2 : 0);
    if (m.type === 'shield') { logLine(`${u.name}${m.text || `凝聚起护盾`}（🛡 ${u.shield}）`, 'evil'); continue; }
    if (m.type === 'buff') { logLine(`${u.name}${m.text || `发出【${m.name}】`}，敌众士气大振！（其伤害 +2）`, 'evil'); continue; }
    const victim = pickVictim();   // null=主角，否则为同伴 id
    if (m.type === 'poison') {
      if (victim) hitAlly(victim, roll * (m.mult || 1), u, m);
      else {
        hitPlayer(roll * (m.mult || 1), u, m);
        C.poison = { turns: 3, dmg: 1 };
        logLine('伤口泛起紫黑色——你中毒了！', 'hurt');
      }
    } else if (m.type === 'stun') {
      if (victim) hitAlly(victim, roll * 0.6, u, m);
      else {
        hitPlayer(roll * 0.6, u, m);
        if (Math.random() < (m.chance || 0.35)) { C.playerStun = true; logLine('星光锁链缠住了你的手脚——下一回合你无法行动！', 'hurt'); }
      }
    } else if (m.type === 'drain') {
      const dealt = victim ? hitAlly(victim, roll * 0.9, u, m) : hitPlayer(roll * 0.9, u, m);
      u.hp = Math.min(u.max, u.hp + Math.ceil(dealt / 2));
      logLine(`${u.name}汲取着${victim ? ALLY_DEF[victim].short : '你'}的生命，伤势在缓缓复原。`, 'hurt');
    } else if (m.type === 'evade') {
      logLine(`${u.name}的身形散入雾中——本回合物理攻击难以命中它！（魔法仍有效）`);
      if (victim) hitAlly(victim, roll * 0.5, u, m);
      else hitPlayer(roll * 0.5, u, m);
    } else if (m.type === 'heavy') {
      if (victim) hitAlly(victim, roll * (m.mult || 1.5), u, m);
      else hitPlayer(roll * (m.mult || 1.5), u, m);
    } else {
      if (victim) hitAlly(victim, roll, u, m);
      else hitPlayer(roll, u, m);
    }
    if (S.hp <= 0) return;
  }
}

/* ---------- 回合结算 ---------- */
function endOfRound() {
  S.sp = Math.min(S.spMax, S.sp + 2);
  ensureTeam();
  for (const id of Object.keys(S.team)) {
    const t = S.team[id];
    if (t.hp > 0) t.sp = Math.min(allySpMax(id), t.sp + 1);
  }
  if (C.enemyWeak) C.enemyWeak--;
  if (C.atkUp) C.atkUp--;
  if (C.enemyBuff) C.enemyBuff--;
  if (C.poison) {
    C.poison.turns--;
    S.hp -= C.poison.dmg;
    logLine(`毒素侵蚀着伤口。（生命 -${C.poison.dmg}）`, 'hurt');
    if (C.poison.turns <= 0) { C.poison = null; logLine('毒素终于消散。', 'good'); }
  }
  C.guard = false;
  for (const u of C.units) {
    u.evade = false;
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k]--;
  }
}

/* ---------- 战斗主循环 ---------- */
async function battle(enId, opts = {}) {
  const en = ENEMIES[enId];
  if (!en) { console.error('[缺失敌人]', enId); return 'win'; }
  ensureTeam();
  C = {
    en, units: buildUnits(en),
    guard: false, enemyWeak: 0, atkUp: 0, enemyBuff: 0,
    poison: null, playerStun: false,
    ambush: !!opts.bonus, ended: null,
  };
  mode = 'combat';
  $('#enemy-strip').classList.remove('hidden');
  $('#cmd-exits').innerHTML = '';
  $('#cmd-actions').innerHTML = '';
  renderCombat();
  logLine('⚔ 遭遇 —— ' + C.units.map(u => u.name).join('、'), 'evil');
  if (en.intro) logLine(en.intro, 'evil');
  if (S.corruption > 0) {
    const d = Math.min(S.corruption, S.hp - 1);
    if (d > 0) {
      S.hp -= d;
      logLine(`行囊深处的黑石轻轻搏动——深渊之力灌进你的手臂，同时啃噬着你的血肉。（生命 -${d}，攻击 +${S.corruption}）`, 'hurt');
    }
  }

  let result = null;
  while (true) {
    // 意图宣告
    for (const u of C.units) if (u.hp > 0) u.next = pickMove(u);
    declareIntents();
    // 玩家回合
    if (C.playerStun) {
      C.playerStun = false;
      logLine('锁链的余波缠着你的手脚——这一回合你无法行动！', 'hurt');
    } else {
      await playerPhase();
    }
    if (C.ended) { result = C.ended; break; }
    if (!livingEnemies().length) { result = 'win'; break; }
    checkRage();
    // 同伴回合
    await allyPhase();
    if (C.ended) { result = C.ended; break; }
    if (!livingEnemies().length) { result = 'win'; break; }
    checkRage();
    // 敌方回合
    if (C.ambush) {
      C.ambush = false;
      logLine('⚑ 先手！敌人措手不及，这一回合来不及还手！', 'good');
    } else {
      await enemyPhase();
      if (S.hp <= 0 && en.loseText) { result = 'lose'; break; }
      if (S.hp <= 0) {
        if ((S.items.amulet || 0) > 0) {
          take('amulet');
          S.hp = 8;
          logLine('✨ 星光护符碎裂！一股暖流将你从死亡边缘拉回！（生命 +8）', 'good');
        } else {
          S.hp = 0; updateHUD();
          await deathSeq(en);
          result = 'dead'; break;
        }
      }
    }
    // 回合结算
    endOfRound();
    updateHUD(); renderCombat();
    if (S.hp <= 0) {
      if ((S.items.amulet || 0) > 0) {
        take('amulet'); S.hp = 8;
        logLine('✨ 星光护符碎裂！暖流将你拉回！（生命 +8）', 'good');
      } else {
        S.hp = 0; updateHUD();
        await deathSeq(en);
        result = 'dead'; break;
      }
    }
  }

  if (result === 'win') {
    logLine('🎉 ' + (en.win || en.name + '倒下了！'), 'good');
    S.kills = S.kills || {};
    S.kills[enId] = (S.kills[enId] || 0) + 1;   // 讨伐委托计数
    await gainExp(en.exp || 10);
    if (en.gold) {
      S.gold += en.gold;
      logLine(`你从${en.name}身上搜出 ${en.gold} 枚金币。`, 'sys');
      showToast(`金币 +${en.gold}`);
    }
    S.sp = Math.min(S.spMax, S.sp + 2);
  }
  if (result === 'win' || result === 'fled') {
    ensureTeam();
    for (const id of Object.keys(S.team)) {
      const t = S.team[id];
      if (t.hp <= 0) {
        t.hp = Math.max(1, Math.floor(allyMaxHp(id) * 0.2));
        logLine(`${ALLY_DEF[id].short}缓过一口气，重新站了起来。（生命 +${t.hp}）`, 'sys');
      }
    }
  }
  C = null;
  mode = 'explore';
  $('#enemy-strip').classList.add('hidden');
  updateHUD(); updateSidebar();
  if (result === 'fled') {
    await say(['你抓住破绽，脱身而去！']);
    await move(opts.fleeTo || S.prevLoc || S.loc);
  }
  return result;
}

/* 智能用药：优先救醒昏厥的同伴，其次最虚弱的单位（战斗/行囊通用） */
function doPotion(id = 'potion') {
  if ((S.items[id] || 0) <= 0) return false;
  ensureTeam();
  const hv = HEALS[id] || 10;
  const units = [{ id: 'player', name: S.name, hp: S.hp, max: S.maxHp }];
  for (const k of Object.keys(S.team)) units.push({ id: k, name: ALLY_DEF[k].short, hp: S.team[k].hp, max: allyMaxHp(k) });
  const ko = units.find(u => u.hp <= 0);
  const hurt = units.filter(u => u.hp > 0 && u.hp < u.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
  const t = ko || hurt[0];
  if (!t) { showToast('众人的状态都很好', true); return false; }
  take(id);
  const healed = Math.min(hv, t.max - t.hp);
  if (t.id === 'player') S.hp += healed;
  else S.team[t.id].hp += healed;
  logLine(`${t.name}灌下${ITEMS[id].name}${ko ? '，从昏厥中悠悠转醒' : '，暖流淌过伤口'}。（生命 +${healed}）`, 'good');
  showToast(`${t.name} 生命 +${healed}`);
  updateHUD(); updateSidebar();
  if (C) renderCombat();
  return true;
}

async function doFlee() {
  if (Math.random() < 0.6) { C.ended = 'fled'; return; }
  logLine('逃跑失败！敌人挡住了去路！', 'hurt');
}

/* ---------- 战斗面板渲染 ---------- */
function renderCombat() {
  if (!C) return;
  const list = $('#enemy-list');
  let html = '';
  for (const u of C.units) {
    const pct = Math.max(0, (u.hp / u.max) * 100);
    const tags = [];
    if (u.shield > 0) tags.push(`🛡${u.shield}`);
    if (u.evade) tags.push('🌫物免');
    if (u.raged) tags.push('🔥狂怒');
    html += `<div class="enemy-row${u.hp <= 0 ? ' dead' : ''}">
      <img src="${u.char || ''}" alt="">
      <div class="e-info">
        <div class="e-name">${u.name}${tags.length ? '<span class="e-tags">' + tags.join(' ') + '</span>' : ''}</div>
        <div class="bar"><div class="bar-fill enemy" style="width:${pct}%"></div></div>
      </div></div>`;
  }
  list.innerHTML = html;
  ensureTeam();
  let allies = '';
  for (const id of PARTY_IDS) {
    const t = S.team && S.team[id];
    if (!S.flags[id] || !t) continue;
    allies += `<span class="ally-chip${t.hp <= 0 ? ' ko' : ''}">${ALLY_DEF[id].short} ${t.hp <= 0 ? '💤 昏厥' : `❤${t.hp}/${allyMaxHp(id)} ✦${t.sp}/${allySpMax(id)}`}</span>`;
  }
  $('#ally-strip').innerHTML = allies;
  $('#enemy-intent').textContent = `⚖ 同伴态势：${STANCE[S.stance || 'balanced']}（指令栏可切换）`;
  const st = [];
  if (C.enemyWeak) st.push(`敌胆寒↓2（${C.enemyWeak}）`);
  if (C.atkUp) st.push(`我方士气↑2（${C.atkUp}）`);
  if (C.enemyBuff) st.push(`敌势↑2（${C.enemyBuff}）`);
  if (C.poison) st.push('⛔ 中毒');
  $('#esp-line').textContent = `✦ 你的斗气 ${S.sp}/${S.spMax}` + (st.length ? ' ｜ ' + st.join(' ｜ ') : '');
}

async function deathSeq(en) {
  C = null;
  mode = 'explore';
  $('#enemy-strip').classList.add('hidden');
  if (en.death) await say(en.death, { cls: 'deathline' });
  if (!S.snap) { S.hp = S.maxHp; S.sp = S.spMax; await enterLoc('grayridge_gate', { respawn: true }); return; }
  const snap = JSON.parse(S.snap);
  Object.keys(snap).forEach(k => S[k] = snap[k]);
  S.hp = S.maxHp; S.sp = S.spMax;
  logLine('—— 你在命运的安排下重新醒来。', 'sys');
  await enterLoc(S.checkpoint || S.loc, { respawn: true, first: false });
  showToast('命运让你重来了');
}

/* ================= 结局 ================= */
async function ending(id, name, en, paras) {
  setFlag('gameClear');
  quest('q_done');
  await say(paras);
  logLine(`—— 「${name}」 ${en} ——`, 'endbanner');
  const isNew = addEnding(id);
  logLine(`冒险者：${S.name} ｜ 等级：Lv.${S.level} ｜ 金币：${S.gold} ｜ 声望：${S.rep} ｜ 侵蚀：${S.corruption}`, 'sys');
  logLine(`结局收集：${getEndings().length} / ${ENDINGS.length}${isNew ? '　✦ 新结局解锁！' : ''}`, 'sys');
  saveGame();
  openModal(`<h2 class="lore-title">— ${name} —</h2>
    <p class="panel-note" style="text-align:center;letter-spacing:3px;">${en}</p>
    <p style="text-align:center;">结局收集 ${getEndings().length} / ${ENDINGS.length}${isNew ? '　✦ 新结局！' : ''}</p>`, [
    { text: '留在艾尔多兰，继续行走', fn: () => { showToast('你可以继续在世界中行走'); } },
    { text: '回到标题', primary: true, fn: () => { saveGame(); showTitle(); } },
  ]);
}

/* 章节收尾：录入结局收集并打出收尾横幅，但不结束冒险——剧情随即接续下一部 */
async function chapterEnd(id, name, en, paras) {
  await say(paras);
  logLine(`—— 「${name}」 ${en} ——`, 'endbanner');
  addEnding(id);
  showToast(`✦ 章节收尾「${name}」已收录（结局收集 ${getEndings().length}/${ENDINGS.length}）`);
  logLine(`结局收集：${getEndings().length} / ${ENDINGS.length}`, 'sys');
}

/* ================= 界面切换 ================= */
function showTitle() {
  mode = 'title';
  $('#game-screen').classList.add('hidden');
  $('#title-screen').classList.remove('hidden');
  refreshTitle();
}

function startNewGame(name) {
  S = defaultState();
  if (name) S.name = name;
  C = null; lastCh = ''; lastSub = '';
  $('#log').innerHTML = '';
  $('#title-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');
  mode = 'explore';
  S.visits.grayridge_gate = 1;
  enterLoc('grayridge_gate', { first: true });
  saveGame();
}

function continueGame() {
  const d = loadGame();
  if (!d) { showToast('没有找到存档', true); return; }
  S = Object.assign(defaultState(), d);
  S.boons = Object.assign({ vit: 0, spi: 0, atk: 0, partyHp: 0, partySp: 0 }, S.boons || {});
  ensureTeam();                     // 旧存档迁移：按已入队旗帜补建同伴战斗单位
  if (S.flags.gameClear && !S.flags.part2) {   // 旧版通关存档迁移：第二部收尾视作已录，接续第三部
    S.flags.part2 = true;
    S.quest = 'q_tide';
  }
  C = null; lastCh = ''; lastSub = '';
  $('#log').innerHTML = '';
  $('#title-screen').classList.add('hidden');
  $('#game-screen').classList.remove('hidden');
  mode = 'explore';
  logLine('—— 冒险继续 ——', 'divider');
  enterLoc(S.loc || 'grayridge_gate', { first: false, respawn: true });
}

function refreshTitle() {
  $('#btn-continue').classList.toggle('hidden', !hasSave());
  const list = getEndings();
  const parts = ENDINGS.map(e => list.includes(e.id) ? e.icon : '？');
  $('#ending-badges').textContent = parts.length
    ? `结局收集 ${list.length} / ${ENDINGS.length}　${parts.join(' ')}`
    : '';
}

/* ================= 设定集 ================= */
function openLore() {
  openModal($('#tpl-lore').innerHTML, [{ text: '合上书卷', primary: true }]);
}

/* ================= 世界地图总览 =================
 * 按章节/小节列出全部地点：去过的点亮，没去的以雾（？？？）遮蔽。 */
function openMap() {
  if (!S) return;
  const chapters = [];
  const byCh = {};
  for (const [id, loc] of Object.entries(WORLD)) {
    const ch = loc.ch || '未知之地';
    if (!byCh[ch]) { byCh[ch] = {}; chapters.push(ch); }
    const sub = loc.sub || '';
    (byCh[ch][sub] = byCh[ch][sub] || []).push({ id, name: loc.name });
  }
  let visited = 0, total = 0;
  let html = '<h2 class="lore-title">🗺 艾尔多兰 · 行记图</h2>';
  for (const ch of chapters) {
    html += `<h3 class="map-ch">${ch}</h3>`;
    for (const [sub, locs] of Object.entries(byCh[ch])) {
      if (sub) html += `<div class="map-sub">◈ ${sub}</div>`;
      html += '<div class="map-locs">';
      for (const l of locs) {
        total++;
        const seen = (S.visits[l.id] || 0) > 0;
        if (seen) visited++;
        html += `<span class="map-loc${seen ? '' : ' unknown'}${l.id === S.loc ? ' current' : ''}">${seen ? l.name : '？？？'}</span>`;
      }
      html += '</div>';
    }
  }
  html += `<p class="panel-note">已踏足 ${visited} / ${total} 处。地图只点亮你走过的路——离群的村道、塌檐的地窖、雾里的旧祠，总有你没去过的角落。</p>`;
  openModal(html, [{ text: '合上地图', primary: true }]);
}

/* ================= 提示 ================= */
function showToast(text, bad) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = text;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ================= 剧情自检 ================= */
function validateWorld() {
  const missing = new Set();
  for (const [id, loc] of Object.entries(WORLD)) {
    for (const [d, ex] of exitsOf(loc)) if (!WORLD[ex.to]) missing.add(`${id} -${d}-> ${ex.to}`);
    (loc.actions || []).forEach(() => {});
  }
  for (const en of Object.values(ENEMIES)) if (en.char === undefined) missing.add('敌人缺立绘');
  if (missing.size) console.warn('[世界自检] 缺失：', [...missing]);
  else console.info('[世界自检] 地点与去路完整 ✔');
}

/* ================= 初始化 ================= */
function init() {
  validateWorld();
  $('#btn-new').addEventListener('click', () => {
    const doNew = () => {
      openModal(`<h2 class="lore-title">刻下你的名字</h2>
        <div class="name-row"><input id="name-input" maxlength="10" placeholder="为自己的传奇命名……" autocomplete="off"></div>`, [
        { text: '启 程', primary: true, fn: () => {
          const v = $('#name-input') ? $('#name-input').value.trim() : '';
          startNewGame(v || '无名旅者');
        } },
      ]);
      setTimeout(() => { const el = $('#name-input'); if (el) el.focus(); }, 50);
    };
    if (hasSave()) {
      openModal('开始新冒险将覆盖上一次的进度。<br>确定要启程吗？', [
        { text: '确定启程', primary: true, fn: doNew },
        { text: '取消' },
      ]);
    } else doNew();
  });
  $('#btn-continue').addEventListener('click', continueGame);
  $('#btn-lore').addEventListener('click', openLore);
  $('#btn-lore2').addEventListener('click', openLore);
  $('#btn-save').addEventListener('click', () => { saveGame(); showToast('进度已保存'); });
  $('#btn-title').addEventListener('click', () => {
    if (busy || C) { showToast('事件进行中，暂不能离开', true); return; }
    saveGame(); showTitle();
  });
  $('#btn-bag').addEventListener('click', openBag);
  $('#btn-skills').addEventListener('click', openSkills);
  $('#btn-char').addEventListener('click', openChar);
  $('#btn-map').addEventListener('click', openMap);
  $('#modal-root').addEventListener('click', e => { if (e.target.id === 'modal-root') closeModal(); });

  // 快捷键：B 背包 / K 技能 / C 角色 / M 地图 / Esc 关闭 / 空格跳过打字
  window.addEventListener('keydown', e => {
    if (mode === 'title') return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT') return;
    if (e.key === 'Escape') { closeModal(); return; }
    if ($('#modal-root').classList.contains('hidden')) {
      const k = e.key.toLowerCase();
      if (k === 'b') openBag();
      else if (k === 'k') openSkills();
      else if (k === 'c') openChar();
      else if (k === 'm') openMap();
    }
    if ((e.key === ' ' || e.key === 'Enter') && typing) { typeSkip = true; e.preventDefault(); }
  });

  showTitle();
}

document.addEventListener('DOMContentLoaded', init);
