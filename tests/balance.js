/* ============================================================
 * 战斗平衡模拟器（无浏览器）
 * 运行：node tests/balance.js
 * 复用 smoke.js 的 DOM 桩载入游戏代码，以「自动战斗策略」把各章节
 * 关键战斗各模拟 N 场，输出胜率 / 败死率 / 药水消耗 / 收官血量，
 * 供战斗 v2 数值调参参考。改数值后请重跑本文件 + smoke.js。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------- DOM / 浏览器桩（与 smoke.js 相同） ---------- */
function makeEl() {
  return {
    innerHTML: '', textContent: '', className: '', disabled: false, value: '',
    dataset: {}, children: [],
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); },
    remove() {},
    addEventListener() {},
    querySelectorAll: () => [],
    focus() {},
    get scrollTop() { return 0; }, set scrollTop(v) {},
    get scrollHeight() { return 0; },
  };
}
const els = {};
global.document = {
  hidden: true,
  activeElement: null,
  querySelector: sel => (els[sel] = els[sel] || makeEl()),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {},
};
global.window = { addEventListener() {} };
global.location = { search: '' };
global.localStorage = (() => {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
})();

/* ---------- 载入游戏代码 ----------
 * S/C/mode 是 eval 内的词法绑定，外部摸不到——在拼接代码末尾加桥接暴露 */
const code = [
  fs.readFileSync(path.join(__dirname, '../js/world.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8'),
  ';globalThis.__sim = { getS: () => S, setS: v => { S = v; }, getC: () => C, setMode: v => { mode = v; } };',
].join('\n;\n').replace(/'use strict';/g, '');
(0, eval)(code);
const sim = globalThis.__sim;
let S;   // 引擎当前状态对象的本地别名（同一引用，读写互通）

/* ---------- 死亡短路：不触发存档回滚，只计数 ---------- */
let simDeaths = 0;
deathSeq = async () => { simDeaths++; };

/* ---------- 自动战斗策略 ----------
 * normal  ：残血喝药；敌方预告重击且自身过半血以下时防御；平时强攻
 * berserk ：无脑强袭斩（压力测试下限） */
let policy = 'normal';
choose = async opts => {
  const usable = opts.map((o, i) => ({ o, i })).filter(({ o }) => (!o.when || o.when()) && (!o.req || o.req(S)));
  if (!usable.length) return -1;
  const text = u => String(u.o.text);
  const tgt = usable.find(u => text(u).startsWith('🎯'));            // 目标选择：打第一个（最虚弱的排前）
  if (tgt) return tgt.i;
  if (usable.some(u => text(u).includes('强化 ·'))) return usable[Math.floor(Math.random() * usable.length)].i;  // 升级强化随机选
  const pick = pred => { const u = usable.find(pred); return u ? u.i : null; };
  if (policy === 'berserk') return pick(u => text(u).includes('强袭斩')) ?? pick(u => text(u).includes('挥剑')) ?? usable[0].i;
  const pot = usable.find(u => text(u).includes('生命药水'));
  if (pot && S.hp < S.maxHp * 0.4) return pot.i;
  const c = sim.getC();
  const enemyHeavy = c && c.units.some(u => u.hp > 0 && u.next && (u.next.type === 'heavy' || u.next.type === 'stun'));
  const guard = usable.find(u => text(u).startsWith('🛡 防御'));
  if (guard && enemyHeavy && S.hp < S.maxHp * 0.5) return guard.i;
  return pick(u => text(u).includes('强袭斩')) ?? pick(u => text(u).includes('挥剑')) ?? usable[0].i;
};

/* ---------- 场景 ---------- */
const SCENARIOS = [
  { key: '序章·夜袭刺客', en: 'assassin', n: 400,
    setup: s => { s.level = 1; s.maxHp = 20; s.hp = 20; s.sp = 10; s.spMax = 10; s.items.potion = 1; } },
  { key: '森林·哥布林小队(独行)', en: 'goblin', n: 400,
    setup: s => { s.level = 2; s.maxHp = 27; s.hp = 27; s.sp = 12; s.spMax = 12; s.items.potion = 1; } },
  { key: '圣殿·影蚀斥候(带艾莉娅)', en: 'scout', n: 400,
    setup: s => { s.level = 4; s.maxHp = 40; s.hp = 40; s.sp = 16; s.spMax = 16; s.flags.aria = true; s.items.potion = 2; } },
  { key: '隘口·红巾匪首(双人)', en: 'bandit', n: 400,
    setup: s => { s.level = 5; s.maxHp = 48; s.hp = 48; s.sp = 18; s.spMax = 18; s.flags.aria = true; s.items.potion = 2; s.equip.weapon = 'iron_sword'; s.equip.armor = 'leather_armor'; } },
  { key: '星塔·影蚀领主(满编)', en: 'starlord', n: 400,
    setup: s => { s.level = 7; s.maxHp = 68; s.hp = 68; s.sp = 24; s.spMax = 24; s.flags.aria = true; s.flags.thorne = true; s.items.potion = 2; s.items.potion_big = 1; s.equip.weapon = 'bandit_blade'; s.equip.armor = 'guard_mail'; s.equip.accessory = 'star_pendant'; } },
  { key: '灯塔·深潜者游群(满编)', en: 'deeponpack', n: 400,
    setup: s => { s.level = 8; s.maxHp = 74; s.hp = 74; s.sp = 26; s.spMax = 26; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.equip.weapon = 'rite_blade'; s.equip.armor = 'guard_mail'; s.equip.accessory = 'star_pendant'; } },
  { key: '海底·影蚀潮祭司(满编)', en: 'tidesage', n: 400,
    setup: s => { s.level = 9; s.maxHp = 80; s.hp = 80; s.sp = 28; s.spMax = 28; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.items.potion_big = 1; s.equip.weapon = 'whale_lance'; s.equip.armor = 'guard_mail'; s.equip.accessory = 'tide_pearl'; } },
  { key: '祭坛·腐穗巨灵(满编)', en: 'harvestgiant', n: 400,
    setup: s => { s.level = 10; s.maxHp = 88; s.hp = 88; s.sp = 30; s.spMax = 30; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.items.potion_big = 2; s.equip.weapon = 'whale_lance'; s.equip.armor = 'vine_mail'; s.equip.accessory = 'harvest_charm'; } },
  { key: '古战场·影蚀战将(满编)', en: 'wargeneral', n: 400,
    setup: s => { s.level = 11; s.maxHp = 94; s.hp = 94; s.sp = 32; s.spMax = 32; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.items.potion_big = 2; s.equip.weapon = 'war_glaive'; s.equip.armor = 'vine_mail'; s.equip.accessory = 'tide_pearl'; } },
  { key: '钟楼·圣咏者夜祷(满编)', en: 'chantress', n: 400,
    setup: s => { s.level = 12; s.maxHp = 100; s.hp = 100; s.sp = 36; s.spMax = 36; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.items.potion_big = 2; s.equip.weapon = 'war_glaive'; s.equip.armor = 'war_mail'; s.equip.accessory = 'jade_chime'; } },
  { key: '影渊·桥头守将(满编)', en: 'bridgeguard', n: 400,
    setup: s => { s.level = 12; s.maxHp = 100; s.hp = 100; s.sp = 36; s.spMax = 36; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 2; s.items.potion_big = 2; s.equip.weapon = 'war_glaive'; s.equip.armor = 'war_mail'; s.equip.accessory = 'jade_chime'; } },
  { key: '王座·莫格拉斯(满编)', en: 'mograth', n: 400,
    setup: s => { s.level = 13; s.maxHp = 106; s.hp = 106; s.sp = 40; s.spMax = 40; s.flags.aria = true; s.flags.thorne = true; s.flags.kaya = true; s.items.potion = 3; s.items.potion_big = 3; s.equip.weapon = 'war_glaive'; s.equip.armor = 'war_mail'; s.equip.accessory = 'jade_chime'; } },
];

(async () => {
  console.log('战斗 v2 平衡模拟（每场景 ' + SCENARIOS[0].n + ' 场 × 两种策略）\n');
  let fail = false;
  for (const pol of ['normal', 'berserk']) {
    policy = pol;
    console.log(`—— 策略：${pol === 'normal' ? 'normal（喝药/防御/强攻）' : 'berserk（无脑强袭斩）'} ——`);
    console.log('场景'.padEnd(24) + '胜率'.padEnd(9) + '败死'.padEnd(9) + '药耗'.padEnd(9) + '收官血量');
    for (const sc of SCENARIOS) {
      let win = 0, dead = 0, flee = 0, potLeft = 0, hpPct = 0;
      for (let i = 0; i < sc.n; i++) {
        const s = defaultState();
        s.name = '模拟者';
        s.exp = -1000000;                       // 不升级，固定战力
        sc.setup(s);
        sim.setS(s);
        S = s;
        ensureTeam();
        for (const id of Object.keys(S.team)) { S.team[id].hp = allyMaxHp(id); S.team[id].sp = allySpMax(id); }
        const potBefore = (S.items.potion || 0) + (S.items.potion_big || 0);
        const r = await battle(sc.en, {});
        if (r === 'win') win++;
        else if (r === 'dead') dead++;
        else flee++;
        const potAfter = (S.items.potion || 0) + (S.items.potion_big || 0);
        potLeft += potBefore - potAfter;
        hpPct += Math.max(0, S.hp) / S.maxHp * 100;
      }
      const pct = v => (v / sc.n * 100).toFixed(0) + '%';
      console.log(sc.key.padEnd(22) + pct(win).padEnd(9) + pct(dead).padEnd(9) + (potLeft / sc.n).toFixed(1).padEnd(9) + (hpPct / sc.n).toFixed(0) + '%');
      if (pol === 'normal' && (dead / sc.n > 0.35 || win / sc.n < 0.5)) fail = true;
    }
    console.log('');
  }
  console.log('死亡短路次数：' + simDeaths + '（含毒杀）');
  if (fail) { console.error('✗ 平衡不达标：normal 策略下存在胜率 <50% 或败死率 >35% 的场景'); process.exit(1); }
  console.log('★ 平衡模拟通过（normal 策略全场景胜率 ≥50% 且败死率 ≤35%；berserk 仅作压力参考）');
  process.exit(0);
})().catch(err => { console.error('✗ 模拟失败：' + (err && err.stack || err)); process.exit(1); });
