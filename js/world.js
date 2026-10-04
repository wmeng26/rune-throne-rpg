/* ============================================================
 * 符文王座 · 暗影觉醒 — 文字RPG 世界数据
 * 世界 = 地点（可自由来回移动） + 地点事件（剧情/战斗/谜题/商店）
 *
 * 地点字段：
 *   name 名称 / ch 章节 / desc 首次进入叙述 / brief 重访简述
 *   exits { 方向: {to, label, req, lock, flavor} }  方向: n/s/w/e/nw/se/sw/ne/up/down/enter…
 *   npcs  { id: {name, img, role, talk: async()=>{} } }
 *   actions [ {text, when(S), run: async()=>{} } ]  此处可做的事
 *   onEnter async 首次/特定条件下触发的事件
 *   roam { en, chance, intro, fleeTo }  游荡随机遭遇
 *   rest { cost, label }  休息点
 *   wild true 荒野路途：移动抵达时有几率触发 TRAVEL_EVENTS 旅途事件
 * 事件里可用的引擎原语（见 engine.js）：say / choose / fx / battle / move / give / take / setFlag / ev / checkpoint / quest / gainExp
 * ============================================================ */
'use strict';

const BG = 'assets/scenes/';
const CH = 'assets/chars/';

/* ---------------- 物品 ---------------- */
const ITEMS = {
  shard:   { icon: '🔸', name: '晨曦之痕', desc: '塞德里克以性命护住的符文碎片，触手微温。', kind: 'key' },
  map:     { icon: '🗺️', name: '迷雾古图', desc: '泛黄的羊皮纸，标注着符文圣殿的方位。', kind: 'key' },
  potion:  { icon: '🧪', name: '生命药水', desc: '琥珀色的药液，恢复10点生命。', kind: 'use' },
  potion_big: { icon: '🍶', name: '大生命药水', desc: '工匠反复蒸馏的浓浆，恢复25点生命。', kind: 'use' },
  herb:    { icon: '🌿', name: '月光草', desc: '叶背泛着银霜的药草，采药人玛戈正需要它。', kind: 'key' },
  watch:   { icon: '🧭', name: '学徒的怀表', desc: '表盖内侧刻着一行小字：「赠吾徒·艾德温」。', kind: 'key' },
  amulet:  { icon: '✨', name: '星光护符', desc: '濒死时会碎裂，将你从死亡边缘拉回一次。', kind: 'key' },
  warrant: { icon: '📜', name: '女王通行证', desc: '白石城的印信，通行王国全境无阻。', kind: 'key' },
  rune:    { icon: '☀️', name: '晨曦符文', desc: '七印之一，其中燃烧着破晓的光辉。', kind: 'key' },
  runeWeak:{ icon: '🌘', name: '黯淡符文', desc: '未能完全通过试炼，光辉残缺不全。', kind: 'key' },
  rune2:   { icon: '⭐', name: '星辰之印', desc: '七印之二，王室秘藏，流转着夜空的辉光。', kind: 'key' },
  rune3:   { icon: '🌊', name: '海洋之印', desc: '七印之三，潮汐的冠冕，深蓝的光在核心缓缓起伏。', kind: 'key' },
  rune4:   { icon: '🌻', name: '丰收之印', desc: '七印之四，大地的谷穗冠冕，金色的光粒在其中旋转。', kind: 'key' },
  gem:     { icon: '🖤', name: '深渊黑石', desc: '贴着掌心，隐隐有心跳。它会试着跟你说话。', kind: 'key' },
  glowweed:{ icon: '🫧', name: '荧藻', desc: '礁石阴面生长的发光藻类，潮歌灯塔的灯芯以它为引。', kind: 'key' },
  abyss_shell: { icon: '🐚', name: '深渊螺壳', desc: '贴耳去听，里面不是海声，是很低很低的笑。', kind: 'key' },
  tide_edict:  { icon: '📃', name: '影蚀潮令', desc: '「月晦既过，转图第三印。潮起之日，先沉其岸。——上座」', kind: 'key' },
  grain:   { icon: '🌾', name: '祭典谷种', desc: '穗安村丰年祭用的头茬谷种，沉甸甸的一小袋。', kind: 'key' },
  /* ---- 装备（kind:'equip'，slot: weapon|armor|accessory）---- */
  iron_sword:   { icon: '🗡️', name: '铁剑',     desc: '制式铁剑，顺手耐用。攻击 +1。',           kind: 'equip', slot: 'weapon',    atk: 1 },
  bandit_blade: { icon: '🔪', name: '山匪弯刀', desc: '红巾头子的佩刀，刃口有缺。攻击 +2。',     kind: 'equip', slot: 'weapon',    atk: 2 },
  leather_armor:{ icon: '🥼', name: '旅人皮甲', desc: '硝好的皮革护身。受到伤害 -1。',           kind: 'equip', slot: 'armor',     def: 1 },
  guard_mail:   { icon: '🛡️', name: '卫兵锁甲', desc: '白石城卫戍的制式锁甲。受到伤害 -2。',     kind: 'equip', slot: 'armor',     def: 2 },
  star_pendant: { icon: '📿', name: '星辉坠饰', desc: '嵌着碎星石的坠子，微微发暖。生命上限 +6。', kind: 'equip', slot: 'accessory', maxHp: 6 },
  wolf_fang:    { icon: '🦷', name: '狼牙项链', desc: '头狼的獠牙磨成的护身符。会心一击率 +10%。', kind: 'equip', slot: 'accessory', crit: 0.10 },
  old_seal:     { icon: '💠', name: '守殿人印戒', desc: '铁须氏代代相传的旧戒，戒面磨得发亮。生命上限 +4。', kind: 'equip', slot: 'accessory', maxHp: 4 },
  mist_pearl:   { icon: '🔮', name: '雾泽明珠', desc: '湖水磨了百年的珍珠，贴身戴着，心绪莫名安宁。生命上限 +3。', kind: 'equip', slot: 'accessory', maxHp: 3 },
  rite_blade:   { icon: '⚔️', name: '咏祭礼剑', desc: '圣殿仪仗所用的礼剑，剑身刻着颂晨的经文。攻击 +2。', kind: 'equip', slot: 'weapon', atk: 2 },
  whale_lance:  { icon: '🔱', name: '鲸骨长枪', desc: '用老鲸脊骨磨成的猎叉长枪，沉而有劲。攻击 +3。', kind: 'equip', slot: 'weapon', atk: 3 },
  tide_weave:   { icon: '🧥', name: '潮织法衣', desc: '渔家妇女以潮汐线织成的外衣，水汽难侵。受到伤害 -2。', kind: 'equip', slot: 'armor', def: 2 },
  vine_mail:    { icon: '🥬', name: '荆藤战甲', desc: '守穗人以活藤编成的甲衣，藤蔓会自己收紧。受到伤害 -3。', kind: 'equip', slot: 'armor', def: 3 },
  tide_pearl:   { icon: '⚪', name: '深海珍珠', desc: '万顷波涛压出来的圆月。生命上限 +5。', kind: 'equip', slot: 'accessory', maxHp: 5 },
  tide_orb:     { icon: '🔵', name: '潮珠', desc: '永远微凉的一颗潮汐之心，握着它斗气流转不息。斗气上限 +4。', kind: 'equip', slot: 'accessory', spMax: 4 },
  harvest_charm:{ icon: '🧿', name: '麦金护符', desc: '磨得发亮的麦穗金环，穗影里藏着大地的偏心。会心一击率 +8%。', kind: 'equip', slot: 'accessory', crit: 0.08 },
  tower_page:   { icon: '🗒️', name: '机关图志·残页', desc: '《观星台机关图志》的残页，记着星盘刻度的校准之法。', kind: 'key' },
  shadow_note:  { icon: '📓', name: '影蚀手记', desc: '斥候的手记：「晨曦将燃。报于上座：影主之意，先取星辰，后图晨曦。」', kind: 'key' },
};

/* ---------------- 技能 ----------------
 * kind: atk 物理 / magic 魔法(无视护甲，可命中雾遁) / guard 全队减伤 / heal 治疗 / debuff 减敌 / buff 增伤
 * cost 斗气消耗；reqFlag 需要的旗帜（同伴入队/获得符文后解锁）；by 出招者（有 by 的技能由同伴 AI 自动施展）
 * lv 需要主角达到的等级；all 全体攻击；weapon 是否享受武器攻击加成 */
const SKILLS = {
  strike:     { icon: '⚔', name: '挥剑',     cost: 0, kind: 'atk',  power: 1.0,  weapon: true, desc: '稳定的一击' },
  heavy:      { icon: '💥', name: '强袭斩',   cost: 4, kind: 'atk',  power: 1.9,  weapon: true, desc: '全力一击，约1.9倍伤害' },
  whirlslash: { icon: '🌀', name: '回旋斩',   cost: 5, kind: 'atk',  power: 0.75, weapon: true, all: true, lv: 4, desc: '横扫全场敌人（Lv.4 解锁）' },
  taunt:      { icon: '📢', name: '破胆吼',   cost: 3, kind: 'debuff', desc: '震慑全体敌人，其伤害-2，持续2回合' },
  runeb:      { icon: '☀️', name: '符文之刃', cost: 6, kind: 'magic', power: 2.4, weapon: true, reqFlag: 'rune',   desc: '以晨曦符文附剑，圣光一击（无视护甲）' },
  tideb:      { icon: '🌊', name: '潮汐之刃', cost: 8, kind: 'magic', power: 2.7, weapon: true, reqFlag: 'rune3',  desc: '以海洋之印附剑，怒潮一击（无视护甲）' },
  harvestwave:{ icon: '🌾', name: '穗浪千重', cost: 8, kind: 'magic', power: 1.5, weapon: true, all: true, reqFlag: 'rune4', desc: '金色的麦浪横扫全场（无视护甲）' },
  starfire:   { icon: '✨', name: '星火弹',   cost: 4, kind: 'magic', power: 1.5, reqFlag: 'aria',   by: '艾莉娅', desc: '星辉魔法，无视护甲' },
  starshield: { icon: '🛡', name: '星辉庇护', cost: 4, kind: 'guard', heal: 2,     reqFlag: 'aria',   by: '艾莉娅', desc: '星辉结界护住全队，受伤大减、回复2点并驱散毒素' },
  starheal:   { icon: '💚', name: '治愈星雨', cost: 6, kind: 'heal', heal: 14,     reqFlag: 'aria',   by: '艾莉娅', desc: '治愈术，回复14点生命' },
  whirl:      { icon: '🪓', name: '旋风斧',   cost: 4, kind: 'atk',  power: 1.7, reqFlag: 'thorne', by: '索恩', desc: '巨斧横扫，约1.7倍伤害' },
  ironwall:   { icon: '🛡', name: '铁壁',     cost: 3, kind: 'guard',              reqFlag: 'thorne', by: '索恩', desc: '巨盾格挡，全队本次受伤大减' },
  warcry:     { icon: '🔥', name: '战吼',     cost: 3, kind: 'buff',               reqFlag: 'thorne', by: '索恩', desc: '鼓舞士气，我方伤害+2，持续2回合' },
  harpoon:    { icon: '🔱', name: '迅叉连刺', cost: 3, kind: 'atk',  power: 1.6, reqFlag: 'kaya',   by: '卡雅', desc: '鱼叉三连的迅捷突刺' },
  whalelash:  { icon: '🐋', name: '鲸涛斩',   cost: 6, kind: 'atk',  power: 2.1, reqFlag: 'kaya',   by: '卡雅', desc: '仿照鲸尾拍浪的一记重叉' },
  tidecircle: { icon: '🌀', name: '潮环回斩', cost: 6, kind: 'atk',  power: 1.15, all: true, reqFlag: 'kaya', by: '卡雅', desc: '绕敌一圈，叉影成环（全体攻击）' },
};

/* ---------------- 敌人（遭遇制） ----------------
 * 每个敌人是一次「遭遇」：units 为敌方小队（缺省时为顶层字段描述的单体）。
 * 单位字段：name / hp / dmg:[min,max] / def 物理减伤(魔法无视) / moves 动作表 / die 倒下叙述
 * 动作 type：atk 普攻 / heavy 重击(意图预告) / poison 淬毒 / shield 凝盾 / stun 锁链眩晕 /
 *            buff 士气(全体伤害+2) / drain 汲命 / evade 雾遁(物免，魔法仍有效)
 * cd 为动作冷却回合；weight 抽取权重(默认1)；hint 意图提示。
 * 遭遇级字段：exp / gold / noFlee / intro / win / death[] / loseText[] / rageAt(单位) */
const ENEMIES = {
  assassin: {
    name: '影蚀刺客', char: CH + 'assassin.svg',
    hp: 14, dmg: [2, 3], noFlee: true, exp: 10, gold: 5,
    moves: [
      { name: '飞刀', type: 'atk', weight: 2 },
      { name: '淬毒突刺', type: 'poison', mult: 1.3, cd: 3, hint: '淬毒！', text: '短刃直取要害，刃槽里的毒液泛着紫光——【淬毒突刺】！' },
    ],
    intro: '刺客双刃在火光下泛着幽蓝的毒芒——被划伤就会中毒！',
    win: '刺客化作一滩黑水，渗进了地板缝里。你从他的斗篷夹层里抖出几枚沉甸甸的金币。',
    death: [
      '毒刃没入你的胸口，寒意顺着血管蔓延。你听见黑袍人低语：「符文的信标，熄灭了。」',
      '黑暗涌来。但据说，命运偏爱顽固的人——它总愿意再给你一次机会。',
    ],
  },
  wolves: {
    name: '雾林狼群', char: CH + 'wolf.svg',
    exp: 12, gold: 6,
    units: [
      { name: '头狼', hp: 10, dmg: [2, 3],
        moves: [
          { name: '撕咬', type: 'atk', weight: 2 },
          { name: '围咬', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '率群扑上，发动疯狂的【围咬】！' },
        ],
        die: '头狼呜咽着倒下，狼群的阵脚乱了。' },
      { name: '灰狼', hp: 7, dmg: [1, 2], moves: [{ name: '撕咬', type: 'atk' }], die: '灰狼哀鸣着逃进了雾里。' },
    ],
    intro: '头狼率先扑来！狼群呈扇形散开——它们猎杀过许多比你有经验的人。',
    win: '狼群如潮水般散去，消失在雾里。你在苔藓里翻出它们藏食的小坑，有几枚金币。',
    death: [
      '雾漫上来，盖过你的眼睛。远处，仿佛有乌鸦的叫声，像是嘲笑。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  wraith: {
    name: '雾中魅影', char: CH + 'shadowknight.svg',
    hp: 13, dmg: [2, 3], exp: 11, gold: 7,
    moves: [
      { name: '怨啄', type: 'atk', weight: 2 },
      { name: '雾遁', type: 'evade', cd: 3, hint: '物理将落空，魔法仍有效', text: '的身形散入雾中，只剩两点冷光。' },
      { name: '吞影', type: 'heavy', mult: 1.4, cd: 3, hint: '高伤害！', text: '骤然放大，将你整个人吞进阴影——【吞影】！' },
    ],
    intro: '雾气拧成一个模糊的人形，没有脸，只有两点冷光——它大概是这片林子里所有迷路者的怨念。',
    win: '人形散成碎雾，雾心里落下一小把古旧的铜币，像是谁欠了很久的船钱。',
    death: [
      '冷光贴上你的额头，你的体温一寸寸被雾抽走。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  goblin: {
    name: '哥布林掠袭者', char: CH + 'goblin.svg',
    exp: 14, gold: 8, noFlee: true,
    units: [
      { name: '石斧哥布林', hp: 10, dmg: [2, 4],
        moves: [
          { name: '石斧', type: 'atk', weight: 2 },
          { name: '石斧重击', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '高举石斧狠狠劈下——【石斧重击】！' },
        ],
        die: '石斧哥布林怪叫着瘫倒在地。' },
      { name: '投索哥布林', hp: 9, dmg: [1, 3],
        moves: [
          { name: '投索', type: 'atk', weight: 2 },
          { name: '套索绊摔', type: 'heavy', mult: 1.4, cd: 2, hint: '高伤害！', text: '甩出套索绊你一个趔趄——【套索绊摔】！' },
        ],
        die: '投索哥布林抱着脑袋钻进了灌木。' },
    ],
    intro: '哥布林们怪叫着围了上来！',
    win: '最后一只哥布林拖着石斧逃进了雾里。它们抢来的钱袋掉在草地上，哗啦作响。',
    death: [
      '石斧的寒光成为你看到的最后景象。雾林深处，咯咯的笑声渐渐远去。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  thug: {
    name: '山匪喽啰', char: CH + 'bandit.svg',
    hp: 11, dmg: [1, 3], exp: 8, gold: 5,
    moves: [
      { name: '木棒', type: 'atk', weight: 2 },
      { name: '横扫', type: 'heavy', mult: 1.4, cd: 2, hint: '高伤害！', text: '抡起木棒狠狠砸下，发动【横扫】！' },
    ],
    intro: '一个裹着兽皮的汉子从岩石后跳出来，斧头举得比胆子还高！',
    win: '喽啰抱头窜进风雪里，跑得比兔子还快。雪地上留下他逃跑时掉的钱袋。',
    death: [
      '风雪掩住了你的呻吟。山寨的篝火，你终究没能再看到。',
      '——恍惚间，你怀中的符文最后一次发烫。',
    ],
  },
  scout: {
    name: '影蚀斥候', char: CH + 'assassin.svg',
    hp: 18, dmg: [2, 4], def: 1, exp: 14, gold: 10,
    moves: [
      { name: '影刃', type: 'atk', weight: 2 },
      { name: '背刺', type: 'heavy', mult: 1.7, cd: 3, hint: '高伤害！', text: '从阴影中闪出，发动【背刺】！' },
      { name: '掷毒刃', type: 'poison', mult: 1.0, cd: 3, hint: '淬毒！', text: '抖手掷出一柄淬毒短刃！' },
    ],
    intro: '黑袍斥候从僧舍的阴影里直起身——它观察这座圣殿，已经很久了。',
    win: '斥候的黑袍散作烟尘，地上只留下刻着「睁眼」纹章的护腕。',
    death: [
      '黑袍罩下，你最后的视线里，是圣殿金顶在雾中沉没。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  courage: {
    name: '勇气之影', char: CH + 'shadowknight.svg',
    hp: 22, dmg: [2, 4], def: 1, exp: 16, noFlee: true,
    moves: [
      { name: '镜斩', type: 'atk', weight: 2 },
      { name: '镜影重斩', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '挥出和你一模一样的一剑——【镜影重斩】！' },
    ],
    intro: '黑甲的影子从光中走出，持着一柄和你一模一样的剑——它没有脸，却在「看」你。此战，无处可逃。',
    win: '幻影在你的剑下碎成万千光点，勇气回廊重新空了下来。',
    loseText: [
      '你在幻影的剑下失去意识——却不是死，而是被一阵暖流托起，轻轻放回大殿入口。（生命与斗气回复）',
      '索恩的声音从远处传来：「疼就对了！勇气从来不是不害怕，是怕得要死还站在那儿！再来！」',
    ],
  },
  bandit: {
    name: '红巾强盗头子', char: CH + 'bandit.svg',
    hp: 30, dmg: [3, 5], def: 1, exp: 16, gold: 12,
    rageAt: 12, rageText: '红巾汉子肩头的旧伤崩裂——他红着眼，斧势愈发狂暴！（伤害提升）',
    moves: [
      { name: '战斧', type: 'atk', weight: 2 },
      { name: '重劈', type: 'heavy', mult: 1.7, cd: 2, hint: '高伤害！', text: '抡圆战斧，发动【重劈】！' },
    ],
    intro: '斧刃劈开风雪，直奔你的面门！',
    win: '红巾汉子仰面栽进雪里，斧头脱手飞出老远。余下的匪众面面相觑，作鸟兽散。',
    death: [
      '血染红了雪。风雪很快会覆盖一切，包括你。',
      '——恍惚间，你怀中的符文最后一次发烫。',
    ],
  },
  shadowknight: {
    name: '影蚀武士', char: CH + 'shadowknight.svg',
    hp: 34, dmg: [4, 6], def: 1, exp: 18, gold: 15, noFlee: true,
    moves: [
      { name: '暗刺', type: 'atk', weight: 2 },
      { name: '暗影重斩', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '挥出裹挟紫雾的【暗影重斩】！' },
      { name: '凝聚黑盾', type: 'shield', amount: 6, cd: 4, hint: '正在凝聚护盾', text: '抬手凝出一面幽黑的盾壁。' },
    ],
    intro: '影蚀武士的黑剑带着紫雾劈下！',
    win: '黑袍人丢下披风，遁入黑暗深处。披风下压着一小袋沉甸甸的金币——影蚀的经费倒是充足。',
    death: [
      '紫雾淹没你的视野。恍惚间，你听见黑袍人叹息：「星辰，影主取定了。」',
      '——黑暗尽头，晨曦符文最后一次亮起。',
    ],
  },
  starlord: {
    name: '影蚀领主·噬星者', char: CH + 'shadowknight.svg',
    hp: 110, dmg: [6, 10], def: 2, exp: 40, gold: 40, noFlee: true,
    rageAt: 55, rageText: '星辰之印的光刺进它的兜帽——领主发出不似人声的咆哮，紫焰顺着铠甲缝隙炸开！它的攻势骤然狂暴！',
    moves: [
      { name: '紫焰斩', type: 'atk', weight: 2 },
      { name: '噬星斩', type: 'heavy', mult: 1.8, cd: 2, hint: '极高伤害，务必防御！', text: '凝出一弯黑月，发动【噬星斩】！' },
      { name: '黑月护壁', type: 'shield', amount: 8, cd: 4, hint: '正在凝聚护盾', text: '周身升起一弯黑月护壁。' },
      { name: '星穹锁链', type: 'stun', chance: 0.35, cd: 4, hint: '可能锁住你的行动！', text: '甩出数条星光凝成的锁链——【星穹锁链】！' },
    ],
    intro: '影蚀领主拔出漆黑的巨剑。塔顶的风，一瞬间全变成了它剑上的雾。',
    win: '巨剑断成两截。影蚀领主的躯体从铠甲里泻出，像退潮的黑水。铠甲缝隙里，滚出一袋足以买下半条街的金币。',
    death: [
      '紫雾淹没你的视野。恍惚间，你听见黑袍人叹息：「星辰，影主取定了。」',
      '——黑暗尽头，晨曦符文最后一次亮起。',
    ],
  },

  /* ---- 第三部 · 潮歌湾 ---- */
  deepone: {
    name: '深潜者', char: CH + 'deepone.svg',
    hp: 20, dmg: [3, 5], exp: 16, gold: 10,
    moves: [
      { name: '利爪', type: 'atk', weight: 2 },
      { name: '缠腕', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '湿滑的长臂死死缠上来——【缠腕】！' },
      { name: '海毒淬爪', type: 'poison', mult: 1.1, cd: 3, hint: '淬毒！', text: '爪上倒钩刮过，咸腥的毒液渗进伤口！' },
    ],
    intro: '礁石阴影里立起一具滴着水的灰绿躯体——鳃盖开合，死鱼般的白眼盯住了你们。',
    win: '深潜者溃成一滩咸水，只在礁缝里留下几枚被海水啃圆的旧币。',
    death: [
      '咸腥的水漫过你的口鼻——潮歌湾的涛声，成了最后的摇篮曲。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  deeponpack: {
    name: '深潜者游群', char: CH + 'deepone.svg',
    exp: 26, gold: 16,
    units: [
      { name: '深潜者', hp: 18, dmg: [3, 5],
        moves: [
          { name: '利爪', type: 'atk', weight: 2 },
          { name: '海毒淬爪', type: 'poison', mult: 1.1, cd: 3, hint: '淬毒！', text: '爪上倒钩刮过，咸腥的毒液渗进伤口！' },
        ],
        die: '深潜者溃成咸水，顺着礁缝退了下去。' },
      { name: '深潜者', hp: 18, dmg: [3, 5],
        moves: [
          { name: '缠腕', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '湿滑的长臂死死缠上来——【缠腕】！' },
          { name: '利爪', type: 'atk', weight: 2 },
        ],
        die: '深潜者发出气泡般的哀鸣，瘫进水洼里。' },
    ],
    intro: '两具灰绿的躯体从浪沫里立起，鳃盖开合的声音像破风箱——它们不是来讨食的，是来拖人下水的。',
    win: '咸水漫过礁石，退进海里。浪沫上只余几枚被海水啃圆的旧币。',
    death: [
      '咸腥的水漫过你的口鼻——潮歌湾的涛声，成了最后的摇篮曲。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  reefcrab: {
    name: '礁背蟹妖', char: CH + 'reefcrab.svg',
    hp: 26, dmg: [3, 5], def: 2, exp: 18, gold: 9,
    moves: [
      { name: '铁钳', type: 'atk', weight: 2 },
      { name: '凝甲', type: 'shield', amount: 6, cd: 3, hint: '正在凝聚甲壳', text: '周身的藤壶与旧甲咔咔收紧，叠出更厚的一层。' },
      { name: '横钳', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '巨钳横扫而来——【横钳】！' },
    ],
    intro: '一堆「礁石」忽然站了起来——老蟹妖背着整面礁壁长大，钳子比船锚还沉。',
    win: '蟹妖仰面翻倒，四肢乱蹬一阵，缩回壳里再也不出来了。它的旧巢里藏着些亮晶晶的物件。',
    death: [
      '巨钳合拢，天地翻转。你最后看见的，是礁石上斑驳的藤壶。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  tidesage: {
    name: '影蚀潮祭司 · 溟汐', char: CH + 'tidesage.svg',
    hp: 150, dmg: [7, 11], def: 2, exp: 50, gold: 45, noFlee: true,
    rageAt: 75, rageText: '海洋之印的深蓝光刺进它的兜帽——溟汐周身的咸雾轰然沸腾，祷词变成了尖啸！它的攻势骤然狂暴！',
    moves: [
      { name: '潮鞭', type: 'atk', weight: 2 },
      { name: '深渊吐息', type: 'heavy', mult: 1.8, cd: 2, hint: '极高伤害，务必防御！', text: '兜帽深处涌出深蓝色的寒雾——【深渊吐息】！' },
      { name: '潮幕', type: 'shield', amount: 8, cd: 4, hint: '正在凝聚护盾', text: '一道咸涩的潮幕自祭坛升起，裹住它的身形。' },
      { name: '沉沦低语', type: 'stun', chance: 0.3, cd: 4, hint: '可能锁住你的行动！', text: '祭坛四壁同时响起下坠般的低语——【沉沦低语】！' },
      { name: '蚀心祝词', type: 'drain', mult: 1.1, cd: 3, hint: '汲取生命', text: '念出倒转的祷词，咸雾顺着你的伤口往回爬。' },
    ],
    intro: '祭坛前的祭司缓缓转身。它不再需要兜帽下的脸——潮汐就是它的脸，深渊就是它的嗓音。',
    win: '潮幕溃散成漫天的咸雾。溟汐跪倒在祭坛前，像终于等到了退潮的虔信者，从袍袖里散成一层白盐。',
    death: [
      '深蓝的寒雾没过你的口鼻。低语在耳边念着倒转的祷词，一寸寸把你的名字从潮汐账簿上划去。',
      '——黑暗尽头，符文最后一次亮起。',
    ],
  },

  /* ---- 第四部 · 金穗平原 ---- */
  locusts: {
    name: '蚀穗螟群', char: CH + 'locust.svg',
    exp: 15, gold: 7,
    units: [
      { name: '螟王', hp: 14, dmg: [2, 4],
        moves: [
          { name: '扑袭', type: 'atk', weight: 2 },
          { name: '蚀粉', type: 'poison', mult: 1.0, cd: 2, hint: '蚀毒！', text: '王翅一振，一片锈色的鳞粉当头罩下！' },
        ],
        die: '螟王坠进麦茬里，扑腾两下不动了。' },
      { name: '螟群', hp: 10, dmg: [1, 3], moves: [{ name: '扑袭', type: 'atk' }], die: '半群螟蛾被扫落，剩下的仓皇散进田垄。' },
    ],
    intro: '麦浪忽然矮了一截——成片的螟蛾腾空而起，翅上的鳞粉在暮光里像一场锈色的雪。',
    win: '螟群散作漫天碎屑。你抖掉肩上的鳞粉——掌心里还留着一小撮它们没能带走的谷粒。',
    death: [
      '锈色的雪落满你的肩头。麦浪合拢过来，温柔得像一场葬礼。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  husk: {
    name: '泥沼腐行者', char: CH + 'husk.svg',
    hp: 30, dmg: [4, 6], def: 1, exp: 20, gold: 12,
    moves: [
      { name: '抓蚀', type: 'atk', weight: 2 },
      { name: '腐液喷吐', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '喉头的腐液轰然喷出——【腐液喷吐】！' },
      { name: '汲生机', type: 'drain', mult: 1.0, cd: 3, hint: '汲取生命', text: '藤蔓根须缠上你的手腕，贪婪地抽取着生机。' },
    ],
    intro: '磨坊的阴影里立起一个佝偻的身影——半是腐藤半是旧骨，头顶还插着几穗没能长成的麦子。',
    win: '腐行者散成一地朽藤。藤蔓深处，滚出一袋被人藏进墙缝的谷种——穗安村的祭典谷种！',
    death: [
      '腐液漫过你的眼睛。麦田在远处金黄如初，可你再也直不起腰来。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  harvestgiant: {
    name: '腐穗巨灵 · 饕穰', char: CH + 'harvestgiant.svg',
    hp: 180, dmg: [8, 12], def: 2, exp: 55, gold: 50, noFlee: true,
    rageAt: 90, rageText: '丰收之印的金光灼烧着它的躯壳——巨灵周身的藤蔓疯狂暴长，腐香浓得化不开！它的攻势骤然狂暴！',
    moves: [
      { name: '藤鞭', type: 'atk', weight: 2 },
      { name: '荆棘风暴', type: 'heavy', mult: 1.9, cd: 2, hint: '极高伤害，务必防御！', text: '周身荆藤齐齐炸开——【荆棘风暴】！' },
      { name: '饕噬', type: 'drain', mult: 1.2, cd: 3, hint: '汲取生命', text: '躯干上的巨口豁然张开，整片腐香都朝你涌来。' },
      { name: '腐香迷醉', type: 'stun', chance: 0.3, cd: 4, hint: '可能锁住你的行动！', text: '腐熟的甜香轰然炸开——【腐香迷醉】！' },
    ],
    intro: '祭坛后的谷仓炸开——一座由腐藤、谷壳与丰收怨念堆成的巨灵，拖着满身穗影站了起来。它在替谁，「收割」这座平原。',
    win: '巨灵在金光里一层层剥落，最后只剩一小撮干净的谷粒，安安静静躺在祭坛石上。',
    death: [
      '腐香漫过你的口鼻。丰收的麦浪在视野尽头翻涌，却再没有一穗，会为你低头。',
      '——黑暗尽头，符文最后一次亮起。',
    ],
  },
};

/* ---------------- 任务 ---------------- */
const QUESTS = {
  q_inn:    { title: '黑鸦旅店的怪客', hint: '灰岭镇黑鸦旅店里，那位灰袍老者似乎有话想对你说。' },
  q_night:  { title: '风雨之夜', hint: '在旅店客房歇一晚吧。今夜风雨大作，握紧你的剑。' },
  q_aria:   { title: '晨曦之痕', hint: '带着符文碎片北上，穿过迷雾森林，寻找符文学者艾莉娅·星语。' },
  q_temple: { title: '符文圣殿', hint: '通过三重试炼：勇气、智慧、心灵，重燃晨曦祭坛。' },
  q_north:  { title: '星辰之印', hint: '北上白石城——星辰之印就供在星塔顶上。' },
  q_city:   { title: '白石城的阴影', hint: '觐见莉安娜女王，查清大臣巴洛克的底细。' },
  q_tower:  { title: '星塔之夜', hint: '今夜月晦，影蚀领主亲取星辰之印——赶到星塔顶！' },
  q_tide:   { title: '海洋之印', hint: '南下潮歌湾——第三印沉眠在海底神殿，大退潮之夜海路自现。' },
  q_harvest:{ title: '丰收之印', hint: '东行金穗平原——蝗灾与腐穗的背后，是影蚀对第四印的图谋。' },
  q_horizon:{ title: '七印之路 · 再启程', hint: '终部「深渊之印」制作中：战痕古战场与暮色修道院的钟声。在艾尔多兰随意行走，收集未见的角落。' },
  q_done:   { title: '七印之路 · 暂歇', hint: '在艾尔多兰随意行走，收集未见的角落。' },
};

/* ---------------- 支线任务 ---------------- */
const SIDE_QUESTS = {
  herb:   { title: '月下香草', hint: '为采药人玛戈采集3株月光草。林道、隐秘小径、黄昏营地各长着一株。' },
  bounty: { title: '隘口的匪首', hint: '驿镇告示：红巾匪首盘踞白霜隘口，取其首级回来领赏18金币。' },
  lost:   { title: '宵禁下的失踪', hint: '帮街角老妇寻找失踪的学徒艾德温。宵禁后的城西小巷，或许有线索。' },
  glowweeds: { title: '灯塔的荧藻', hint: '为守塔人老祈采集3株荧藻（礁滩、沉船湾、潮汐洞窟），重亮潮歌灯塔。' },
  seeds:  { title: '被偷走的谷种', hint: '穗安村的祭典谷种被偷进了老磨坊——替村长取回来。' },
};

/* ---------------- 结局（章节收尾，可收集） ---------------- */
const ENDINGS = [
  { id: 'ending_star_guardian', icon: '🌟', name: '星辰守护者' },
  { id: 'ending_undercurrent',  icon: '🌑', name: '暗流涌动' },
  { id: 'ending_tide_guardian', icon: '🌊', name: '沧海守护者' },
  { id: 'ending_tide_whisper',  icon: '🐚', name: '潮声呢喃' },
  { id: 'ending_harvest_guardian', icon: '🌾', name: '大地的守望者' },
  { id: 'ending_rot_seed',      icon: '🍂', name: '腐香暗种' },
];

/* ============================================================
 * 商店（渡鸦 / 货郎共用进货表，售价全境统一）
 * unique 的货物只卖一件；已持有或已装备则不再上架。
 * ============================================================ */
const SHOP = {
  potion:        { cost: 8,  label: '一瓶生命药水 · 恢复10',        line: '你接过药水。瓶身还带着货车夹层的凉意。' },
  potion_big:    { cost: 20, label: '一瓶大生命药水 · 恢复25',      line: '浓浆似的药液在瓶里缓缓打转。「省着喝，」渡鸦说，「这玩意比金子还稠。」' },
  amulet:        { cost: 18, label: '一枚星光护符 · 濒死救命一次',  line: '星光护符在你掌心轻轻一颤，像一颗小小的心跳。「可别浪费了，」渡鸦说，「它只肯为人碎一次。」' },
  iron_sword:    { cost: 15, label: '一把铁剑 · 攻击+1',   unique: true, line: '铁剑入手沉稳，比您那把陪您睡过桥洞的旧剑轻了三分。' },
  leather_armor: { cost: 18, label: '一件旅人皮甲 · 受伤-1', unique: true, line: '皮甲硝得柔软，贴身一穿，风都好像小了些。' },
  star_pendant:  { cost: 22, label: '一枚星辉坠饰 · 生命上限+6', unique: true, line: '坠饰里的碎星石一闪一闪，像把一小片夜空挂在了脖子上。' },
  tide_weave:    { cost: 26, label: '一件潮织法衣 · 受伤-2', unique: true, line: '潮织法衣入手微凉，海风一吹，衣料里像有细浪走过。' },
  harvest_charm: { cost: 24, label: '一枚麦金护符 · 会心+8%', unique: true, line: '麦金护符在指间转了半圈。「大地的偏心，」渡鸦说，「戴着的人出剑都准三分。」' },
};

/* 通用商店循环：intro 开场白；rumor 可选传闻项 {text, when, run}；ids 限定上架货物 */
async function shopLoop(intro, rumor, ids) {
  await say([intro]);
  for (;;) {
    const opts = [];
    for (const id of (ids || Object.keys(SHOP))) {
      const g = SHOP[id];
      if (!g) continue;
      opts.push({
        text: `买${g.label}（${g.cost}金币）`,
        when: () => !g.unique || ((S.items[id] || 0) === 0 && !(S.equip && Object.values(S.equip).includes(id))),
        req: s => s.gold >= g.cost, lock: '金币不足',
        run: async () => { fx({ gold: -g.cost, item: id }); await say([g.line]); },
      });
    }
    if (rumor) opts.push(rumor);
    opts.push({ text: '「告辞。」', run: async () => {} });
    const i = await choose(opts);
    if (i < 0 || i === opts.length - 1) return;
    await opts[i].run();
  }
}

/* ============================================================
 * 世界地图
 * ============================================================ */
const WORLD = {

  /* ==================== 序章 · 灰岭镇 ==================== */

  grayridge_gate: {
    name: '灰岭镇口', ch: '序章 · 风雨之夜', sub: '暮雨投宿', bg: BG + 'inn.svg', mood: 'dark',
    desc: [
      '黄昏时分，你踏进了灰岭镇。',
      '你是{name}——一个没有领主、没有封地、连姓氏都懒得报的流浪剑客。三年来你睡过谷仓、桥洞和马厩，靠押镖、除鼠和一点剑上的运气糊口。',
      '今夜风雨大作。镇口那家「黑鸦旅店」的窗子透出暖黄的光，像风暴里最后一枚火种。',
    ],
    brief: '雨幕里的灰岭镇。北面坡上，黑鸦旅店的灯火在风雨里明明灭灭。',
    exits: {
      n: { to: 'inn_hall', label: '黑鸦旅店', flavor: '你压低斗篷，踏着积水朝旅店走去。推开橡木门，暖风扑面而来。' },
      w: { to: 'grayridge_street', label: '灰岭集市', flavor: '你拐进镇中集市。收摊前的货郎们正吆喝着最后几单生意，炊烟与草药味混在雨雾里。' },
      s: {
        to: 'south_road', label: '南下 · 古道', flavor: '你告别灰岭镇，踏上南下的古道。晨光渐亮，路的尽头，雾气正从林梢漫起。',
        req: s => s.flags.cedricDead, lock: '夜深雨大，当务之急是找家旅店歇脚',
      },
    },
  },

  grayridge_street: {
    name: '灰岭集市', ch: '序章 · 风雨之夜', sub: '暮雨投宿', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '集市不大，一条湿漉漉的石板街两侧挤着十几个摊位：铁器、干货、草药、旧皮货。',
      '雨把叫卖声压得很低。一个背弓的老猎户坐在屋檐下擦拭箭簇，货郎的推车上，药水瓶排成整齐的一列。',
    ],
    brief: '收摊前的集市。老猎户在屋檐下擦箭，货郎的推车还亮着灯。',
    exits: {
      e: { to: 'grayridge_gate', label: '回镇口', flavor: '你沿石板街折回镇口，旅店的灯火就在北面坡上。' },
      s: { to: 'grayridge_well', label: '镇南 · 古井', flavor: '你沿石板街向南。收摊的镇民行色匆匆，没人往井台那边去。' },
    },
    npcs: {
      peddler: {
        name: '货郎', img: null, role: '赶在雨前收摊的小贩',
        talk: async () => {
          await shopLoop(
            '「客官看看？雨夜赶路，一瓶药水能顶半个郎中。」货郎把推车上的瓶子摆正。',
            null, ['potion', 'amulet']);
        },
      },
      hunter: {
        name: '老猎户哈克', img: null, role: '灰岭镇最好的猎手',
        talk: async () => {
          await say([
            '老猎户抬眼打量你的剑：「生面孔。往南去？」',
            '「记住三件事：林道走大路，别贪快；隐秘小径近，但雾里有狼，成群的；天黑前务必寻个背风的营地。」',
            '他压低声音：「要是遇上没脸没影的『雾团』——别跟它对视，砍散它就跑。那玩意是迷路人的怨气，缠上你，你的火把都亮不安生。」',
          ]);
        },
      },
    },
    actions: [
      { text: '打听镇上的怪事', when: () => !S.flags.townRumor, run: async () => {
        setFlag('townRumor');
        await say([
          '你向货郎随口问起镇上的动静。他的笑脸立刻收了：「客官是外乡人，才敢在大街上问这个。」',
          '「井水黑了三天，乌鸦把井台当成了自家院子。老人们说，水里的东西『往下沉得比石头快』——没人敢再打水。」',
          '「还有旅店那边，」他压得更低，「夜里地底下有磨牙的动静。掌柜的死活不肯让人进地窖。」',
          '（镇南有一口古井；旅店的地窖似乎也有蹊跷——都值得去看看。）',
        ]);
      } },
    ],
  },

  grayridge_well: {
    name: '灰岭古井', ch: '序章 · 风雨之夜', sub: '暮雨投宿', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '老井台蹲在街尾，辘轳的麻绳冻在架子上。井水黑得像一整块凝住的墨，雨点落进去，连涟漪都是灰的。',
      '几只乌鸦沿着井沿一字排开，鸦首齐齐低向井口，一声不叫。',
    ],
    brief: '井水黑得像墨的古井。乌鸦沿井沿排成一排，齐齐低着头。',
    exits: {
      n: { to: 'grayridge_street', label: '回集市', flavor: '你离开井台。身后，乌鸦重新把头低了下去。' },
    },
    onEnter: async () => {
      if (!ev('wellVisit')) return;
      await say([
        '你在井口停下。水面离井沿不过一臂，黑得照不出人影——你看了很久，才确定不是光线的缘故。',
        '水面上浮着什么，随雨点一沉一浮。',
      ]);
      const i = await choose([
        { text: '用剑把浮着的东西挑上来' },
        { text: '俯身细听井底的动静' },
        { text: '后退离开' },
      ]);
      if (i === 0) {
        await say([
          '剑尖挑起一只泡胀的钱袋，绳结上还系着灰岭镇的老式铜牌——是井边打水的人失手落下的。',
          '乌鸦们齐刷刷抬头，看着你把水袋收进行囊，又齐刷刷低下头去。',
          '（金币 +4）',
        ]);
        fx({ gold: 4 });
      } else if (i === 1) {
        await say([
          '你俯在井口。风从井底上来，又湿又凉，风声深处，裹着极轻的、磨牙似的声响。',
          '磨牙声停了。井水晃了一下——不是被雨点打的，是从底下顶上来的一圈涟漪。',
          '你直起身。乌鸦们仍旧低着头，像在等什么从井里上来。',
          '（店主说的「地底下的磨牙声」，原来不止旅店一处……）',
        ]);
      } else {
        await say(['你从井边退开。乌鸦们连眼皮都懒得抬——它们只对井里的事感兴趣。']);
      }
    },
  },

  inn_hall: {
    name: '黑鸦旅店 · 大堂', ch: '序章 · 风雨之夜', sub: '暮雨投宿', bg: BG + 'inn.svg', mood: 'warm',
    desc: [
      '炉火噼啪作响。屋里弥漫着麦酒、湿羊毛和烤肉的气息。独眼的店主在吧台后擦拭酒杯，几个赶车的脚夫压低声音掷着骰子。',
      '角落里，一个灰袍老者独自坐着，面前一杯酒纹未动。他抬起头，目光越过火光，正落在你的剑柄上——像是在确认什么。',
      '墙上的乌鸦木牌被穿堂风吹得轻轻摇晃，吱呀，吱呀。',
    ],
    brief: '炉火、麦酒味，与那只晃荡的乌鸦木牌。',
    exits: { s: { to: 'grayridge_gate', label: '出门 · 镇口', flavor: '你推门而出，风雨瞬间灌进领口。' },
             up: { to: 'inn_room', label: '上楼 · 客房', flavor: '木楼梯在你脚下吱呀作响。' },
             down: { to: 'inn_cellar', label: '下 · 地窖', flavor: '你举着壁炉边借来的蜡烛，踩着吱呀作响的窄梯下进地窖。' } },
    npcs: {
      keeper: {
        name: '独眼店主', img: null, role: '黑鸦旅店的主人',
        talk: async () => {
          if (S.flags.cedricDead) {
            if (ev('keeperFarewell')) {
              await say([
                '你下楼时，独眼店主正跪在碎窗前收拾残局。看见你，他站起身，把一只沉甸甸的布包推过吧台。',
                '「灰袍老爷生前把房钱付到了后天，」他哑着嗓子说，「剩下的，是老头儿我的一点心意。带上——南边的雾，最近不太平。」',
                '（塞德里克的遗赠：生命药水 ×2，金币 +5）',
              ]);
              fx({ item: ['potion', 'potion'], gold: 5 });
              return;
            }
            await say(['老人常坐的角落已经空了。炉火边只留下一把椅子，和半杯没动过的酒。']);
            return;
          }
          if (ev('keeperRumor')) {
            await say([
              '「热葡萄酒，加蜂蜜。」你把两枚铜板推过吧台。',
              '独眼店主压低嗓子：「客官是往北去？劝您一句——别喝村口的井水。这几天，井水黑得像墨，乌鸦落满了屋脊，赶都赶不走。」',
              '「还有啊，」他凑得更近，「夜里有人听见地底下……有磨牙的声音。」',
            ]);
          } else {
            await say(['店主朝你扬扬下巴：「酒在桶里，闲话在耳朵里。外头风声不对，客人早些歇着。」']);
          }
        },
      },
      cedric: {
        name: '灰袍老者', img: CH + 'cedric.svg', role: '自称“塞德里克”的游学贤者',
        talk: async () => {
          if (S.flags.cedricDead) { await say(['老人常坐的角落已经空了。炉火边只留下一把椅子，和半杯没动过的酒。']); return; }
          if (ev('cedricMet')) {
            await say([
              '「剑客。」老者在你对面坐下，声音沙哑得像旧书页，「冒昧打扰。但整个灰岭镇，只有你的眼睛还没有被恐惧蒙住。」',
              '「我叫塞德里克。曾是王城符文圣殿的录事——在圣殿还存在的年月里。」',
              '他环顾四周，压低声音：「你听过七印的故事吗？」',
            ]);
            const i = await choose([
              { text: '「七印？愿闻其详。」' },
              { text: '「先干为敬。——请老先生喝一杯？」（花费3金币）', req: s => s.gold >= 3, lock: '金币不足' },
              { text: '「我只对酒钱感兴趣。」起身告辞' },
            ]);
            if (i === 0) { await say(STORY_TEXT.sevenSeals); setFlag('heardLegend'); }
            else if (i === 1) {
              fx({ gold: -3, rep: 1 });
              await say([
                '老者接过热酒，指节因风湿而变形，捧着杯子的样子却像捧着圣物。',
                '「一千年前，暗影君主莫格拉斯差点吞掉整个大陆。七位先王用自己的性命点燃了七枚守护符文，把他钉在影渊之下。」',
                '「七印之名，依次是：晨曦、星辰、海洋、丰收、战争、暮钟……以及深渊。」',
                '「如今嘛……」他自嘲地笑笑，「七枚里，已有三枚的光熄了。」',
                '塞德里克向前倾身：「守护符文不是传说，孩子。它们是锁。而锁——正在生锈。」',
                '「井水变黑、乌鸦聚集、地底的磨牙声……都是影渊之下那位君主苏醒的征兆。他的仆从已经动了：他们要抢在封印崩坏前，把七印彻底毁掉。」',
                '「我本要去迷雾森林，找一位叫艾莉娅·星语的半精灵学者——她破解了符文古语。可我这把老骨头，未必走得到那里。」',
              ]);
              setFlag('heardLegend');
            }
            else { await say(['你丢下铜板，径直走向楼梯。身后，老人叹息般地自语：「……今夜，怕是有人要来了。」']); }
          } else {
            await say(['老人望着炉火，自顾自地低声念着什么。或许该先和吧台的店主聊聊镇上的事。']);
          }
        },
      },
    },
    actions: [],
  },

  inn_cellar: {
    name: '黑鸦旅店 · 地窖', ch: '序章 · 风雨之夜', sub: '暮雨投宿', bg: BG + 'inn.svg', mood: 'dark',
    desc: [
      '烛光只够照亮三步。成排的酒桶贴墙立着，蛛网在桶耳间结成一挂一挂的灰帘。',
      '最里侧的酒架后面，墙砖上留着几道新鲜的抓痕——划痕很深，是从墙的「里面」抓出来的。墙角塌开一道仅容一只猫钻过的洞，黑洞洞的，看不见底。',
    ],
    brief: '成排的酒桶与灰帘似的蛛网。墙上的抓痕新鲜得刺眼。',
    exits: {
      up: { to: 'inn_hall', label: '回大堂', flavor: '你把蜡烛吹熄，踩着窄梯回到大堂的暖光里。' },
    },
    onEnter: async () => {
      if (!ev('cellarVisit')) return;
      await say([
        '你举高蜡烛。就在这时，洞口深处传来极轻的声响——磨牙似的，一下，又一下。',
        '你把蜡烛凑近洞口。声响停了。整座地窖静得能听见烛芯的哔剥。',
      ]);
      const i = await choose([
        { text: '撬开酒架后的松砖' },
        { text: '贴着墙洞细听' },
        { text: '回到楼上' },
      ]);
      if (i === 0) {
        await say([
          '酒架后有一块砖比别的松。你用剑尖撬开——后面是个巴掌大的暗龛，店主藏私房钱的老地方。',
          '暗龛里是一小袋铜板，和一瓶封蜡完好的陈年药酒。店主一时半会儿不会发现；就算发现了，他大概也宁愿不知道。',
          '（金币 +4，获得：生命药水 ×1）',
        ]);
        fx({ gold: 4, item: 'potion' });
      } else if (i === 1) {
        await say([
          '你把耳朵贴上墙洞。',
          '起初什么都没有。然后那阵磨牙声重新响起来——不在洞里，在墙的另一头，缓慢地、耐心地，朝着镇外的方向移动。',
          '墙皮簌簌地落。你握紧剑柄，直到脚步声彻底消失。',
          '（这些东西在地下移动。它们要去哪儿？）',
        ]);
      } else {
        await say(['你退回窄梯。身后的黑暗里，磨牙声又轻轻响了起来，像在目送。']);
      }
    },
  },

  inn_room: {
    name: '黑鸦旅店 · 客房', ch: '序章 · 风雨之夜', sub: '子夜惊变', bg: BG + 'inn.svg', mood: 'dark',
    desc: ['一间狭小的客房。床铺算不上干净，但今夜，它是方圆十里最接近「家」的东西。'],
    brief: '狭小的客房，窗缝里漏进楼下的炉火光。',
    exits: { down: { to: 'inn_hall', label: '下楼 · 大堂', flavor: '你踩着木楼梯回到大堂。' } },
    onEnter: async () => {
      if (S.flags.cedricDead) return;
      if (!S.flags.heardLegend) {
        await say(['你推开房门，却在床沿坐下时犹豫了。']);
        await say(['楼下，那位灰袍老者的目光仍隔着炉火落在你背上——像是有话，非说不可。']);
        await say(['（先回大堂，和灰袍老者聊聊吧。）']);
        await sleepMs(600);
        return move('inn_hall');
      }
      // 风雨之夜 · 夜袭
      checkpoint();
      quest('q_night');
      await say([
        '你闩好门，和衣躺下，数着屋檐的滴水声。井水像墨……乌鸦成群……地底的磨牙声……',
        '不知过了多久，你在黑暗中猛地睁开眼——不是因为声音，而是因为声音消失了。',
        '整座旅店，静得可怕。',
        '你按住剑柄，屏息听着楼下。塞德里克沙哑的声音从楼梯口飘上来，轻得像叹息：「来了。」',
        '轰——！楼下的窗棂炸成碎片。黑色的影子倒悬着漫进屋内，火光骤然缩小。旅店里响起脚夫们的惨叫和杯盘碎裂声。',
        '两道黑影越过楼梯扶手，直扑你的房门——他们袖口上，绣着一只睁开的眼。',
        '你踢翻桌子作为屏障。第一枚飞刀擦着你的耳畔钉进门框。',
      ]);
      const r = await battle('assassin');
      if (r !== 'win') return;
      await say([
        '你喘着粗气站稳。炉火边，塞德里克靠着墙缓缓滑坐下去。他的胸口洇开一片深色——方才有一柄短刃，本是冲你来的。',
        '「别……浪费光阴皱眉。」他抓住你的手，把一枚温热的碎片按进你掌心。那是半枚符文，内部有金色的光缓慢流转，像黎明被封进了琥珀。',
        '「晨曦之痕……七印之首。拿去……迷雾森林……找艾莉娅·星语……告诉她——」',
        '「——七印将倾。」',
        '他的手垂落。炉火「啪」地爆了个火星。',
        '窗外，雨停了。你把碎片贴身收好，在独眼店主惊恐的注视下，转身走进黎明前最黑的夜。',
      ]);
      fx({ item: 'shard', flag: 'cedricDead' });
      give('map');
      quest('q_aria');
      await say(['（获得：迷雾古图——塞德里克的遗物，标注着符文圣殿与森林的方位。）']);
      await say(['南方的官道已经打通。你可以随时从镇口出发，前往迷雾森林。']);
    },
    rest: { cost: 0, label: '在客房歇息' },
  },

  south_road: {
    name: '南下古道 · 荒废烽燧', ch: '第一部 · 晨曦之印', sub: '小节一 · 南下古道', bg: BG + 'road.svg', mood: 'warm',
    wild: true,
    desc: [
      '古道沿着山脚向南蜿蜒。官道年久失修，车辙里长满了齐膝的荒草，唯有路边一座半塌的烽燧还立着，像一位不肯离岗的老兵。',
      '烽燧下的背风处，蜷着一小群裹着铺盖的农户，锅里的糊糊咕嘟作响。他们看见你的剑，下意识地把孩子往身后拢了拢。',
    ],
    brief: '荒草没膝的古道。半塌的烽燧下，农户的锅里咕嘟作响。',
    checkpoint: true,
    exits: {
      n: { to: 'grayridge_gate', label: '回灰岭镇', flavor: '你沿古道折返，黄昏时分重新望见灰岭镇的炊烟。' },
      s: { to: 'forest_cross', label: '南 · 林中岔路', flavor: '古道在荒草尽头没入林缘。雾气从树梢漫下来，晨露打湿了你的靴子。' },
    },
    roam: { en: 'wolves', chance: 0.25, fleeTo: 'forest_cross', intro: '荒草深处传来低低的呜咽声——狼群盯上古道已经很久了。' },
    onEnter: async () => {
      if (!ev('roadRefugee')) return;
      await say([
        '烽燧下，一个满脸风霜的老农朝你欠了欠身：「兵爷……不，客官。借个火？」',
        '「我们从雾林边上逃出来的。井水黑了，乌鸦成精似的往屋脊上落，夜里还有穿黑袍的东西排着队往山里走——」他打了个寒噤，「官府说是流匪。可流匪哪有不抢粮、光赶路的？」',
      ]);
      const i = await choose([
        { text: '分给他们一些干粮和铜钱', req: s => s.gold >= 2, lock: '金币不足' },
        { text: '细问黑袍人的去向' },
        { text: '在烽燧另一侧独自歇脚，不多掺和' },
      ]);
      if (i === 0) {
        fx({ gold: -2, rep: 1 });
        await say([
          '你把干粮掰开分给孩子们，又留下一把铜钱。老农的眼眶红了：「好人呐……往南走若是缺水，认准开白花的泉眼，毒不死人。」',
          '（声望 +1。村民们把路过的注意事项讲给你听——南下古道，你走得比来人踏实多了。）',
        ]);
      } else if (i === 1) {
        await say([
          '「黑袍的？三天前，一队，往东南山里去了。」老农压低声音，手指朝雾林深处比划，「那方向……老辈人说，是圣殿山。」',
          '他们走过去的时候，道旁的虫子全哑了。老农说到这里，再也不肯多讲。',
          '（黑袍人的目的地似乎与符文圣殿有关——脚下的路，得走快些了。）',
        ]);
      } else {
        await say(['你在烽燧的另一侧铺开斗篷。夜半，隐约听见那边孩子压低的哭声和老农的安抚声。你没有动。天亮时，锅里的糊糊香飘了过来，他们多盛了一碗留在你脚边。']);
      }
    },
    actions: [
      { text: '登上烽燧残台远眺', when: () => !S.flags.beaconClimb, run: async () => {
        setFlag('beaconClimb');
        await say([
          '你踩着塌了一半的砖阶登上烽燧残台。风从山口灌上来，吹得斗篷猎猎作响。',
          '极目南望：雾海之下，林涛如墨；东南方向的山脊线上，一点金色在云缝里静静反着光——古图上的「符文圣殿」，就藏在那里。',
          '台角的砖缝里塞着一只锈铁盒，是上一任烽卒留下的。（金币 +6）',
        ]);
        fx({ gold: 6 });
      } },
    ],
  },

  /* ==================== 第一部 · 迷雾森林 & 符文圣殿 ==================== */

  forest_cross: {
    name: '林中岔路', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'road.svg', mood: 'warm',
    wild: true,
    desc: [
      '黎明把你和古图一起晒醒。晨雾未散的林缘，露水打湿你的靴子。怀中的「晨曦之痕」随着你的心跳微微发烫，像一颗借来的心脏。',
      '羊皮纸上，朱砂标出的小径蜿蜒着钻进「迷雾森林」四个古字。古图在岔路口分出两支：左边是宽阔的林道，据说有行商往来；右边是隐秘小径，古图上用小字注着「近，而险」。',
    ],
    brief: '岔路口。西面林道宽阔，东面小径隐秘，北面雾色更深。',
    checkpoint: true,
    exits: {
      s: { to: 'grayridge_gate', label: '回灰岭镇', flavor: '你沿着来路折返，黄昏时分重新望见灰岭镇的炊烟。' },
      w: { to: 'forest_road', label: '西 · 林道', flavor: '你踏上西侧的林道。路面被车轮碾得平整，偶尔有商队的辙印。' },
      e: { to: 'forest_deep', label: '东 · 隐秘小径', flavor: '你拨开荆棘，钻进东侧的小径。浓雾立刻吞没了来路。' },
      nw: { to: 'hermit_hut', label: '西北 · 篱笆炊烟', flavor: '你朝西北的篱笆炊烟走去。雾在菜畦上散开，露出一座盖着苔藓的小木屋。' },
      n: { to: 'dusk_camp', label: '北 · 森林深处', flavor: '你循着谷地的方向向北穿行，雾气越来越浓。' },
    },
  },

  forest_road: {
    name: '林道 · 商队歇脚处', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'warm',
    wild: true,
    desc: [
      '林道旁的空地上停着一辆漆成鸦羽色的货车。车前坐着个兜帽人，肩头蹲着一只货真价实的乌鸦，正歪头打量你。',
      '「早上好啊，揣着符文赶路的客人。」兜帽下的声音听不出男女，「叫我渡鸦就行。什么都卖，价格公道——童叟无欺，坟头不欠。」',
      '你并未告诉他你怀里有符文。你很确定。',
    ],
    brief: '鸦羽色的货车停在空地中央，乌鸦歪头盯着你。',
    exits: {
      e: { to: 'forest_cross', label: '回岔路口', flavor: '你沿林道折回岔路口。' },
      w: { to: 'mist_lake', label: '西 · 水汽弥漫处', flavor: '你沿林道向西。树梢间的雾越来越湿，隐约传来水波的轻响。' },
    },
    actions: [
      { text: '寻找路旁灌木间的月光草', when: () => S.sideQuests.herb === 'active' && !S.flags.herb_road, run: async () => {
        setFlag('herb_road');
        fx({ item: 'herb' });
        await say([
          '林道旁的灌木丛里，一株月光草从车辙边缘探出来，叶背的银霜在雾里一闪一闪。',
          '你贴着根须割下茎叶，装进玛戈给的粗布袋。（获得：月光草）',
        ]);
      } },
    ],
    npcs: {
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「又见面了，客人。」渡鸦把货箱摊开——药水瓶、旧剑、皮甲与坠饰排得整整齐齐，「要看货，还是听传闻？」',
            { text: '「北边近来有什么传闻？」', when: () => !S.flags.templeHint,
              run: async () => {
                setFlag('templeHint');
                await say([
                  '「传闻？」乌鸦发出一声近似笑的叫声。',
                  '「符文圣殿的门三百年没开过了。门上有三枚符文——晨曦、星辰、深渊。想进去的人啊……」兜帽朝你倾了倾。',
                  '「记住那句老话：吾随最后一缕光沉眠。什么意思？嘿嘿，买不做，送给你。」',
                  '你道了谢。转过身时，身后已没有货车，没有兜帽人——只有那只乌鸦，在枝头盯着你看了很久。',
                ]);
              } });
        },
      },
    },
  },

  forest_deep: {
    name: '隐秘小径', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    wild: true,
    desc: [
      '小径很快被浓雾吞没。古树把天空割成一条条灰绿的缝隙，你的脚步声被苔藓吸走，安静得能听见自己的心跳。',
      '雾里飘着细语似的声响——起初你以为是风。',
    ],
    brief: '浓雾中的小径。苔藓吸走了所有脚步声。',
    exits: {
      w: { to: 'forest_cross', label: '回岔路口', flavor: '你凭感觉向西摸索，雾气渐薄，岔路口的老橡树出现了。' },
      e: { to: 'hunter_lodge', label: '东 · 半塌的猎屋', flavor: '你向东拨开垂落的藤蔓。雾隙里露出一座半塌的木屋，门板歪斜着，像在打瞌睡。' },
      n: { to: 'dusk_camp', label: '北 · 谷地方向', flavor: '你向北穿行，坡下的谷地渐渐传来溪水声。' },
      s: { to: 'old_shrine', label: '南 · 老树根间', flavor: '你拨开垂落的藤蔓向南。老树根系之间，露出一角青灰色的飞檐。' },
    },
    actions: [
      { text: '采集石缝里的月光草', when: () => S.sideQuests.herb === 'active' && !S.flags.herb_path, run: async () => {
        setFlag('herb_path');
        fx({ item: 'herb' });
        await say([
          '小径深处的石缝里，一株月光草正在雾中泛着银霜。',
          '你照玛戈教的方法，贴着根须割下茎叶，露水顺着叶背滚进掌心，凉丝丝的。（获得：月光草）',
        ]);
      } },
    ],
    roam: {
      en: ['wolves', 'wraith'], chance: 0.45, fleeTo: 'dusk_camp',
      intro: '雾深处传来窸窣的响动——你的手背青筋暴起。',
      loot: { flag: 'wolfLoot', gold: 8, item: 'wolf_fang', text: '你在苔藓上拾获一小袋它们从上一个倒霉旅人身上劫走的金币，头狼的尸身旁还滚着一枚磨好的獠牙项链。（金币 +8，获得：狼牙项链）' },
    },
  },

  mist_lake: {
    name: '雾泽湖畔', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '林道在这里沉进一片死寂的湖水。雾贴着水面走，湖心看不见对岸，只有几根枯木桩从水里探出头来。',
      '岸边拴着一条旧划艇。艇头坐着一个蓑衣老者，长篙横在膝上——你看不清他的脸，因为雾在他坐着的地方，格外浓。',
      '艾莉娅的声音压得很低：「他没有影子。这湖上的规矩……活人最好守。」',
    ],
    brief: '沉在雾里的湖。蓑衣老者坐在艇头，长篙横膝。',
    exits: {
      e: { to: 'forest_road', label: '回林道', flavor: '你离开湖畔，雾在身后合拢，水声重新被林涛盖过。' },
      n: {
        to: 'lake_islet', label: '渡湖 · 湖心洲', flavor: '老船夫一篙点开，划艇滑进雾里。水声很轻，桨声很轻，你们谁都没有说话。',
        req: s => s.flags.lakeFare, lock: '老船夫的划艇纹丝不动——湖上的规矩，要先付船钱。',
      },
    },
    onEnter: async () => {
      if (!ev('lakeVisit')) return;
      await say([
        '蓑衣老者抬起头。他没有五官，蓑衣帽檐下只有一团更浓的雾。',
        '「过湖么。」声音像从水底冒上来的气泡，「船钱五枚，老规矩。」',
        '「湖心洲上，沉着一条不肯走的船。」',
      ]);
    },
    actions: [
      { text: '付五枚船钱，请老船夫渡你上洲', when: () => !S.flags.lakeFare, req: s => s.gold >= 5, lock: '金币不足', run: async () => {
        fx({ gold: -5 });
        setFlag('lakeFare');
        await say([
          '你把五枚金币放在艇头。金币落下的声音很奇怪——像落进了很深的水里。',
          '老船夫不数钱。他只是把长篙换了个手，朝湖心一指：北面的雾裂开一道缝，一座长满枯藤的小洲浮出来。',
          '（船钱付讫。北面的湖心洲已经可以渡过去了。）',
        ]);
      } },
      { text: '向老船夫打听湖的旧事', when: () => !S.flags.lakeLore, run: async () => {
        setFlag('lakeLore');
        await say([
          '「这湖里淹过一条商船，」老船夫的声音空洞洞的，「船上的人把船钱省下了，也把自己省下了。」',
          '「雾里那些没脸的东西，一半是林子里迷路的，另一半——是湖里欠着船钱的。他们到今天还在找替他们付账的人。」',
          '你想起雾中魅影身上掉落的那些古旧铜币——像是谁欠了很久的船钱。',
          '「洲上有货。」他补了一句，「死人的货，活人拿走，不算偷。」',
        ]);
      } },
    ],
  },

  lake_islet: {
    name: '雾泽湖心洲', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '小洲不大，枯藤缠着几棵歪脖树。洲心沉着半条破船的残骸，船身裂开的方向像是被什么东西从内部撞开的。',
      '残骸旁立着一座矮矮的石冢，没有碑名，只压着一片船板。船板上的刻痕被人反复描过很多遍：「同行七人，先行一步。」',
    ],
    brief: '枯藤与歪脖树的小洲。半条破船残骸旁压着一片刻字船板。',
    exits: {
      s: { to: 'mist_lake', label: '回湖畔', flavor: '老船夫的划艇不知何时已候在岸边。上艇，回程，雾从两边让开。' },
    },
    onEnter: async () => {
      if (!ev('isletVisit')) return;
      await say([
        '破船的货舱里积着水，水底压着一只上锁的木箱——锁早烂了。',
        '箱子里是商人没能送到的货：一小袋金币，和一枚被湖水磨了百年的珍珠。珍珠贴着掌心，竟有微微的暖意。',
        '（金币 +10，获得：雾泽明珠 · 生命上限+3）',
      ]);
      fx({ gold: 10, item: 'mist_pearl' });
      await say([
        '艾莉娅把石冢上的船板扶正，轻声念了句精灵的祷词：「先行一步的人，愿你们欠下的船钱，已有人替你们付了。」',
        '回程的艇上，老船夫的篙点得比来时轻快——像是一桩心事了了。',
      ]);
    },
  },

  old_shrine: {
    name: '林中古祠', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'holy',
    desc: [
      '一座小小的石祠蹲在老树根系之间，苔藓把飞檐啃成了青灰色。祠门歪着，里面供着一尊合掌的石像——先王的模样，脸被岁月磨平了。',
      '奇怪的是，祠内一尘不染，供箱的铜锁擦得发亮。荒废的林子深处，这间小祠像被一双看不见的手日日打扫。',
      '艾莉娅怔了怔：「三百年了……还有人记得来上供。」',
    ],
    brief: '被老树根系环抱的小石祠。祠内一尘不染，供箱擦得发亮。',
    exits: {
      n: { to: 'forest_deep', label: '回隐秘小径', flavor: '你退出祠门，把歪斜的门扇掩好。雾林的声音重新围拢过来。' },
    },
    actions: [
      { text: '研读祠中碑文', when: () => !S.flags.shrineLore, run: async () => {
        setFlag('shrineLore');
        await say([
          '祠壁的碑文爬满苔痕，你拨开苔藓逐字辨认——是那句古谚：',
          '『吾随最后一缕光沉眠，尔当于何处寻吾？』',
          '碑文下方密密麻麻，刻着历代朝圣者的答案：「沉眠者」「黑夜」「星辰」「梦」……每个都被后人的刻刀划掉了。唯有最新的一道刻痕很小，笔画却稳：「晨曦」。',
          S.flags.templeHint ? '（你心中一动：与渡鸦的说法，不谋而合。）' : '（你把这句古谚与那些被划掉的答案记在心里——白昼的最后一缕光，会是什么？）',
        ]);
        if (!S.flags.templeHint) { setFlag('templeHint'); await say(['（提示已记下：圣殿大门的古谚，你已有了解答的头绪。）']); }
      } },
      { text: '往供箱投五枚银币祈福', when: () => !S.flags.shrineBless, req: s => s.gold >= 5, lock: '金币不足', run: async () => {
        fx({ gold: -5, maxHp: 2 });
        setFlag('shrineBless');
        await say([
          '银币落进供箱，叮的一声轻响。祠内那盏你根本没有找到的灯，忽然亮了一瞬——石像合拢的掌心，透出一线极淡的金光。',
          '一股暖意顺着手臂爬上来，像有人替你掖了掖披风。（生命上限 +2）',
          '你退出祠门时回头望了一眼。苔藓上不知何时多了一行浅浅的、小鸟踩出的爪印，一直排向祠内。',
        ]);
      } },
    ],
  },

  hunter_lodge: {
    name: '废弃猎屋', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '猎屋的主人们似乎走得很急：桌上扣着半碗发霉的粥，墙上还挂着一张风干的兽皮。',
      '壁炉边散落着猎户的遗物，屋子角落里，一张熊皮盖着什么东西。',
    ],
    brief: '半塌的猎屋。桌上扣着半碗发霉的粥，壁炉冷了很久。',
    exits: {
      w: { to: 'forest_deep', label: '回隐秘小径', flavor: '你退出猎屋，藤蔓在身后合拢，重新把小屋藏进雾里。' },
    },
    onEnter: async () => {
      if (!ev('lodgeSearch')) return;
      await say([
        '你掀开角落的熊皮——下面是一只铁皮小箱。没有锁，只有主人刻意压上去的一块界石。',
        '箱子里是猎人攒下的家当：一小袋金币、一瓶没开封的药水，还有一页被烟熏黄的日记。',
      ]);
      fx({ gold: 12, item: 'potion' });
      await say([
        '（获得：金币 +12，生命药水 ×1）',
        '日记的最后一行写着：「雾越来越浓了。老猎户说，雾里的『没脸东西』是迷路人的怨气——若是遇上，别对视，砍散就走。我们把房门留给下一个走夜路的人。 ——猎户约恩 绝笔」',
        '你把日记放回箱中，替他们掩好屋门。愿他们已经走到了想去的地方。',
      ]);
    },
  },

  hermit_hut: {
    name: '采药人小屋', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'warm',
    desc: [
      '篱笆围着一小片药圃，木屋的烟囱冒着细烟。屋檐下挂满成束的干药草，风一过，满院子都是清苦的香气。',
      '一个背驼得像张弓的老婆婆正蹲在菜畦边，头也不抬：「站在雾里做什么？进来，炉子上有热水。」',
    ],
    brief: '药圃与干药草的香气。老婆婆在屋檐下捣药。',
    checkpoint: true,
    exits: {
      se: { to: 'forest_cross', label: '回岔路口', flavor: '你道过谢，沿篱笆外的小径折回岔路口。' },
    },
    rest: { cost: 3, label: '在灶边歇一晚' },
    npcs: {
      margo: {
        name: '采药人玛戈', img: null, role: '雾林边缘最后的采药人',
        talk: async () => {
          // 交付：攒够3株月光草
          if (S.sideQuests.herb === 'active' && (S.items.herb || 0) >= 3) {
            await say(['「银霜齐了！」玛戈三两把收过月光草，凑到鼻尖深深一嗅，「好孩子，根须没伤着——手法比我那死鬼孙子强。」']);
            take('herb', 3);
            fx({ gold: 8, rep: 1, item: ['potion', 'potion'] });
            finishSide('herb');
            await say([
              '她从梁上取下两只鼓鼓的皮囊塞给你：「药水两瓶，工钱八枚。慢走——雾林里，记得跟着亮的东西走。」',
              '（报酬：金币 +8，生命药水 ×2，声望 +1）',
            ]);
            return;
          }
          if (S.sideQuests.herb === 'active') {
            await say([`「月光草凑齐三株再来。」玛戈头也不抬，「你如今手里有 ${(S.items.herb || 0)} 株。」`, '「林道、小径、营地，各长着一株。叶背泛银霜的才是，别把野芹菜薅来了。」']);
            return;
          }
          await say([
            '「老婆子我采了一辈子药，如今眼睛不中用喽。」玛戈放下药杵，眯眼打量你，「腿脚还利索的客人，帮个忙？」',
            '「月下香草——月光草，我那副老骨头蹲不下去了。林道、隐秘小径、黄昏营地，各长着一株。叶背泛银霜的才是。」',
            '「凑齐三株拿来，药水两瓶、工钱八枚，老婆子绝不含糊。」',
          ]);
          sideQuest('herb');
        },
      },
    },
  },

  dusk_camp: {
    name: '黄昏营地', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: ['背风的岩坡下，一圈烧剩的篝火。这里是穿越雾林前最后的落脚点。'],
    brief: '背风的岩坡，篝火的余烬还温着。',
    checkpoint: true,
    exits: {
      s: { to: 'forest_cross', label: '回岔路口', flavor: '你踏上来路，向南折回岔路口。' },
      n: {
        to: 'temple_foot', label: '北 · 符文圣殿', flavor: '你们连夜拔营，沿古图指引的山脊线跋涉两日。第三天清晨，云层裂开一道缝——远处山腰之上，一座金色穹顶静静反着光。',
        req: s => s.flags.aria, lock: '雾林深处溪声渐近……（先留意周围的动静）',
      },
    },
    rest: { cost: 0, label: '在篝火边休整' },
    actions: [
      { text: '在岩坡背风处寻找月光草', when: () => S.sideQuests.herb === 'active' && !S.flags.herb_camp, run: async () => {
        setFlag('herb_camp');
        fx({ item: 'herb' });
        await say([
          '背风的岩坡下，一株月光草从篝火余烬的灰堆边探出来，叶背的银霜映着火光。',
          '你贴着根须割下茎叶，装进玛戈给的粗布袋。（获得：月光草）',
        ]);
      } },
    ],
    onEnter: async () => {
      if (S.flags.aria) return;   // 战败可重试，直到救下艾莉娅
      await say([
        '你刚到营地，篝火还没架好——东面谷地里忽然传来女人的呼救，和尖细怪异的咯咯笑声。',
        '「救命……！谁来——！」',
        '你握紧剑。救人，还是先看清楚情况？雾林教会所有旅人一件事：呼救，也可能是陷阱。',
      ]);
      const i = await choose([
        { text: '立刻循声冲进谷地——没时间了！' },
        { text: '先隐蔽接近，看清情况再出手' },
      ]);
      let bonus = 0;
      if (i === 0) {
        await say([
          '你拨开灌木冲下谷地。谷底空地上，一个银发女子被三只哥布林团团围住，法杖横在身前，指尖的光已近油尽灯枯。',
          '你的驰援出乎所有哥布林的意料——包括你踩中的那根枯枝。',
          '一只哥布林反手甩出石斧，在你小臂上划开一道口子！（生命 -2）',
        ]);
        fx({ hp: -2 });
      } else {
        await say([
          '你伏在坡顶的蕨丛后观察：三只哥布林，两持石斧一持投索；被围的银发女子以法杖撑地，指尖的光摇摇欲坠。',
          '你数着它们换位的节奏，绕到下风处，借雾与树影——你的第一剑干净利落地解决了投索手。',
          '占了先机，居高临下。（先手优势：敌人第一回合来不及还手！）',
        ]);
        bonus = 1;
      }
      const r = await battle('goblin', { bonus });
      if (r !== 'win') return;
      await say([
        '银发女子撑着法杖站稳，向你颔首。她的耳朵在发间露出优美的尖，瞳孔是极淡的绿——半精灵。',
        '「多谢援手，旅人。我是艾莉娅·星语，符文学者。」她看向你的行囊方向，目光微微一凝，「……你身上有符文的气息。晨曦之痕？塞德里克前辈呢？」',
        '你把旅店之夜讲了一遍。她久久沉默，最后抬眼时，眼底的悲伤已凝成决心。',
        '「那么，旅人——」她伸出手，「愿意与我同行吗？圣殿就在霜脊山中。我们有太多事要做了。」',
        '艾莉娅把古图铺在膝上，指尖沿着朱砂线划过：「晨曦之痕只是七印之首的碎片。要重燃它，必须进入符文圣殿，通过三重试炼——勇气、智慧、心灵。」',
        '「对了——进了圣殿，战斗就交给我们一起。你的剑，我的星辉，缺一不可。」',
      ]);
      setFlag('aria');
      quest('q_temple');
      partyJoin('aria');
      await say(['✦ 艾莉娅·星语加入了队伍！她是独立的战斗单位，将在战斗中按「态势」自主施展星辉魔法：星火弹 / 星辉庇护 / 治愈星雨。']);
    },
  },

  temple_foot: {
    name: '圣殿石阶', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '千级石阶自雾海中浮起，尽头是一座半嵌入山体的宏伟圣殿：金色的穹顶，风化的立柱，门楣上先王的合掌纹章。',
      '三百年的荒废没能夺走它的庄严。石阶两侧的石兽灯柱里，竟还有金色的光在明灭——像是沉睡的心跳。',
      '艾莉娅仰头望着穹顶，轻声说：「三百年了。它还在等人。」',
    ],
    brief: '千级石阶尽头，金色穹顶静静反着光。',
    checkpoint: true,
    exits: {
      s: { to: 'dusk_camp', label: '下山 · 回营地', flavor: '你踏着石阶而下，雾海重新漫过脚踝。' },
      n: { to: 'temple_gate', label: '登上 · 圣殿大门', flavor: '你拾级而上。石兽灯柱里的金光在你经过时次第亮起，像列队致意。' },
      se: {
        to: 'spur_fork', label: '东北 · 北下山道', flavor: '你们翻过山脊北侧，沿着下山道向霜脊山北麓走去。',
        req: s => s.flags.part1, lock: '先完成圣殿中的试炼',
      },
    },
  },

  temple_gate: {
    name: '圣殿大门', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '大殿正门高达十丈，门上三枚巨大的符文泛着微光：晨曦、星辰、深渊。',
      '门前的石碑上刻着古谚，艾莉娅逐字译出：「吾随最后一缕光沉眠，尔当于何处寻吾？」',
      '三枚符文静静等你按落。选错的人，据说都被门「吐」了出去——运气好的，才只是被吐出去。',
    ],
    brief: '十丈高门，三枚符文泛着微光。石碑上古谚沉默。',
    exits: {
      s: { to: 'temple_foot', label: '退回石阶', flavor: '你退回石阶平台，雾风拂面。' },
      n: { to: 'temple_hall', label: '进入圣殿', flavor: '你穿过幽深的门廊。光——温热的、带着旧日颂歌回响的光，从大殿深处涌来。', req: s => S.flags.gateOpen, lock: '巨门紧闭。三枚符文在等你按落。' },
    },
    actions: [
      { text: '研读石碑古谚', run: async () => {
        await say([
          '艾莉娅指尖抚过碑文：「『吾随最后一缕光沉眠，尔当于何处寻吾？』——这是一句谜语，也是一扇门的脾气。」',
          S.flags.templeHint || S.flags.lore ? '（你想起渡鸦的话：白昼的最后一缕光，是晨曦。）' : '「白昼的最后一缕光……」她若有所思，「{name}，你觉得答案是什么？」',
        ]);
      } },
      { text: '按下「晨曦」符文', run: async () => {
        await say([
          '你的掌心贴上「晨曦」。',
          '三百年不曾开启的石门发出深海的轰鸣，金光从三枚符文中依次亮起，如日出被倒放回天空。高逾十丈的巨门向内缓缓退开。',
        ]);
        setFlag('gateOpen');
        await say(['（圣殿大门开启了。北面的门廊已经可以通过。）']);
      } },
      { text: '按下「星辰」符文', run: async () => {
        await say([
          '你的指尖刚触到星辰符文，一道无形的力便将你掀飞出去，撞在石阶上。（生命 -2）',
          '石碑上的古谚亮起刺目的白光，仿佛在嘲笑。',
          '艾莉娅扶起你，盯着那行古谚忽然一怔：「……吾随『最后一缕光』沉眠。白昼的最后一缕光——不是星辰。」',
        ]);
        fx({ hp: -2 });
      } },
      { text: '按下「深渊」符文', run: async () => {
        await say([
          '深渊符文在你指尖下剧烈地震颤，一股冰冷的恶意顺着门缝涌出，像有什么在里面笑了。你被狠狠弹开。（生命 -3）',
          '「别再碰它！」艾莉娅拽住你的手腕，「想想古谚——『最后一缕光』！」',
        ]);
        fx({ hp: -3 });
      } },
    ],
  },

  temple_hall: {
    name: '圣殿大殿', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '大殿深处，七座熄灭的符文祭坛如七星拱月。祭坛前，一个满颊红须的矮人身影豁然起身，巨斧拄地，声如洪钟——',
      '「站住！圣殿禁地，闲人——」他看清你掌心的晨曦之痕，声音卡住了。斧头「当」地拄稳，老人似的沉默了好一会儿。',
      '「……三百年了。」他抹了把脸，「俺叫索恩·铁须。铁须氏守着这座殿，守到只剩俺一个。小子——你带来的那点光，是这七座坛子三百年里见过的第一缕晨曦。」',
      '「重燃七印？哈！好大的口气。俺喜欢。」巨斧一挥指向大殿深处，「三重试炼：勇气、智慧、心灵。三关全过，晨曦祭坛自会认你。过不去的……山下的坟场里有一半是试炼送下来的好汉。」',
    ],
    brief: '七座熄灭的祭坛如七星拱月。索恩抱着巨斧立在坛前。',
    exits: {
      s: { to: 'temple_gate', label: '退出大门', flavor: '你穿过门廊，回到大门前。' },
      w: { to: 'temple_cloister', label: '西 · 圣殿回廊', flavor: '你穿过大殿西侧的月门。回廊深处光线昏暗，坍塌的僧舍像一排蛰伏的兽脊。' },
    },
    npcs: {
      thorne: {
        name: '索恩·铁须', img: CH + 'thorne.svg', role: '符文圣殿守殿人 · 铁须氏族最后的矮人',
        talk: async () => {
          if (S.flags.thorne) { await say(['「俺的斧头如今跟你走，」索恩咧嘴一笑，「不过这殿俺还回得来。祭坛的火，比俺的胡子还旺。」']); return; }
          const done = ['courageDone', 'wisdomDone', 'heartDone'].filter(f => S.flags[f]).length;
          if (done === 0) await say(['「三重试炼，一关都别想跳。」索恩用拇指擦着斧刃，「勇气在东回廊，智慧在西圆厅，心灵在最深处的黑水池。俺就在这儿，给谁收尸可说不准。」']);
          else if (done < 3) await say([`「过了${done}关，还差${3 - done}关。」索恩抱起巨斧，「试炼不会跑，可符文的光每天都在变淡。抓紧，小子。」`]);
          else await say(['「三关全过！」索恩的胡须翘了起来，「去祭坛吧——晨曦在等你，小子。」']);
        },
      },
    },
    actions: [
      { text: '查看大殿东侧的经卷架', run: async () => {
        await say([
          '大殿东侧立着一座倾倒的经卷架，卷轴大多烂成了泥。你抽出保存最完好的一卷——是录事们批注《门禁古谚》的手记。',
          '「古谚问『何处寻吾』，历代答者众说纷纭。老录事留批：先王祭晨曦，必待白昼将尽——盖因白昼的最后一缕光，即是晨曦本身。」',
        ]);
        if (!S.flags.templeHint) {
          setFlag('templeHint');
          await say(['（你把这句批注记在心里。它或许正是圣殿大门古谚的答案。）']);
        }
      } },
      { text: '走进「勇气之门」', when: () => !S.flags.courageDone, run: async () => {
        await say(['第一道门在你面前亮起。勇气回廊里空无一物——直到你的影子在脚下忽然站了起来。']);
        const r = await battle('courage');
        if (r === 'win') {
          setFlag('courageDone');
          await say(['「第一关！」索恩的吼声在大殿里回荡，「别得意，智慧的门槛比这高得多！」']);
        } else if (r === 'lose') {
          await say(ENEMIES.courage.loseText);
          S.hp = Math.min(S.maxHp, S.hp + 10); S.sp = Math.min(S.spMax, S.sp + 10);
          updateHUD();
          await say(['（你被送回大殿入口。生命与斗气回复。）']);
        }
      } },
      { text: '走进「智慧之门」', when: () => S.flags.courageDone && !S.flags.wisdomDone, run: async () => {
        await say([
          '第二道门后是一间穹顶镶嵌着星图的圆厅。厅心的石台上悬浮着一行燃烧的古文，艾莉娅低声译出——',
          '『答我：我没有生命，却会生长；我没有肺，却需要空气；水，是我的死敌。我是什么？』',
          '厅壁上浮现出三道石门，各刻着一句古语：风、火、影。',
        ]);
        for (;;) {
          const i = await choose([{ text: '「风。」' }, { text: '「火。」' }, { text: '「影。」' }]);
          if (i === 1) {
            await say([
              '「火。」你的声音在圆厅里荡开。',
              '刻着「火」的石门金光大盛，星图中一道流星坠向正确的方位。艾莉娅眼含笑意：「先王的智慧，认得后来者。」',
              '星图流转，第二道谜题浮现——',
              '『再答：晨曦四足而行，正午两足而行，黄昏三足而行。足最多时，它最弱；足最少时，它最强。此为何物？』',
              '三道石门再次浮现：江河、人、岁月。',
            ]);
            break;
          }
          await say(['石门纹丝不动，倒是你脚下的星图骤然旋转，天旋地转中一阵尖锐的刺痛扫过全身。（生命 -2）', '星图复位。艾莉娅扶住你：「再来。想想——没有生命，却会生长；没有肺，却要呼吸；怕水的……」']);
          fx({ hp: -2 });
        }
        for (;;) {
          const i = await choose([{ text: '「江河。」' }, { text: '「人。」' }, { text: '「岁月。」' }]);
          if (i === 1) {
            await say([
              '「人。」',
              '「婴儿时爬行，成年时直立，年老拄杖——晨曦即人生。」艾莉娅轻声补完谜底，眼中闪着光。',
              '两道石门同时洞开。星图在穹顶排成一条通向第三重试炼的路。',
            ]);
            setFlag('wisdomDone');
            return;
          }
          S.wrongWisdom = (S.wrongWisdom || 0) + 1;
          await say(['星图黯了一瞬，剧痛穿颅而过。（生命 -2）', '『答错了。』古文冷冷地写着。艾莉娅咬着唇提示：「足最多时最弱……刚出生的时候……那是什么时候？」']);
          fx({ hp: -2 });
        }
      } },
      { text: '走向「心灵水池」', when: () => S.flags.wisdomDone && !S.flags.heartDone, run: async () => {
        await say([
          '第三重试炼，没有门，没有谜题——只有一面平静如镜的黑色水池。',
          '你俯身望向水面。水中没有你的倒影。',
          '水面亮起：塞德里克坐在黑鸦旅店的炉火边，朝你举起酒杯，唇边带着你欠他一杯的笑。他的胸口，洇着那片深色。',
          '水纹再变：你看见另一个自己，头戴七印铸成的王冠，坐在符文王座上。他朝你伸出手，掌心向上——王座之下，万里山河俯首。',
          '艾莉娅在水池边轻声说：「心灵试炼没有标准答案。它只是……让你看清楚，你是什么人。」',
        ]);
        const i = await choose([
          { text: '向水中的塞德里克举杯，一饮而尽，道别：「这一杯，我记下了。」' },
          { text: '凝视王座上的自己，伸出手去——你想知道那种力量的滋味' },
          { text: '闭眼转身，大步穿过水池——过去已死，幻象无用' },
        ]);
        if (i === 0) {
          await say([
            '你对着水中的老人举杯，把行囊里最后一点酒一饮而尽。',
            '「欠你的那杯，记下了。」你说。水中的塞德里克笑着放下杯子，胸口那片深色淡去，化作炉火的光。',
            '王座的幻象在水纹里碎裂、退散。水池恢复平静，这一次，里面映出你的脸——你的眼睛里有一点金色的光，不是王冠的反光。',
          ]);
          fx({ rep: 1 });
        } else if (i === 1) {
          await say([
            '你凝视着王座上的自己。他笑了——那笑让你莫名安心，又莫名牙酸。',
            '你伸出手。指尖相触的一瞬，一股冰冷的力量顺着手臂游进你的血里，像一尾细小的鱼。',
            '塞德里克的幻影在水波中散开，没能道别。王座的幻象放大、占满整个水面，随即熄灭。',
            '水池恢复平静。只是你注意到，水面的金光里，缠着一缕转瞬即逝的黑线。',
            '艾莉娅看着你，什么也没说。你告诉自己是幻术，是错觉。但你的左手，在袖子里攥了一路。',
          ]);
          fx({ corruption: 1, flag: 'darkTouched' });
        } else {
          await say([
            '你闭眼大步穿过水池。身后传来幻影里遥远的呼喊，你没有回头。',
            '等走出很远，你才发现指甲掐进了掌心，渗出血珠。（生命 -3）',
            '没有回头的路，也是一种走过的方式。接住池心浮起的东西时，它在你的掌心轻轻震了一下，像一声叹息。',
          ]);
          fx({ hp: -3 });
        }
        setFlag('heartDone');
        await say(['（三重试炼完成。晨曦祭坛的封印已经松动。）']);
      } },
      { text: '走向晨曦祭坛', when: () => S.flags.courageDone && S.flags.wisdomDone && S.flags.heartDone && !S.flags.part1, run: async () => { await move('temple_altar'); } },
    ],
  },

  temple_cloister: {
    name: '圣殿回廊 · 僧舍废墟', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'dark',
    desc: [
      '环形回廊拱卫着大殿，廊柱上的彩绘在昏暗里只剩下模糊的轮廓。两侧的僧舍大多塌了顶，坍砖与尘土间，还散落着三百年来无人认领的遗物。',
      '角落里立着一座冷了的铁炉——铁须氏的守殿人，就住在这条回廊里，一代又一代。',
    ],
    brief: '环形回廊与坍塌的僧舍。铁炉早已冷却。',
    exits: {
      e: { to: 'temple_hall', label: '回大殿', flavor: '你沿回廊折回大殿，金色的穹顶重新出现在头顶。' },
      down: { to: 'temple_crypt', label: '下 · 地宫石阶', flavor: '铁炉后的石板虚掩着一道下行石阶。你们举起点燃的火把，踩着积尘下到底。' },
    },
    onEnter: async () => {
      if (S.flags.cloisterDone) return;   // 战败可重试
      await say([
        '你刚走过第三间僧舍，碎砖轻响——一间半塌的禅房里，一道黑影贴着墙缓缓立起。',
        '黑袍，兜帽，袖口那只睁开的眼睛。它观察这座圣殿，已经很久了。',
        '「圣殿的火还没熄……」斥候的声音像砂纸擦过铁器，「得让它们，彻底凉下去。」',
      ]);
      const r = await battle('scout');
      if (r !== 'win') return;
      setFlag('cloisterDone');
      await say([
        '斥候的黑袍散作烟尘。它藏身的禅房里留着一册被翻旧的手记——有人一直在监视圣殿，记录着七座祭坛的明灭。',
        '手记最后一页的字迹潦草：「晨曦将燃。报于上座：影主之意，先取星辰，后图晨曦。」',
        '（艾莉娅合上手记，神色凝重：「影蚀对七印的动作，比我们想的更快。」）',
      ]);
      give('shadow_note');
      await say(['（获得：影蚀手记——行囊中可随时翻阅。索恩看到手记时，把斧柄捏得咯咯作响。）']);
    },
    actions: [
      { text: '搜查坍塌的僧舍', when: () => !S.flags.cloisterSearched, run: async () => {
        setFlag('cloisterSearched');
        await say([
          '你逐间翻检坍塌的僧舍。积尘之下，是守殿人留下的旧日痕迹：一只缺口的木碗、一串磨亮的念珠，还有一只藏得很深的木匣。',
          '匣中是一枚铁须氏的旧印戒——戒面的合掌纹被几代人的手指磨得发亮。',
          '（金币 +10，获得：守殿人印戒 · 生命上限+4）',
        ]);
        fx({ gold: 10, item: 'old_seal' });
      } },
      { text: '查看回廊壁画', when: () => !S.flags.muralSeen, run: async () => {
        setFlag('muralSeen');
        await say([
          '回廊尽头幸存着一面完整的壁画：七位先王各自点燃一枚符文，光辉汇成一道锁链，压向深渊。',
          '第七位先王没有画脸。他的符文是纯粹的黑色，锁链在他手中断了。',
          '艾莉娅盯着那幅画看了很久：「三枚熄了……锁链，快断了。」',
        ]);
      } },
    ],
  },

  temple_crypt: {
    name: '圣殿地宫 · 守殿人寝陵', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '石阶尽头是一座低矮的穹顶寝陵。历代守殿人的石椁沿墙排开，椁盖上刻着同一句铭文：「火未熄，人不散。」',
      '最深处的一具石椁格外庄重，椁盖上按仪仗陈放着一柄长剑，剑身的经文在火把光里泛着微金——那是历代守殿人传给继任者的「咏祭礼剑」。',
      '寝陵正中的地面上，烛泪积成了小小的一座塔。三百年没人来了，烛泪却还像是新的。',
    ],
    brief: '历代守殿人的寝陵。烛泪积成的塔还带着微温。',
    exits: {
      up: { to: 'temple_cloister', label: '回圣殿回廊', flavor: '你踏上石阶，寝陵的凉意从背后一点点退去。' },
    },
    onEnter: async () => {
      if (S.flags.cryptDone) return;   // 战败可重试
      await say([
        '你走向那柄礼剑。手还没碰到剑柄，穹顶的阴影里忽然垂下一片「雾」——',
        '雾拧成人形，冷光两点的怨念无声地拦在椁前。它是历代守殿人里，那个没等到继任者的。',
        '索恩把巨斧横在身前，声音难得放轻了：「老前辈，借剑一用——这小子要干的事，您在天上看得见。」',
      ]);
      const r = await battle('wraith');
      if (r !== 'win') return;
      setFlag('cryptDone');
      give('rite_blade');
      await say([
        '人形散作碎雾，缓缓沉进石椁的缝里，像一声终于叹出来的气。',
        '你双手捧起礼剑——剑柄温的，像刚被谁握过。（获得：咏祭礼剑 · 攻击+2）',
        '椁前的烛泪塔里，你翻出守殿人攒下的几枚金币。（金币 +8）',
        '艾莉娅望着墙上最后一幅壁画出神：画上的七印锁链尽头，第七位先王没有脸，他手里握着的不是锁链，是一柄插进大地的剑。',
        '「守殿人把这句画了三百年，」她轻声说，「『火未熄，人不散』——原来不只在说他们自己。」',
      ]);
      fx({ gold: 8 });
    },
  },

  temple_altar: {
    name: '晨曦祭坛', ch: '第一部 · 晨曦之印', sub: '小节四 · 晨曦重燃', bg: BG + 'temple.svg', mood: 'holy',
    desc: ['七座祭坛之首。坛顶的晶石漆黑如夜，正随着你怀中符文碎片的悸动，一明，一灭。'],
    brief: '坛顶晶石漆黑如夜，随你怀中的碎片一明一灭。',
    exits: { s: { to: 'temple_hall', label: '回到大殿', flavor: '你从祭坛高台走下，回到大殿。' } },
    actions: [
      { text: '将晨曦之痕放上祭坛', when: () => !S.flags.part1, run: async () => {
        const weak = (S.wrongWisdom || 0) >= 2;
        if (!weak) {
          await say([
            '符文落入掌心的刹那，七座祭坛次第轰鸣——第一座祭坛顶端的晶石里，一点金光破开三百年黑暗，如星火燎原。',
            '晨曦之痕的碎片化作流光，汇入完整符文。你感到掌心一轻，又一重——塞德里克托付的东西，终于完整。',
            '与此同时，一股温热的暖流涌进四肢百骸——符文与你的呼吸同频，斗气奔涌不息。（斗气上限 +4）',
          ]);
          fx({ item: 'rune', take: 'shard', hp: 6, rep: 2, spMax: 4, flag: 'rune' });
        } else {
          await say([
            '符文落入掌心——却比传闻中黯淡。祭坛的火苗燃起，又伏低下去，摇曳不定。',
            '『试炼者三过其二。』石碑上古文浮现，『智慧有亏，晨曦蒙尘。』',
            '「差一口气。」索恩挠着胡须，「不过别撅嘴，小子——残缺的符文也是符文，锤子歪了照样砸钉子，就是费劲。」',
            '一股暖流仍涌进你的四肢——符文的余晖同样与你共鸣。（斗气上限 +4）',
          ]);
          fx({ item: 'runeWeak', take: 'shard', hp: 6, rep: 1, spMax: 4, flag: 'rune' });
        }
        await say([
          '索恩大步走来，单膝砸地，巨斧横陈：「铁须氏守殿三百年，等的就是这一刻。——{name}，俺的斧头，从今往后跟你走！」',
          '艾莉娅望着重燃的祭坛，轻声说：「一印已燃。下一枚是星辰之印——就在白石城的星塔上。」',
        ]);
        setFlag('thorne', 'part1');
        partyJoin('thorne');
        quest('q_north');
        await say([
          '✦ 索恩·铁须加入了队伍！他是独立的战斗单位，将在战斗中按「态势」挥斧陷阵：旋风斧 / 铁壁 / 战吼。',
          '当晚，你们在圣殿山下的驿站歇脚。索恩把斧头擦了三遍，艾莉娅就着火光整理新的星图。',
          '「晨曦已燃，」她用炭笔在羊皮纸上圈住白石城，「第二印『星辰之印』由艾尔多兰王室世代秘藏，供在白石城的星塔顶上。」',
          '「影蚀的爪牙一定也在赶去白石城的路上。」索恩往斧刃上啐了口唾沫，「俺们得快些。」',
          '【第一部 · 晨曦之印 · 完】——从圣殿石阶向东北下山，便是霜脊山北麓。',
        ]);
        checkpoint();
      } },
    ],
  },

  /* ==================== 第二部 · 星辰之印 ==================== */

  spur_fork: {
    name: '霜脊山北麓 · 岔路', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'warm',
    wild: true,
    desc: [
      '三日后，霜脊山北麓。',
      '去白石城有两条路：官道平坦，经山脚的驿镇补给后再走两天；白霜隘口陡峭直近，一天半可到——但隘口近来不太平，逃兵和山匪把那里当成了自家院子。',
      '怀中，晨曦符文的光与心跳同频；艾莉娅的星图上，白石城的标记旁画着一座细高的塔。',
      '「星塔，」她说，「星辰之印就供在塔顶的观星台上。」',
    ],
    brief: '山风呼啸的岔路。西面是白霜隘口，东面通官道驿镇，北面官道直达白石城。',
    checkpoint: true,
    roam: { en: 'thug', chance: 0.35, intro: '风雪里蹿出一条裹着兽皮的身影——山匪把这片山脊当成了自家院子。' },
    exits: {
      s: { to: 'temple_foot', label: '回圣殿山道', flavor: '你沿山道折返，圣殿的金顶在云缝里一闪而过。' },
      w: { to: 'frost_pass', label: '西 · 白霜隘口', flavor: '你踏上西面陡峭的隘口小道，风雪立刻扑了上来。' },
      e: { to: 'road_town', label: '东 · 官道驿镇', flavor: '你沿官道东行，山脚驿镇的炊烟渐渐可见。' },
      n: { to: 'north_road', label: '北 · 官道', flavor: '你沿官道北行。山风渐歇，路面渐渐平整起来——离白石城越来越近了。' },
    },
  },

  road_town: {
    name: '官道驿镇', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'road.svg', mood: 'warm',
    desc: [
      '驿镇不大，却热闹。南来北往的脚夫、猎户和佣兵在街上穿行，酒旗在风里招摇。',
      '你们刚寻了张桌子坐下，一个熟悉的兜帽身影便拎着货箱在对面落了座。',
      '「又见面了，符文客人。」渡鸦把货箱摊开，琥珀色的药水瓶排得整整齐齐，「北边的消息一只乌鸦先知道。要不要听听？」',
      '索恩的手按上了斧柄，艾莉娅却按住了他。这个人……总在他们需要的时候出现。',
    ],
    brief: '热闹的驿镇。酒旗招摇，渡鸦的货箱就摊在老位置。',
    exits: {
      w: { to: 'spur_fork', label: '回山麓岔路', flavor: '你出镇向西，重新走进山风里。' },
      n: { to: 'north_road', label: '北 · 官道', flavor: '你出镇北上。官道笔直，道旁的景色从市井烟火渐渐换成荒郊野店。' },
    },
    rest: { cost: 5, label: '在客栈休整一晚' },
    actions: [
      { text: '查看镇口的悬赏告示板', run: async () => {
        if (S.flags.bountyDone) {
          await say(['告示板上，红巾匪首的悬赏令已被撕下，只留下一角浆糊印。']);
          return;
        }
        if (!S.sideQuests.bounty) {
          await say([
            '告示板上钉着一张新告示，驿镇卫兵的火漆印还新鲜——',
            '『红巾匪首盘踞白霜隘口，劫掠商旅月余。取匪首首级或令其伏法者，赏金币十八枚。——官道驿镇 具』',
            '「白霜隘口就在西边山脊上，」艾莉娅看着告示轻声说，「反正我们要经过。」',
          ]);
          sideQuest('bounty');
          return;
        }
        if (S.flags.banditBeaten) {
          await say([
            '你把匪首的战斧斧缨拍在告示板前。卫兵验看之后，爽快地数出十八枚金币。',
            '「干得漂亮！商队又能走隘口了。」（悬赏达成：金币 +18，声望 +1）',
          ]);
          fx({ gold: 18, rep: 1 });
          setFlag('bountyDone');
          finishSide('bounty');
          return;
        }
        await say(['『红巾匪首盘踞白霜隘口，赏金币十八枚。』——告示还没揭。先去西边的隘口会会那位匪首吧。']);
      } },
    ],
    npcs: {
      dice: {
        name: '骰子老板娘', img: null, role: '驿镇赌摊的主人',
        talk: async () => {
          await say([
            '赌摊的油灯下，三枚骰子在碗里叮当作响。老板娘头也不抬：「三骰赌大小，五枚金币一注。手气好坏，看山神爷给不给脸。」',
            '索恩跃跃欲试地摸向钱袋，被艾莉娅一把按住。',
          ]);
          for (;;) {
            const i = await choose([
              { text: '押 5 金币，来一把', req: s => s.gold >= 5, lock: '金币不足' },
              { text: '不赌了，告辞' },
            ]);
            if (i !== 0) return;
            const roll = Math.random();
            if (roll < 0.45) {
              fx({ gold: 5 });
              await say(['骰子落定——你赢了。老板娘面无表情地推出五枚金币：「手气不错，再来？」']);
            } else if (roll < 0.55) {
              await say(['骰子在碗沿上转了三圈，躺成一个不多不少的点儿。平局，注金退回。老板娘撇撇嘴：「可惜。」']);
            } else {
              fx({ gold: -5 });
              await say(['骰子落定——你输了。老板娘笑眯眯地收走五枚金币：「山神爷今天忙着呢。」']);
            }
          }
        },
      },
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「北边的消息，一只乌鸦先知道。」渡鸦把货箱摊开——药水瓶、旧剑、皮甲与坠饰排得整整齐齐，「要看货，还是听传闻？」',
            { text: '「白石城最近有什么传闻？」', when: () => !S.flags.cityHint,
              run: async () => {
                setFlag('cityHint');
                await say([
                  '「白石城啊……」渡鸦把一枚金币抛起又接住，「女王莉安娜，登基三年，勤勉，多疑，睡得比卫兵还少。」',
                  '「她的重臣巴洛克大人，最近手伸得有点长——军械、调令、粮税，都过他的手。城里的老人说，巴洛克笑得越好，城里失踪的人越多。」',
                  '「还有件事，白送你：星塔的观星台，每逢月晦之夜会清场祭祀。今夜……恰好月晦。」',
                  '你与艾莉娅对视一眼。等你回过神，对面的桌子已经空了，只留下一小碟不知何时放上的蜜饯。',
                ]);
              } });
        },
      },
    },
  },

  frost_mine: {
    name: '封冻的银矿', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'dark',
    desc: [
      '半座山坳被矿坑吞了进去。坑口的坑木塌了一半，几辆矿车歪在结冰的辙痕里，车斗里的雪积得比车帮还高。',
      '风从坑道深处吹出来，带着铁锈味。坑口一侧的工具棚门板只剩半扇，在风里一下一下地磕着门框。',
      '艾莉娅蹲下身，拂开坑木上的雪——木头深处刻着一圈细小的记号，一圈「睁开的眼睛」。',
    ],
    brief: '塌了半边坑木的废弃银矿。风从坑道深处带出铁锈味。',
    roam: { en: ['thug', 'goblin'], chance: 0.22, fleeTo: 'frost_pass', intro: '坑道阴影里蹿出一条佝偻的身影——废弃的矿坑，如今是山匪和哥布林的仓库。' },
    exits: {
      e: { to: 'frost_pass', label: '回白霜隘口', flavor: '你退出矿坑，风雪重新罩下来，把身后的坑口糊成一片灰白。' },
    },
    onEnter: async () => {
      if (!ev('mineEnter')) return;
      await say([
        '你们在坑口落脚。雪地深处隐约传来木头的呻吟——是坑木在冻裂。',
        '索恩眯眼打量那圈「睁眼」刻痕，往地上啐了一口：「影蚀的探子到过这儿。他们盯上这座矿，不是为银子。」',
        '「山里富藏星髓银，」艾莉娅指尖抚过刻痕，「星髓是定光之石，先王铸符文基座用的就是它。若被影蚀拿去炼器，符文之锁会断得更快。」',
      ]);
    },
    actions: [
      { text: '钻进矿道深处', when: () => !S.flags.mineDeep, run: async () => {
        await say([
          '坑道向下倾斜，冻住的矿壁泛着幽蓝。转过第三道弯，你们停住了——',
          '七八个矿工围坐成一圈，帽檐垂着，帽檐下结满白霜。他们手挽着手，围坐在一盏早已熄灭的矿灯旁，像还在等谁回来点灯。',
          '他们中间的雪堆里，露出半截鼓鼓囊囊的皮口袋——是他们最后挖出来的星髓银砂。',
          '就在你俯身的时候，坑道深处的浓雾无声地立了起来——冷光两点的怨念从矿层里渗出，朝你们俯冲下来！',
        ]);
        const r = await battle('wraith');
        if (r !== 'win') return;
        setFlag('mineDeep');
        fx({ gold: 15 });
        await say([
          '怨念散成碎雾，钻进矿层的裂缝里。矿工们围坐的圈子安安静静，仿佛什么都没发生过。',
          '你捧起那袋银砂——沉甸甸的，足有十五枚金币的分量。艾莉娅用灵力细细探过：「是碎银砂，卖不上星髓的价钱，但足够换一笔盘缠了。」',
          '（金币 +15）',
          '坑壁上，影蚀的「睁眼」刻痕旁，有人用凿子狠狠划了一道叉——是矿工里有人发现了他们，然后用性命守住了这个秘密。',
          '你们把矿灯重新点亮，安回矿工围坐的圈子中央。灯光照着霜白的手，也照着来路。',
        ]);
      } },
      { text: '翻检坑口的工具棚', when: () => !S.flags.mineShed, run: async () => {
        setFlag('mineShed');
        await say([
          '工具棚里落满雪。铁镐、断绳、冻裂的酒囊——最后一批离开的人走得又急又乱。',
          '酒囊底下压着一只小铁盒，是矿上记账先生的样式。里面是几枚没来得及发下去的工钱。（金币 +3）',
        ]);
        fx({ gold: 3 });
      } },
    ],
  },

  north_road: {
    name: '官道 · 溃兵营地', ch: '第二部 · 星辰之印', sub: '小节二 · 官道北行', bg: BG + 'road.svg', mood: 'dark',
    wild: true,
    desc: [
      '官道在一处破败的茶棚旁拐了个弯。棚子外的空地上扎着十几顶东倒西歪的帐篷——不是军营的规整，是败兵的潦草。',
      '十几个卸了甲的士兵围着火堆，甲衣上还带着白石城卫戍的徽记。他们看见你们，火堆后的手都按上了兵器，看清索恩的斧子和你们的来路后，又颓然松开。',
    ],
    brief: '破茶棚旁的溃兵营地。甲衣上还带着白石城的徽记。',
    checkpoint: true,
    exits: {
      s: { to: 'spur_fork', label: '回山麓岔路', flavor: '你沿官道折返南下，重新走进山风里。' },
      e: { to: 'road_town', label: '东 · 官道驿镇', flavor: '你踏上下山的岔道，驿镇的炊烟渐渐可见。' },
      n: { to: 'whitestone_gate', label: '北 · 白石城', flavor: '官道在旷野上铺开。两天后，白石城的白墙在云层下静静发着光。' },
    },
    onEnter: async () => {
      if (!ev('deserterCamp')) return;
      await say([
        '一个满脸胡茬的什长迎上来，抱拳的动作还算规整，眼神却躲闪：「客官……借道可以，别声张。」',
        '艾莉娅看清他们的徽记，蹙起眉：「白石城卫戍？你们不在城头，怎么在这里？」',
        '什长的脸涨红了，又白了：「『北境换防』！三个月前，巴洛克大人签发的调令——可北境连个像样的哨塔都没有！粮饷断了半个月，弟兄们回又不敢回，逃兵是要掉脑袋的！」',
      ]);
      const i = await choose([
        { text: '留下银钱和干粮，稳住军心', req: s => s.gold >= 5, lock: '金币不足' },
        { text: '细问调令与粮饷的经手人' },
        { text: '绕开营地，不多纠缠' },
      ]);
      if (i === 0) {
        fx({ gold: -5, rep: 1 });
        setFlag('deserterClue');
        await say([
          '你把五枚金币和干粮塞进什长手里。什长的眼圈一下子红了：「客官……你放心往北去。若城里有变，弟兄们在这条道上，随叫随到。」',
          '（声望 +1。临别时，什长把调令的抄本塞给你——「兴许用得上。」）',
          '（获得线索：北境换防的调令出自巴洛克之手，粮饷却在同一处被截留。）',
        ]);
      } else if (i === 1) {
        setFlag('deserterClue');
        await say([
          '「经手人？」什长苦笑，「军械、调令、粮饷，全走巴洛克大人的私库账房。我们只看见粮车一趟趟往回拉，可营里的锅，比脸还干净。」',
          '「最邪门的是，」他压低声音，「上个月起，营里夜里总有人失踪。去找的，也没回来。弟兄们都说，是『不会在雪地留脚印的东西』来点名了。」',
          '（获得线索：调令、粮饷皆经巴洛克之手；营中失踪，与影蚀的动向吻合。）',
        ]);
      } else {
        await say(['你们贴着官道另一侧绕开营地。身后，隐约传来士兵们的争吵声：「……回城是死，蹲在这儿也是死……」']);
      }
    },
    actions: [
      { text: '在茶棚歇脚，听听过往行商的消息', when: () => !S.flags.teaHouseChat, run: async () => {
        setFlag('teaHouseChat');
        await say([
          '茶棚里只剩一位跑单帮的老掌柜。他给你们续上热水，闲话般地念叨：',
          '「白石城这半年邪性。先是城防军一波波往北调，后来呢，夜里宵禁，天不亮就有人家『丢了人』。老朽我跑货三十年，头一回见着，城墙根下的草都长得比别处心虚。」',
          '他临走时多看了你一眼：「客官带兵器的，进了城，眼睛放亮些。」',
        ]);
      } },
    ],
  },

  frost_pass: {
    name: '白霜隘口', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'dark',
    wild: true,
    desc: [
      '隘口的风雪比传说中更烈。翻过最高点时，一群裹着兽皮的汉子从岩石后围上来，为首的红巾汉子扛着战斧，笑得很豪爽。',
      '「风口浪尖赶路的贵客！识相的，留下买路财——十五个金币，或者那把像样的剑。」他目光扫过艾莉娅和索恩，又补了一句，「矮子也行，我们山寨缺个打铁的。」',
      '索恩的斧头已经出了半鞘。',
    ],
    brief: '风雪肆虐的隘口。岩石上还留着斧凿的记号。',
    exits: {
      e: { to: 'spur_fork', label: '回山麓岔路', flavor: '你退回岔路，风雪在身后合拢。' },
      n: { to: 'north_road', label: '北 · 下山官道', flavor: '你穿过隘口北坡，风雪渐歇，官道在山下铺开。' },
      w: { to: 'frost_mine', label: '西 · 废弃矿坑', flavor: '你踏进隘口西侧的背风坳地。塌了一半的坑木与生锈的矿车辙，从雪底下露出来。' },
    },
    onEnter: async () => {
      if (S.flags.banditEventDone) return;   // 战败可重试；缴路费/借名号则视为了结
      const i = await choose([
        { text: '拔剑——让他们知道什么叫流浪剑客' },
        { text: '扔下15金币，赶路要紧', req: s => s.gold >= 15, lock: '金币不足' },
        { text: '亮出旅途中挣下的名号，喝令让路', req: s => s.rep >= 2, lock: '声望不足，山匪不信名号' },
      ]);
      if (i === 0) {
        await say(['「敬酒不吃——」红巾汉子把斧头抡了个圆，「吃斧头！」']);
        const r = await battle('bandit');
        if (r !== 'win') return;
        setFlag('banditBeaten', 'banditEventDone');
        give('bandit_blade');
        await say([
          '红巾头子的弯刀也落在了雪里——你顺手捡了起来。（获得：山匪弯刀）',
          '艾莉娅把其余财物留在路边：「饿肚子的人劫道，不只是因为他们坏。」',
          '山道尽头，白石城的白墙在云层下静静发着光。',
        ]);
      } else if (i === 1) {
        fx({ gold: -15 });
        setFlag('banditEventDone');
        await say(['金币落进他掌心，红巾汉子笑容豪爽地让开一条道：「好说好说！贵客慢走——」']);
      } else {
        setFlag('banditEventDone');
        fx({ rep: 1 });
        await say([
          '你向前一步，报出你这一路挣下的名号，和几个他们显然听说过的地名。',
          '红巾汉子的笑容渐渐消失。他凑近端详你的脸，忽然把斧头往肩上一扛，朝弟兄们摆手：「收了收了！这条道上出这号人物，是山神爷赏脸。」',
          '他让开半步，又低声加了一句：「贵客既是从圣殿山下来的——夜里绕着点塔楼走。前些日子，俺们弟兄见过『不会在雪地留脚印的东西』往城里摸。」',
          '（获得情报：影蚀的斥候已潜向白石城）',
        ]);
      }
    },
  },

  whitestone_gate: {
    name: '白石城门', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '白石城——艾尔多兰的都城，白墙如霜，塔尖挑着金色的旗。而那座细高的星塔，就立在王城最深处，塔顶一颗蓝白色的宝石在暮色里明灭。',
      '可越靠近，越不对劲：护城河的水泛着墨色，城门口的商队排成长龙，人人噤声。',
    ],
    brief: '白墙如霜的都城。护城河的水泛着墨色。',
    checkpoint: true,
    exits: {
      s: { to: 'road_town', label: '南 · 回官道驿镇', flavor: '你沿官道南下，回到驿镇。' },
      sw: {
        to: 'coast_road', label: '西南 · 南下潮歌湾', flavor: '你踏出南门，折向西南的官道。两天后，风里的咸味渐渐压过了草香——海，快到了。',
        req: s => s.flags.part2, lock: '星辰之印尚未落定，海路的传闻还太远',
      },
      n: { to: 'whitestone_street', label: '进城', flavor: '你穿过门洞。城内的空气比城门更沉。', req: s => s.flags.inCity, lock: '城门守卫横矛拦住了去路。' },
    },
    onEnter: async () => {
      if (S.flags.inCity || !ev('gateCheck')) return;
      await say(['城门守卫横矛拦住你们：「站住。最近城里丢了不少人，检查。」他目光扫过艾莉娅的尖耳朵和索恩的巨斧，眉头拧紧，「半精灵？矮人？这些日子，你们这样的可不受欢迎。」']);
      const hasRune = S.items.rune || S.items.runeWeak;
      const i = await choose([
        { text: '出示晨曦符文，表明符文之约的来意', when: () => hasRune },
        { text: '悄悄塞给卫兵什长10金币，「行个方便」', req: s => s.gold >= 10, lock: '金币不足' },
        { text: '谎称是佣兵小队，赌一把守卫的耐心' },
      ]);
      if (i === 0) {
        await say([
          '你摊开手掌。符文的金光在阴天里依然柔和地亮着。',
          '什长的脸色变了。他单膝跪下的动作快得让同僚不知所措——「先王的信物……卫戍条例第一条：见符文者，如见先王。」',
          '「抱歉，大人。城里……城里出了些事，我们不得不谨慎。请进。」',
          '你扶起他，从他慌乱的眼神里读到了比敌意更有用的东西：恐惧。白石城在怕什么？',
        ]);
        fx({ rep: 1 });
      } else if (i === 1) {
        fx({ gold: -10 });
        await say([
          '金币滑进掌心的动作快得像没有发生过。什长掂了掂，朝身后努努嘴：「进吧。别惹事，也别被惹。」',
          '艾莉娅在你身后轻声说：「贿赂买不来忠诚，只买来暂时的闭嘴。」你没有反驳——因为你已经注意到，什长收钱时一直在看城头的方向，像在确认没有别人看见。',
        ]);
      } else {
        await say(['你压低帽檐，操起三年流浪练出的市井腔调：「佣兵！护送学者和矿师的队伍！城里老爷们最近不都在雇人守夜吗？」']);
        if (Math.random() < 0.65) {
          await say(['守卫嫌恶地挥手赶人：「快进去，别在门洞里碍事！」', '索恩憋着笑意与你们并肩穿过门洞。演技有时比剑更好用。']);
        } else {
          fx({ hp: -1 });
          await say([
            '「佣兵？」守卫头目挑起眉毛，「最近假佣兵偷摸踩点的案子有三起了。都带下去！」',
            '你在潮湿的牢房里蹲了一夜，最后是艾莉娅出示学者徽记、签下保书才把你捞出来。（生命 -1）',
            '「下次，」她把徽记收好，没好气地说，「让我来撒谎。」',
          ]);
        }
      }
      setFlag('inCity');
      quest('q_city');
      await say(['（城门已开。北面就是城中大街。）']);
    },
  },

  whitestone_street: {
    name: '白石城 · 大街', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '城内比城门更压抑。商铺半闭，街上行人行色匆匆，随处可见新贴的告示：戒严、宵禁、失踪人口。',
      '告示末尾署着大臣巴洛克的名字，签名的花体字张扬得意。街角老妇的啐骂声很低：「又是巴洛克大人的告示……失踪的怎么不见他管？」',
      '王城的尖塔在前方，星塔的塔尖从王宫建筑群中拔起，直指暮色渐浓的天空。',
      '今夜，月晦。',
    ],
    brief: '半闭的商铺，匆匆的行人，贴满告示的墙。星塔的尖顶在北面。',
    exits: {
      s: { to: 'whitestone_gate', label: '出城 · 南门', flavor: '你穿过门洞，回到城外的官道。' },
      w: { to: 'west_alley', label: '西 · 城西小巷', flavor: '你拐进城西小巷。宵禁的告示钉在巷口，巷子深处的窗子全黑着。' },
      e: { to: 'city_market', label: '东 · 白石市集', flavor: '你向东走进白石市集。尽管戒严，早市的吆喝声还是固执地活着。' },
      n: { to: 'palace_hall', label: '北 · 王宫大殿', flavor: '你沿着白石铺就的御道北行，王宫的尖塔在头顶投下阴影。' },
      sw: { to: 'lower_quarter', label: '西南 · 下城区', flavor: '你沿下坡的石阶拐进西南角的下城区。这里的墙皮剥落得更厉害，但烟火气反而更旺。' },
    },
    actions: [
      { text: '研读墙上的告示', run: async () => {
        await say([
          '戒严。宵禁。失踪人口——告示一张叠着一张，浆糊还没干透。',
          '签发的花体签名张扬得意，最后一笔绕成一个精巧的圈。你多看了两眼——那个圈，像一只眼睛。',
        ]);
      } },
      { text: '与街角老妇交谈', run: async () => {
        if (S.sideQuests.lost === 'active' && (S.items.watch || 0) > 0) {
          await say([
            '你把怀表递过去。老妇的手抖得厉害，摩挲着表盖内侧那行小字，眼泪一下子涌了出来。',
            '「艾德温……好孩子，是艾德温的。」她朝你深深弯下腰，「后生，你是个好人。这支表，老身替他收着了——这个你拿着，别推辞，老婆子最后一点心意。」',
          ]);
          take('watch');
          fx({ gold: 12, rep: 2 });
          finishSide('lost');
          await say([
            '（报酬：金币 +12，声望 +2）',
            '她攥着怀表压低声音：「入夜后别出门……上个月起，夜里的巷子会『走人』。不是活人走路的走法。」',
          ]);
          return;
        }
        if (S.sideQuests.lost === 'active') {
          await say(['「城西小巷……孩子，你千万小心。」老妇攥着衣角，「那巷子入夜就不对劲。艾德温就是在那儿没的影。」']);
          return;
        }
        await say([
          '老妇压着嗓子：「后生，听一句劝——入夜别出门。上个月，王城西巷的墨匠学徒，艾德温，给王宫送墨就没回来。官府说查了，查了个寂寞。」',
          '她抹了把眼睛：「要是有心，去城西小巷替老婆子看一眼……活要见人，死、死也要个信儿。」',
        ]);
        sideQuest('lost');
      } },
    ],
  },

  west_alley: {
    name: '白石城 · 城西小巷', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '小巷又窄又深，两侧的屋檐几乎在头顶合拢。墨坊的后门虚掩着，门环上结了一层灰。',
      '墙根下散落着几件没人认领的物件：一只鞋、半截灯绳、一枚滚进阴沟的铜币。宵禁后的巷子，静得能听见自己的血在耳朵里走。',
    ],
    brief: '又窄又深的巷子。墨坊后门虚掩，墙根散落着没人认领的物件。',
    exits: {
      e: { to: 'whitestone_street', label: '回大街', flavor: '你贴着墙根退出小巷，大街上的火光让人心里踏实了些。' },
    },
    onEnter: async () => {
      if (S.flags.alleyDone) return;   // 战败可重试
      await say([
        '你循着巷子往深处走。一堵矮墙后，微弱的月光照亮了半枚陷进泥里的东西——一只铜怀表，表盖内侧刻着「赠吾徒·艾德温」。',
        '就在你俯身去捡的时候，巷子两头的阴影同时立了起来——是盯上这条巷子的山匪，他们专捡宵禁后没人管的小巷摸黑「捡漏」。',
      ]);
      const r = await battle('thug');
      if (r !== 'win') return;
      setFlag('alleyDone');
      fx({ item: 'watch' });
      await say([
        '你从泥里拾起怀表，擦干净收好。（获得：学徒的怀表）',
        '墙角还有一小袋匪徒们摸黑攒下的铜钱。（金币 +6）',
      ]);
      fx({ gold: 6 });
      await say(['（回到大街，把怀表交给街角老妇吧。）']);
    },
    roam: { en: 'thug', chance: 0.3, intro: '巷子深处的黑影又立了起来——宵禁后的巷子，从来不安全。' },
  },

  city_market: {
    name: '白石城 · 白石市集', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '戒严挡不住早市。腌菜桶、香料袋、铁匠铺的锤声，把半条街熏得热气腾腾。',
      '街角，一辆漆成鸦羽色的货车稳稳停在老位置，货箱敞开，琥珀色的药水瓶映着火光。',
      '「都城的消息最贵，」兜帽人朝你招招手，「但卖给老朋友，还是老价钱。」',
    ],
    brief: '戒严里依旧热闹的市集。渡鸦的货车停在街角老位置。',
    exits: {
      w: { to: 'whitestone_street', label: '回大街', flavor: '你出市集向西，回到白石大街。' },
      n: { to: 'city_barracks', label: '北 · 卫戍营房', flavor: '你绕过市集北面的空场。操练场上星纹旗低垂，兵器架擦得锃亮。' },
    },
    npcs: {
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「老朋友，」渡鸦把货箱摊开，「夜路走多的人，得备浓一点的药。」',
            { text: '「城西最近为什么鬼影憧憧？」', when: () => !S.flags.alleyHint,
              run: async () => {
                setFlag('alleyHint');
                await say([
                  '「城西？」乌鸦歪了歪头。',
                  '「宵禁是给活人定的。可最近夜里，城西小巷有『不该走动的东西』走动——官府贴告示说没事，你们猜，失踪的人都在哪儿没的？」',
                  '「有人在那儿丢了东西，也有人在那儿捡到过东西。」兜帽朝大街的方向偏了偏，「街角那位老婆婆，念了她徒弟一个月了。」',
                ]);
              } });
        },
      },
    },
  },

  lower_quarter: {
    name: '白石城 · 下城区', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '下城区贴着城墙的西南角，歪斜的木屋层层叠叠，晾衣绳在楼宇间织成一张灰网。',
      '赈粥棚前排着长队，队伍安静得过分——大人们把孩子的手攥得很紧。墙上钉满了寻人的墨牌，一层摞着一层，像枯死的树皮。',
      '宵禁前的下城区比大街有人气，也比大街更沉。',
    ],
    brief: '歪斜木屋间的下城区。赈粥棚前的长队安静得过分。',
    roam: { en: 'thug', chance: 0.18, fleeTo: 'whitestone_street', intro: '巷口的黑影晃了晃——下城区的宵禁，比别处来得更早。' },
    exits: {
      ne: { to: 'whitestone_street', label: '回大街', flavor: '你踏上石阶回到大街。身后，粥棚的木牌在风里轻轻磕碰。' },
    },
    npcs: {
      crone: {
        name: '赈粥的老嬷嬷', img: null, role: '下城区赈粥棚的当家人',
        talk: async () => {
          if (S.flags.quarterAlms) {
            await say(['老嬷嬷朝你点点头，把勺子在锅沿敲了敲：「恩人来了。今天的粥稠，孩子们都念叨你。」']);
            return;
          }
          await say([
            '老嬷嬷掌着一把比胳膊还长的大木勺，往你的方向让了让：「后生，喝碗热的再走？下城区不问来路。」',
            '她压低声音：「兵都调走了，粮税却一分没少。这半年，锅一天比一天稀——钱都到哪儿去了，谁心里没数呢。」',
          ]);
          const i = await choose([
            { text: '往粥棚的钱匣里放五枚金币', req: s => s.gold >= 5, lock: '金币不足' },
            { text: '买一碗热粥驱驱寒（1金币）', req: s => s.gold >= 1, lock: '金币不足' },
            { text: '道谢告辞' },
          ]);
          if (i === 0) {
            fx({ gold: -5, rep: 1 });
            setFlag('quarterAlms');
            await say([
              '你把钱匣的盖子掀开一角，银币落进去的轻响被沸粥声盖住了。老嬷嬷却像是背后长了眼睛，冲你深深弯下腰。',
              '「好人呐。」她直起身，忽然凑近，「既然是恩人，老婆子多句嘴——宵禁后的城西小巷，千万别走。上个月起，那巷子『吃人』。官府不管，是因为官府里有人乐意它吃。」',
              '（声望 +1。获得传闻：城西小巷的失踪，或许有人刻意纵容。）',
            ]);
            if (!S.flags.alleyHint) { setFlag('alleyHint'); await say(['（渡鸦的传闻得到了印证——巷子的事，比你想的更深。）']); }
          } else if (i === 1) {
            fx({ gold: -1, hp: 2 });
            await say(['粥很稠，姜很重，一碗下去，从喉咙一路暖到指尖。（生命 +2）']);
          } else {
            await say(['老嬷嬷也不勉强，挥挥木勺：「天黑前赶回大街去。下城区的夜，比别处黑得早。」']);
          }
        },
      },
    },
    actions: [
      { text: '查看墙上的寻人墨牌', when: () => !S.flags.missingBoard, run: async () => {
        setFlag('missingBoard');
        await say([
          '墨牌一层摞着一层，年头久的字迹已经洇开。你逐块看过去——挑夫、绣娘、更夫、学徒……失踪的人有一个共同点：都住在下城，都在夜里没的影。',
          '最新的一块墨迹未干：「艾德温，墨匠学徒，十四岁，未归。母泣书。」',
          '你想起大街街角那位念叨徒弟的老妇。这块墨牌替她把话又喊了一遍。',
        ]);
      } },
    ],
  },

  city_barracks: {
    name: '白石城 · 卫戍营房', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '营房挨着市集北面的空场，操练场的兵器架擦得锃亮，旗杆上的星纹旗在暮色里垂着。',
      '操练的卫兵只有寥寥十几人——按白石城卫戍的编制，这里本该站满百人。空出的营房木门上着锁，锁上却没落灰。',
      '一个宽肩的军官正在场边磨枪，见你们打量空营房，眉头拧了个结。',
    ],
    brief: '空了一半的操练场。宽肩军官在场边磨枪。',
    exits: {
      s: { to: 'city_market', label: '回白石市集', flavor: '你离开营房，市集的吆喝声重新涌进耳朵。' },
    },
    npcs: {
      captain: {
        name: '贝伦队长', img: null, role: '白石城卫戍 · 值星官',
        talk: async () => {
          if (ev('barrackIntel')) {
            await say([
              '贝伦队长把磨枪的油布收起来，打量你们良久，忽然开口：「外乡人，我看你们不像生事的人，问你们一句——你们进城时，城门上站了几个兵？」',
              '「编制是四十。如今连一半都凑不出。三个月里，一支支千人队被调令抽走，都说是『北境换防』。」他把油布攥成一团，「可北境连封战报都没有。兵走了，粮饷也走了，走到哪儿去了？」',
              '「我递过三次呈文。三次都批回来同一行字：『勿听妄言，恪尽职守』——批印的，都是巴洛克大人。」',
              '（获得情报：城防空虚，调令皆出自巴洛克之手。）',
            ]);
            if (!S.flags.deserterClue) { setFlag('deserterClue'); await say(['（线索入手：这与溃兵营地的调令，指向同一只手。）']); }
          } else {
            await say(['贝伦队长冲空了一半的营房扬扬下巴：「别看这儿空。兵还在城里的，都是能打的。有事，喊一嗓子就到。」']);
          }
          const i = await choose([
            { text: '跟弟兄们过两招（押 10 金币，切磋赌彩头）', req: s => s.gold >= 10, lock: '金币不足' },
            { text: '拱手告辞' },
          ]);
          if (i !== 0) return;
          for (;;) {
            await say(['卫兵们吆喝着围拢过来。队长挑了个最壮的：「上！让客人见识见识白石城的门面！」']);
            const win = Math.random() < Math.min(0.8, 0.4 + S.level * 0.05);
            if (win) {
              fx({ gold: 10, rep: 1 });
              await say([
                '三招两式，你剑背一翻，磕开了对方的枪杆，剑尖在他胸前停住。',
                '操练场轰然叫好。贝伦队长大笑，把彩头拍进你手里：「好剑！这十枚金币你拿去——替白石城涨了脸！」',
                '（彩头 +10 金币，声望 +1）',
              ]);
            } else {
              fx({ gold: -10 });
              await say([
                '那卫兵枪出如龙，你挡了七招，第八招上肩膀吃了一记枪杆，踉跄着退出圈子。',
                '「承让！」卫兵收枪行礼。贝伦队长耸耸肩：「白石城的门面，可不是白当的。彩头归弟兄们打酒了。」',
                '（彩头 -10 金币）',
              ]);
            }
            const j = await choose([
              { text: '再来一场', req: s => s.gold >= 10, lock: '金币不足' },
              { text: '抱拳收剑' },
            ]);
            if (j !== 0) return;
          }
        },
      },
    },
  },

  palace_hall: {
    name: '王宫大殿', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '出乎意料，觐见批得很快。快得可疑。',
      '觐见厅里，年轻的莉安娜女王坐在王座边缘而非正中，像随时准备起身。她的眼下有浓重的黑影，但眼神依旧锋利如新磨的剑。',
      '「晨曦符文……」她盯着你掌心的金光，声音很轻，「先王的遗物竟真的重现了。你们说，塞德里克贤者死了，死在影蚀刺客手里——而下一枚，就是朕的星辰之印。」',
      '「星辰之印认王的血。」女王忽然笑了，笑意冷得很，「历代先王都这么告诉朕。而朕的重臣巴洛克大人——」她朝殿侧一瞥，那位笑容可掬的大臣正躬身行礼，「近来对星塔的祭典，比对国库还要上心。」',
      '女王站起身：「今夜是月晦祭典，星塔清场。你们既然带着先王的信物，就留下来赴宴。有些事……我希望借你们的眼睛看一看。」',
    ],
    brief: '觐见厅。王座边缘的女王，殿侧笑容可掬的巴洛克。',
    exits: {
      s: { to: 'whitestone_street', label: '回大街', flavor: '你走出大殿，暮色已经压上了宫墙。' },
      w: { to: 'palace_library', label: '西 · 藏书阁', flavor: '你沿西廊走向藏书阁。老司书的灯，在书架深处亮着。' },
    },
    npcs: {
      liana: {
        name: '莉安娜女王', img: CH + 'liana.svg', role: '白石城统治者 · 符文王座的继承者',
        talk: async () => {
          if (S.flags.exposed) await say(['「今夜之后，」女王望着星塔的方向，「朕会重修城防，清算党羽。符文之约的名字——走好接下来的路。」']);
          else if (S.flags.evidence) await say(['女王的目光扫过大殿：「有话，就当着满朝文武说。」（你可以当庭揭发巴洛克）']);
          else await say(['女王正与臣工议事，向你微微颔首。宴席与文书，皆由管家安排。']);
        },
      },
    },
    actions: [
      { text: '赴宴，在推杯换盏间观察巴洛克', when: () => !S.flags.clueLetter, run: async () => {
        await say([
          '晚宴上，巴洛克的酒量好得出奇，谈吐更是滴水不漏。他向你敬酒：「护送符文的游侠！王国的英雄。来，敬先王。」',
          '你举杯。就在衣袖扬起的一瞬，你看见他腕口内侧的刺青——一只睁开的眼睛。',
          '和刺客袖口上的那只，一模一样。',
          '你不动声色地移开目光。艾莉娅在桌子那头与你视线一碰，几不可察地点头：她也看见了。',
          '宴散。你们各自回房，约好三更在后花园碰头。当夜你辗转难眠——透过窗缝，你看见一个熟悉的身影闪出了侧门，溜向后花园深处。',
        ]);
        setFlag('clueLetter');
      } },
      { text: '托辞疲惫，请女王允许查阅城防调令——军队才是关键', when: () => !S.flags.clueLetter, run: async () => {
        await say([
          '管家的反应比你想的快。几乎在你开口后一刻钟，一份誊抄的调令就送到了你手上——快得反常，像是早就备好了。',
          '调令显示：三个月内，城防军三个千人队被陆续调往「北境换防」。而北境，根本没有战报。',
          '签发人一栏，巴洛克的花体签名的最后一笔，绕成了一个精巧的圈——像一只眼睛。',
          '当夜你辗转难眠。透过窗缝，你看见一个熟悉的身影闪出侧门，溜向后花园深处。',
        ]);
        setFlag('clueLetter');
      } },
      { text: '三更 · 潜入后花园', when: () => S.flags.clueLetter && !S.flags.evidence, run: async () => { await move('garden_night'); } },
      { text: '当庭揭发巴洛克', when: () => S.flags.evidence && !S.flags.exposed, run: async () => {
        const lines = [
          '大殿之上，你把一切呈给女王与满朝文武。巴洛克起初还笑着周旋，直到艾莉娅指出调令暗纹里的「魔眼」——那花体签名的最后一笔。',
        ];
        if (S.flags.libClue) lines.push(
          '「且先王起居注有载：历代先王家徽皆为合掌，从未有过『睁眼』。」艾莉娅展开从藏书阁抄录的书页，字迹历历，「大人这份家徽，来得蹊跷。」',
          '满朝文武哗然。巴洛克的面色第一次绷不住了。');
        if (S.flags.deserterClue) lines.push(
          '你呈上溃兵什长抄录的调令：三个月间，三支千人队以「北境换防」之名被调离城防——粮饷却在中途被巴洛克的私库账房截留。',
          '「北境无战报，无哨塔，无一兵接防。」你一字一句，「大人调空的，是星塔的守军。」');
        lines.push(
          '「陛下明鉴，此乃家徽——」',
          '「你的家徽，」女王缓缓起身，声音不高，大殿却安静得可怕，「是只睁开的眼睛。而先王的家徽，是合拢的手。」',
          '巴洛克的笑容凝固了。他暴起发难，掏出淬毒短刃扑向王座——被索恩一斧柄砸落下颏，卫兵按倒在地。从他袖中，抖落出三枚影蚀徽记，和一份墨迹未干的密信。',
          '女王展开密信，脸色一寸寸变白——',
          '『月晦之夜，影蚀领主亲取星辰之印。大人只需调开星塔守军。』',
          '「今夜，」女王的声音绷得像弓弦，「就是月晦。塔上祭典已经清场——那是朕亲定的规矩，如今成了他的门。」',
          '远处，星塔顶端的蓝白宝石，骤然暗了一下。');
        await say(lines);
        fx({ item: ['warrant', 'guard_mail'], gold: 30, rep: 3 });
        setFlag('exposed');
        quest('q_tower');
        await say(['（女王授予你通行证、三十金币作盘缠，还命人取来一件卫戍锁甲。星塔的入口已经开启。）']);
      } },
      { text: '登星塔', when: () => S.flags.exposed && !S.flags.part2 && !S.flags.gameClear, run: async () => { await move('star_tower_base'); } },
    ],
  },

  palace_library: {
    name: '王宫藏书阁', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '藏书阁比大殿安静百倍。松木与旧纸的气息里，一排排书架高抵穹顶，唯有最深处一盏老司书的油灯亮着。',
      '星塔的图纸、历代星官的手稿、《先王起居注》——星辰之印守护者的记忆，都收在这方寸之间。',
    ],
    brief: '高抵穹顶的书架。老司书的油灯在深处亮着。',
    exits: {
      e: { to: 'palace_hall', label: '回大殿方向', flavor: '你合上书卷，沿西廊回到大殿方向。' },
    },
    onEnter: async () => {
      if (!ev('libraryVisit')) return;
      await say([
        '老司书从书架后探出头，眯眼打量你掌心的符文，忽然压低了声音：「先王的信物……老朽等这本书的读者，等了三十年。」',
        '「《观星台机关图志》，只有半册——另一半在星塔失窃时丢了。若你要上塔，这残页兴许能救命：中层星厅的星盘机关，认刻度，不认血。」',
      ]);
    },
    actions: [
      { text: '取阅《观星台机关图志》残页', when: () => !S.items.tower_page, run: async () => {
        fx({ item: 'tower_page' });
        await say([
          '残页上是一幅黄铜星盘的图样，环形刻度旁注着蝇头小楷：「月晦之夜，将刻度对准『晨钟星』——机关认光，亦认声。」',
          '（获得：机关图志·残页——星塔中层星厅的谜底，就在这一页上。）',
        ]);
      } },
      { text: '研读《先王起居注》', when: () => !S.flags.libClue, run: async () => {
        setFlag('libClue');
        await say([
          '起居注逐年记着王室的旧事。翻到三百年前的一页，你停住了——',
          '『先王家徽，代代合掌。取「封印之手」之意：手合则印固，手张则印倾。』',
          '（你把这一页抄了下来。若有机会当面对质，这句记载或许比刀剑更锋利。）',
        ]);
      } },
    ],
  },

  garden_night: {
    name: '王宫后花园', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'dark',
    desc: ['枯藤架下虫声渐熄。三更的花园，连月光都像是屏住了呼吸。'],
    brief: '三更的后花园，枯藤架在夜风里轻轻摇晃。',
    exits: { s: { to: 'palace_hall', label: '回大殿方向', flavor: '你贴着回廊的阴影，悄悄退回大殿方向。' } },
    onEnter: async () => {
      if (S.flags.evidence) return;   // 战败可重试，直到拿到证据
      await say([
        '你与艾莉娅、索恩会合在后花园的枯藤架下，前方假山后的密道铁门虚掩着，门缝里漏出摇曳的光。',
        '低语声顺着夜风飘来：「……星塔的祭典名单到手了，大人。月晦之夜，影主亲许的行动……」',
        '是巴洛克的声音。他们在今夜动手——目标正是星辰之印！',
      ]);
      const i = await choose([
        { text: '独自贴墙靠近，听个明白' },
        { text: '与艾莉娅配合：她布下静音结界，你们一起摸近' },
        { text: '吹响卫兵哨，当场拿人' },
      ]);
      if (i === 0) {
        await say([
          '你猫着腰贴近假山。透过石缝，你看见巴洛克正把一份祭典名单递给黑袍人，黑袍人的脸藏在兜帽里，只有一只泛着紫光的眼睛。',
          '「星辰归影，王座归您。」黑袍人低声道，「大人，影主许诺的领地——」',
          '你的脚下，枯枝「咔」地一声。',
          '黑袍人的头颅以诡异的角度转过来：「小小的游侠，耳朵倒是灵。」',
          '紫光爆裂！巴洛克尖叫着逃离，黑袍人拔出了漆黑的巨剑——',
        ]);
        const r = await battle('shadowknight');
        if (r !== 'win') return;
      } else if (i === 1) {
        await say([
          '艾莉娅十指结印，一层近乎透明的薄幕罩住你们三人。声音和气息都被隔绝在外。',
          '你们贴着假山听见了一切：星塔祭典的名单、月晦之夜的行动、「影主许诺的领地」。黑袍人收起名单时，把一只黑铁匣子递给巴洛克：「定金。影主说，大人会需要它压住良心。」',
          '巴洛克揣起匣子匆匆离去。而黑袍人转身走向密道深处——你当机立断，与索恩、艾莉娅前后夹击！',
          '短暂的交手后，黑袍人丢下披风遁入黑暗。地上留下的，是那只黑铁匣子。',
        ]);
      } else {
        await say([
          '哨音撕破夜空。火把从四面八方涌向花园——但等卫兵包围假山时，密道里只剩下残余的紫雾和一地烧剩的纸灰。',
          '「游侠夜闯王宫花园！」赶来的宫廷卫队长盯着你，再看看你腰间的剑，「巧了，通缉令上画的正是这把剑。拿下！」',
          '局面骤然倒转。危机时刻，艾莉娅举起晨曦符文——金色的符文光辉照亮夜空，如黎明提前降临。',
          '卫队长单膝砸在地上：「先王在上……属下有眼无珠！」',
          '黑袍人和巴洛克趁着混乱双双消失。你们没能当场拿人，但很快，你会让真相自己走进大殿。',
        ]);
        await sleepMs(400);
        await move('palace_hall');
        return;
      }
      // 黑匣
      if (i !== 2) {
        await say([
          '匣子没有锁。掀开的一瞬，一股寒意钻上你的手臂——里面垫着黑绒，绒上躺着一枚拇指大的黑石。',
          '石头深处有微光缓缓转动，像一只沉睡的眼睛。贴着掌心，你几乎能听见极轻微的、心跳般的搏动。',
          '艾莉娅的指尖刚碰到石头就猛地缩回：「深渊的黑石……是影蚀力量的『种』。把它交给圣殿可以用于反制研究，但带在身上……它会试着跟你说话。带上它，就要一直听。」',
        ]);
        const j = await choose([
          { text: '收下黑石——知己知彼，再说这东西对圣殿有用' },
          { text: '盖上匣子。「有些东西不该由我保管。」' },
        ]);
        if (j === 0) { fx({ item: 'gem', corruption: 1, flag: 'darkTouched' }); }
        else { fx({ rep: 1 }); }
      }
      await say([
        '无论过程如何——你手里握着足够掀翻巴洛克的证据：黑袍密会的目击、影蚀的纹章、调往「不存在的北境」的军队。',
        '天亮了。',
      ]);
      setFlag('evidence');
      await say(['（证据到手。回到王宫大殿，当庭揭发巴洛克吧。）']);
    },
  },

  star_tower_base: {
    name: '星塔 · 塔底', ch: '第二部 · 星辰之印', sub: '小节四 · 星塔之夜', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '三百级旋梯盘旋而上，塔顶传来石头与石头摩擦的怪响。塔底的火把在夜风里明明灭灭。',
      '旋梯口，一道黑影负手而立——影蚀的武士早就候在这里，专门拖住来援的人。',
    ],
    brief: '塔门洞开，三百级旋梯盘旋而上。旋梯口有黑影把守。',
    exits: {
      s: { to: 'palace_hall', label: '退回王宫', flavor: '你从塔门退回王宫庭院。' },
      up: {
        to: 'star_tower_mid', label: '登上旋梯', flavor: '你踏上旋梯。三百级石阶在火把光里盘旋而上，每一层窗洞都在风中呜咽。',
        req: s => s.flags.towerBaseClear, lock: '黑影守住旋梯，硬冲不是办法。',
      },
    },
    onEnter: async () => {
      if (S.flags.part2 || S.flags.gameClear) {
        await say(['塔门在黎明后由女王亲令封存。石阶上还留着昨夜战斗的痕迹。']);
        return;
      }
      if (!ev('towerBaseRush')) return;
      await say([
        '「星塔守军被巴洛克的调令抽空了。」女王抓起剑——被艾莉娅轻轻按住，「陛下，星辰之印认王的血。您去了，是给它递钥匙。」',
        '女王死死盯着星塔，最终咬牙：「游侠，朕把这一夜托付给你们。」',
        '夜风里，塔顶的乌鸦轰然四散。你们冲进塔底——',
      ]);
    },
    actions: [
      { text: '强攻旋梯，击退守塔的影蚀武士', when: () => !S.flags.towerBaseClear && !S.flags.part2 && !S.flags.gameClear, run: async () => {
        await say(['「想上塔？」武士的黑剑出鞘，紫雾顺着剑脊流淌，「先过我这关。」']);
        const r = await battle('shadowknight');
        if (r !== 'win') return;
        setFlag('towerBaseClear');
        await say([
          '武士倒下，紫雾顺着旋梯的缝隙流散。三百级旋梯打通了。',
          '（旋梯已通——可以直接登塔；若求稳，中层星厅或许还有可用之物。）',
        ]);
      } },
      { text: '攀塔身西侧的飞扶壁直上塔顶——抢时间！（攀爬受伤，但可占得先手）', when: () => !S.flags.part2 && !S.flags.gameClear, run: async () => {
        fx({ hp: -2, flag: 'towerBonus' });
        await say([
          '你抓住飞扶壁的石棱，指尖抠进三百年风霜刻出的缝隙，一寸寸向上。夜风撕扯披风，掌心磨出血，观星台的栏杆终于出现在头顶。（生命 -2）',
          '你越过中层星厅的窗洞，把整座星厅甩在了脚下——没有工夫理会什么机关了，时间就是一切。',
        ]);
        await move('star_tower');
      } },
    ],
  },

  star_tower_mid: {
    name: '星塔 · 中层星厅', ch: '第二部 · 星辰之印', sub: '小节四 · 星塔之夜', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '旋梯在一百五十级处豁然开朗——环形星厅的穹顶嵌满宝石，如一整片压进室内的夜空。厅心，一座黄铜星盘缓缓自转。',
      '环门扣着十二道刻度，每一格都咬在错误的位置上。三百年前的机关，今夜仍在忠实地上锁。',
    ],
    brief: '环形星厅。黄铜星盘自转，环门扣着十二道刻度。',
    exits: {
      down: { to: 'star_tower_base', label: '退回塔底', flavor: '你沿旋梯折回塔底。' },
      up: {
        to: 'star_tower', label: '登上观星台', flavor: '环门无声滑开。最后一段旋梯笔直向上，塔顶的风声已经清晰可闻。',
        req: s => s.flags.starMid, lock: '星盘机关扣死了环门。先校准刻度。',
      },
    },
    onEnter: async () => {
      if (!ev('midArrive')) return;
      await say([
        '黄铜星盘在你面前自转，咔、咔——齿轮咬合的轻响，在寂静的星厅里格外清晰。',
        S.items.tower_page ? '你想起藏书阁的残页：「月晦之夜，将刻度对准『晨钟星』——机关认光，亦认声。」' : '没有图卷，没有提示——只有星盘前那行古老的铭文。',
      ]);
    },
    actions: [
      { text: '校准星盘刻度', when: () => !S.flags.starMid && !S.flags.gameClear, run: async () => {
        if (S.items.tower_page) {
          setFlag('starMid');
          await say([
            '你展开《机关图志》残页，将环形刻度一格格拨向「晨钟星」的方位。黄铜盘面轻轻一震，十二道刻度同时咬合——环门无声地开了。',
            '暗格弹开，前任星官藏着一小袋应急的金币。（金币 +8）',
          ]);
          fx({ gold: 8 });
          return;
        }
        await say([
          '星盘前浮现一行古文，老司书的手笔在旁批注——',
          '『吾无口而唱，无翼而飞，一夕行千里，唤醒千耳。吾是何物？』',
          '三枚刻度缓缓浮起：疾风、晨钟、信鸦。',
        ]);
        const i = await choose([{ text: '「疾风。」' }, { text: '「晨钟。」' }, { text: '「信鸦。」' }]);
        if (i === 1) {
          setFlag('starMid');
          await say([
            '「晨钟。」你的指尖落下，黄铜盘面轻轻一震——无口而唱，无翼而飞，钟声一夕行遍全城，唤醒千耳。十二道刻度同时咬合，环门无声地开了。',
            '暗格弹开，前任星官藏着一小袋应急的金币。（金币 +8）',
          ]);
          fx({ gold: 8 });
        } else {
          fx({ hp: -3 });
          await say([
            '刻度咬错，星盘猛地一震，铜齿扫过你的手臂。（生命 -3）',
            '盘面缓缓复位。艾莉娅盯着那行铭文低声道：「无口而唱……此刻全城都在响的，是什么声音？」',
          ]);
        }
      } },
    ],
  },

  star_tower: {
    name: '星塔 · 观星台', ch: '第二部 · 星辰之印', sub: '小节四 · 星塔之夜', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '三百级旋梯的尽头，观星台在夜风里悬着。星盘中央，星辰之印的蓝白光辉剧烈挣扎着，像被网住的星星。',
    ],
    brief: '观星台。星辰之印在星盘中央剧烈挣扎。',
    exits: { down: { to: 'star_tower_mid', label: '退回中层星厅', flavor: '你沿旋梯退回中层星厅。' } },
    onEnter: async () => {
      if (S.flags.part2 || S.flags.gameClear) {
        await say(['塔顶在黎明后由女王亲令封存。观星台的石面上还留着昨夜战斗的痕迹。']);
        return;
      }
      ev('towerRush');
      const bonus = S.flags.towerBonus ? 1 : 0;
      if (S.flags.towerBonus) {
        await say([
          '你翻上观星台的栏杆，正撞见那名黑袍领主把一只手按上星盘——星辰之印悬在盘心，蓝白色的光剧烈挣扎着。',
          '它还没发现你。索恩与艾莉娅正沿旋梯狂奔而上，脚步声在塔身里回荡。',
          '先手，在你手里。（先手优势：敌人第一回合来不及反应！）',
        ]);
      } else {
        await say([
          '冲上观星台时，黑袍领主已经把手按上了星盘——星辰之印悬在星盘中央，蓝白色的光剧烈挣扎着，像被网住的星星。',
          '「来得正好。」领主转过身，紫光在兜帽深处亮起，「省得我一件件找你们。」',
        ]);
      }
      await say(['「星辰归影。」领主的声音像很多层布蒙着的钟，「而你——归尘。」']);
      const r = await battle('starlord', { bonus });
      if (r !== 'win') return;
      await say([
        '溃散前，兜帽深处最后那只紫眼死死盯着星辰之印，发出不甘的尖啸。',
        '「记住……影主亲许的……不止我一个……」',
        '黑水渗进石缝，消失了。星辰之印从星盘上缓缓落下，蓝白色的光辉温柔地落在你伸出的掌心——它没有认你的血，却认出了晨曦的光：两枚符文，在行囊里遥遥辉映。',
        '三百级旋梯下，欢呼声炸开了。黎明，恰好从城垛后面升起来。',
      ]);
      fx({ item: 'rune2', rep: 1 });
      checkpoint();
      await say(['黎明后的大殿，女王亲手为你们别上星纹勋章。巴洛克被押下去时，满朝文武鸦雀无声——只有老妇们在宫门外烧起了爆竹。']);
      if (S.corruption >= 1) {
        await chapterEnd('ending_undercurrent', '暗流涌动', 'THE UNDERCURRENT', [
          '庆功宴的酒很甜。索恩的笑声很响，艾莉娅的笑很暖。你也笑了——只是笑意到不了眼底。',
          '行囊深处，那枚黑石贴着晨曦与星辰的圣布，安静得像睡着了。可你知道它没有。每当夜深，它搏动的节奏，会悄悄跟上你的心跳。',
          '巴洛克的党羽还有多少？影蚀领主临散前的嘶吼是什么意思——「影主亲许的，不止我一个」？',
        ]);
      } else {
        await chapterEnd('ending_star_guardian', '星辰守护者', 'GUARDIAN OF THE STARS', [
          '启程那日，白石城万人空巷。莉安娜女王立于城头，星塔顶的蓝白宝石重新亮起——它记住了昨夜发生的事。',
          '行囊里，晨曦与星辰两枚符文隔着一层圣布彼此辉映，像两颗靠在一起的星。索恩走在最前面开路，艾莉娅在马上摊开新的星图。',
        ]);
      }
      setFlag('part2');
      quest('q_tide');
      await say([
        '女王在书房里摊开南境海图：「海洋之印沉眠在潮歌湾的海底神殿。钦天监算过了——二十三天后，大退潮，海路只现一夜。」',
        '「影蚀折了星辰，绝不会坐视第三印安睡。替朕去看看那片海。」',
        '女王的通行证在晨光里泛着印金。你们收拾行装——南下的路，就从白石城门外开始。',
        '【第二部 · 星辰之印 · 完】——从白石城门往西南，踏上南海官道。',
      ]);
      checkpoint();
    },
  },

  /* ==================== 第三部 · 海洋之印 ==================== */

  coast_road: {
    name: '南海官道 · 海风岬', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'sea.svg', mood: 'warm',
    wild: true, checkpoint: true,
    desc: [
      '官道在海风岬拐向南方。岬角的风带着咸味，吹得衣角猎猎作响；崖下，灰蓝色的海一浪一浪地舔着礁石，涛声低沉得像大地的鼾息。',
      '路边的界碑上刻着褪色的字：「潮歌湾，一日脚程」。碑座下压着几枚渔人求平安的旧铜钱。',
      '卡雅眯眼望着海面：「潮头不对。这一带的浪，三天前就该转向了。」',
    ],
    brief: '咸风扑面的海岬。崖下涛声低沉，界碑指向南方的潮歌湾。',
    roam: { en: 'deepone', chance: 0.22, intro: '路边水洼忽然荡开一圈涟漪——湿漉漉的灰绿身影从礁石阴影里立了起来。' },
    exits: {
      n: { to: 'whitestone_gate', label: '回白石城', flavor: '你沿官道折返。两日后，白石城的白墙重新出现在地平线上。' },
      s: { to: 'tidesong_harbor', label: '南 · 潮歌湾', flavor: '你踏上下坡的官道。转过最后一道山梁，一片桅杆如林的渔港在暮色里亮起灯火。' },
      e: {
        to: 'golden_road', label: '东 · 金穗平原方向', flavor: '你踏上东去的岔道。风里的咸味渐渐淡去，远处，麦浪的金黄在地平线上铺开。',
        req: s => s.flags.part3, lock: '丰收之印的传闻还在远方——先取海洋之印',
      },
    },
    onEnter: async () => {
      if (!ev('coastArrive')) return;
      await say([
        '岬角的风向标吱呀转着。几个补网的渔人坐在崖边，看见你们腰间的剑，都停了手。',
        '「往潮歌湾去的？」老渔人朝南努努嘴，「这两天别下海，也别走夜滩。海里那些『老邻居』又上岸了——灰绿的皮，长胳膊，拖人下水不含糊。」',
        '「灯塔也好些年没亮了。」他叹了口气，「守塔的老祈眼睛熬坏了，灯芯早就断供。夜滩上的事，多半就是打那阵子起来的。」',
        '（灯塔、荧藻、潮汐——潮歌湾的事，到了镇上再细问吧。）',
      ]);
    },
  },

  tidesong_harbor: {
    name: '潮歌湾 · 渔港小镇', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'harbor.svg', mood: 'warm',
    checkpoint: true,
    desc: [
      '渔港不大，却有种被海风磨出来的暖意：桅杆挤着桅杆，晒网的木架沿码头排开，灯笼一盏盏在暮色里亮起，鱼腥、灯油和炊烟混在一起。',
      '码头的木桩上钉着一块褪色的潮汐木牌，字迹被海风啃得只剩一半。',
      '街角，一辆漆成鸦羽色的货车稳稳停在老位置——「都城南下七百里，」兜帽人朝你招手，「乌鸦飞得可比官道快多了。」',
    ],
    brief: '桅杆与晒网架之间的渔港。灯笼次第亮起，渡鸦的货车在街角老位置。',
    exits: {
      n: { to: 'coast_road', label: '回海风岬', flavor: '你出了小镇，沿官道折回海风岬。涛声在身后一声声送行。' },
      e: { to: 'lighthouse', label: '东 · 潮歌灯塔', flavor: '你沿海堤向东。暮色里，一座半斜的白塔立在礁岩尽头，塔顶黑着，像一只闭上的眼。' },
    },
    rest: { cost: 6, label: '在渔家客栈休整' },
    actions: [
      { text: '研读码头的潮汐木牌', when: () => !S.flags.tideLore, run: async () => {
        setFlag('tideLore');
        await say([
          '潮汐木牌上刻着老船长们传下的口诀——',
          '『月晦大潮涨，月圆潮回头；潮头三日后，海路一夜收。』',
          '木牌边缘还有一行小字：「大退潮之夜，海底神殿的门会自己开。早去的搭上潮，晚去的喂了鱼。」',
          '（你把口诀记下：大退潮之夜，海路自现。守塔人或许知道确切的日子。）',
        ]);
      } },
    ],
    npcs: {
      captain: {
        name: '老船长巴罗', img: null, role: '潮歌湾最老的水手',
        talk: async () => {
          if (!S.flags.tideLore) {
            setFlag('tideLore');
            await say([
              '巴罗坐在酒桶上修补渔网，指节粗大得像老树根。他打量你们一行，目光在符文的微光上停了停。',
              '「海底神殿？」他咧嘴一笑，「三十年来，你们是头一拨不绕着这个话题走的客人。」',
              '「记住老水手的口诀：『月晦大潮涨，月圆潮回头；潮头三日后，海路一夜收。』大退潮那一夜，神殿的门自己会开——早去的搭上潮，晚去的喂了鱼。」',
              '（获得潮汐口诀。他还压低声音补了一句：「去神殿之前，先把灯塔点亮。海上的规矩，灯亮着，水里的东西才守本分。」）',
            ]);
          } else {
            await say(['巴罗把补好的渔网抖开：「口诀记住没有？『潮头三日后，海路一夜收』——误了时辰，神仙也捞你不上来。」']);
          }
        },
      },
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「海边潮湿，」渡鸦把货箱摊开——药水瓶、法衣与旧剑排得整整齐齐，「老朋友，添件干爽的行头？」',
            { text: '「海底神殿里，最近有什么传闻？」', when: () => !S.flags.tideHint,
              run: async () => {
                setFlag('tideHint');
                await say([
                  '「神殿啊……」乌鸦在兜帽肩头歪了歪头。',
                  '「打从影蚀的人开始往海边跑，那片水就不干净了。有渔人半夜听见海底下唱经——词是反着念的，听一句，骨头凉一寸。」',
                  '「还有件小事，白送：祭坛前若摆着不该摆的东西，别碰。海收东西，也收手。」',
                  '你与艾莉娅对视一眼。等你回过神，街角的货车已经空了，只留下一枚带着咸味的旧铜钱。',
                ]);
              } }, ['potion', 'potion_big', 'amulet', 'tide_weave']);
        },
      },
    },
  },

  lighthouse: {
    name: '潮歌灯塔', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'lighthouse.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '白塔斜斜地立在礁岩尽头，塔身的红漆条被海风啃得斑驳。塔顶的灯室黑着，玻璃罩里蒙着厚厚的一层盐霜。',
      '塔基的小屋里透出一点豆大的灯光。滩涂上，散落着几具被海浪推上来的破船板——板上的抓痕，是从「里面」抓出来的。',
    ],
    brief: '半斜的白塔。塔顶灯室黑着，滩涂上的破船板带着抓痕。',
    exits: {
      w: { to: 'tidesong_harbor', label: '回渔港', flavor: '你沿海堤折回渔港，灯火在身后一盏盏亮起。' },
      s: { to: 'reef_shoal', label: '南 · 礁滩', flavor: '你踏上退潮后露出的礁滩。水洼间荧光点点，浪沫在脚边碎开。' },
    },
    onEnter: async () => {
      if (S.flags.kaya || !ev('kayaAmbush')) return;   // 战败可重试，直到救下卡雅
      await say([
        '你刚踏上塔前的滩涂，就听见礁岩那头传来兵刃的脆响——',
        '一个渔家打扮的姑娘背抵着塔基，手里一杆鱼叉抡得虎虎生风，把两具灰绿的「东西」逼在圈子外。可她们的脚步，正在被浪沫一寸寸推退。',
        '「愣着做什么——」她头也不回地喊，「长胳膊的东西，缠上就甩不掉！」',
      ]);
      const i = await choose([
        { text: '拔剑冲进战团——没时间了！' },
        { text: '先声喊警，让她退到干滩再合围' },
      ]);
      let bonus = 0;
      if (i === 0) {
        await say([
          '你踏着浪沫冲进战团。深潜者的注意力被你一分为二——它的长臂却借着这个空当，在你小臂上擦出一道血口。（生命 -2）',
        ]);
        fx({ hp: -2 });
      } else {
        await say([
          '你一声长啸压过涛声。姑娘会意，几个箭步退上干滩，深潜者扑空的瞬间露出了破绽。',
          '你们一个诱敌一个突刺，占尽了地利。（先手优势：敌人第一回合来不及还手！）',
        ]);
        bonus = 1;
      }
      const r = await battle('deeponpack', { bonus });
      if (r !== 'win') return;
      await say([
        '深潜者溃成的咸水退进海里。姑娘把鱼叉往沙地上一拄，抹了把脸——汗水混着咸雾，露出一口白牙。',
        '「好身手！我叫卡雅，潮歌湾的猎手。」她朝黑着的塔顶扬了扬下巴，「替这塔谢你——守塔的老祈是我阿公的故交。灯不亮，海就不安生，下水的东西越来越多了。」',
        '「听港里人说你们要下海底神殿？」她把鱼叉一横，「潮路我熟，滩上的东西我也熟。算我一个——账嘛，等活着回来再算。」',
      ]);
      partyJoin('kaya');
      await say(['✦ 卡雅加入了队伍！她是独立的战斗单位，将在战斗中按「态势」挥叉猎敌：迅叉连刺 / 鲸涛斩 / 潮环回斩。']);
    },
    npcs: {
      keeper: {
        name: '守塔人老祈', img: null, role: '潮歌灯塔的守夜人',
        talk: async () => {
          if (S.sideQuests.glowweeds === 'active' && (S.items.glowweed || 0) >= 3) {
            await say([
              '老祈把三株荧藻并排捧在掌心，浑浊的眼睛映出一点幽蓝的亮。他颤巍巍地爬上灯室——',
              '盐霜擦开，荧藻嵌进灯芯。幽蓝的光一寸寸涨起来，涨成一团温暖的白。',
              '塔光扫过夜海的那一刻，整片滩涂的浪声仿佛都低了半度。远处礁滩上，几团黑影悄悄缩回了水里。',
              '「三十年了……」老祈的声音在抖，「灯亮了，海就又认得回家的路了。」',
              '他从怀里摸出一颗温润的珍珠，不由分说塞进你手里：「塔底的沉箱里捞的，深海的东西，贴身戴着好。」',
              '（报酬：金币 +10，获得：深海珍珠 · 生命上限+5）',
            ]);
            take('glowweed', 3);
            fx({ gold: 10, item: 'tide_pearl' });
            setFlag('lampLit');
            finishSide('glowweeds');
            return;
          }
          if (S.sideQuests.glowweeds === 'active') {
            await say([`「荧藻凑齐三株再回来。」老祈掰着手指，「礁滩背阴的石缝、沉船湾的船板底、还有潮汐洞窟的水线旁——都长着。看它们自己发亮的就是。」`, `「你如今手里有 ${(S.items.glowweed || 0)} 株。」`]);
            return;
          }
          if (S.flags.lampLit) {
            if (S.flags.tideNight) {
              await say(['老祈倚在塔门边，望着海路上那道深色的水痕：「去吧。灯亮着，我替你们守着回来的路。」']);
            } else {
              await say(['老祈掐着手指：「月圆潮回头，潮头三日后——就是今夜。子时前后，海会退到最远。守塔人一辈子就在等这样的夜。」']);
            }
            return;
          }
          await say([
            '老祈的背驼得像塔身的弧度，一双手却稳稳地擦着灯罩。他看见你掌心的符文，浑浊的眼睛亮了一瞬。',
            '「先王的信物……那你们是要下海去的。」他叹了口气，「听老朽一句：灯不亮，别下滩。三十年前灯芯断了供，从那夜起，水里的东西就不守规矩了。」',
            '「荧藻——礁滩背阴的石缝、沉船湾的船板底、潮汐洞窟的水线旁，各长着一株。凑三株来，老朽替你们把灯点上。这也是守塔人的本分。」',
          ]);
          sideQuest('glowweeds');
        },
      },
    },
    actions: [
      { text: '守到夜半，等大退潮降临', when: () => S.flags.lampLit && !S.flags.tideNight, run: async () => {
        setFlag('tideNight');
        await say([
          '子时。潮声一寸一寸地低下去，低下去——像整片海在屏息。',
          '礁滩尽头，海水无声地让开一条深色的路：湿漉漉的礁石与沉沙一直铺向海雾深处，尽头隐约立着几根倾颓的石柱。',
          '卡雅深吸一口气：「海路开了。这就是老船长们说的——『早去的搭上潮』。走！」',
          '（大退潮之夜降临。礁滩南面的海底神殿，可以进去了。）',
        ]);
      } },
      { text: '登上灯室远眺', when: () => S.flags.lampLit && !S.flags.lampView, run: async () => {
        setFlag('lampView');
        await say([
          '你登上灯室。塔光扫过之处，海面亮成一圈一圈的年轮——远的黑，近的白。',
          '极目南望：海雾深处，几根倾颓的石柱在浪线间时隐时现，柱身缠着说不清是海藻还是经幡的东西。古图上的「海底神殿」，就沉在那里。',
          '卡雅在梯口探头：「看什么呢？——哦，那几根柱子。老人们说，柱子底下压着的，是先王沉进海里的冠冕。」',
        ]);
      } },
    ],
  },

  reef_shoal: {
    name: '退潮礁滩', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'dark',
    wild: true,
    desc: [
      '退潮后的礁滩一望无际：水洼映着天光，荧光藻在石缝里明明灭灭，浪线退到很远的地方，只余下湿沙上蜿蜒的水痕。',
      '滩涂深处，几具搁浅的破船板歪在礁石间。再往南，海雾里的石柱轮廓渐渐清晰。',
    ],
    brief: '一望无际的退潮礁滩。水洼荧光点点，海雾里的石柱轮廓隐约可见。',
    roam: { en: ['deepone', 'reefcrab'], chance: 0.3, fleeTo: 'lighthouse', intro: '水洼忽然齐齐荡开涟漪——滩涂上的东西醒了。' },
    exits: {
      n: { to: 'lighthouse', label: '回灯塔', flavor: '你踏上来路。灯塔的光在身后一圈圈扫过夜海。' },
      e: { to: 'shipwreck_cove', label: '东 · 沉船湾', flavor: '你踏着礁石向东。几具巨大的船骸在浪线间横陈，像退潮留下来的骨头。' },
      w: { to: 'sea_cave', label: '西 · 潮汐洞窟', flavor: '你向西绕过一面礁壁。一个黑黢黢的洞口开在水线旁，潮声在洞里来回撞。' },
      s: {
        to: 'sea_temple_hall', label: '南 · 海底神殿', flavor: '你踏上海路。湿沙在脚下一寸寸变硬，海雾分开两侧——三百年的神殿，从水里抬起头来。',
        req: s => s.flags.tideNight, lock: '潮水未退——海底神殿的门要等大退潮之夜',
      },
    },
    actions: [
      { text: '在背阴的石缝间采集荧藻', when: () => S.sideQuests.glowweeds === 'active' && !S.flags.weed_reef, run: async () => {
        setFlag('weed_reef');
        fx({ item: 'glowweed' });
        await say([
          '背阴的石缝里，一丛荧藻幽幽地亮着，像谁遗落在礁缝里的碎星。',
          '你照老祈教的法子连水带根起出一株，荧光映亮了你的指缝。（获得：荧藻）',
        ]);
      } },
    ],
  },

  shipwreck_cove: {
    name: '沉船湾', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'dark',
    desc: [
      '半打巨大的船骸在湾里横陈，龙骨朝天，像一群搁浅赴死的巨兽。最大的那艘船身裂开一道漆黑的口子。',
      '船板上的刻痕层层叠叠：求救的、记数的、还有一整面船壁的正字——有人在沉船上，活了很久。',
    ],
    brief: '龙骨朝天的沉船群。船壁上刻满层层叠叠的求生痕迹。',
    exits: {
      w: { to: 'reef_shoal', label: '回礁滩', flavor: '你离开沉船湾，礁滩的荧光在暮色里重新亮起。' },
    },
    onEnter: async () => {
      if (S.flags.coveDone) return;   // 战败可重试
      await say([
        '你攀上最大那艘船的裂口。货舱里积着半舱水，水底压着一只缠满海藻的沉箱——',
        '就在你俯身的同时，水面「哗」地炸开：一只背着整面礁壁的老蟹妖举着巨钳立在舱心，把沉箱当成了自家的巢。',
      ]);
      const r = await battle('reefcrab');
      if (r !== 'win') return;
      setFlag('coveDone');
      fx({ gold: 12, item: 'whale_lance' });
      await say([
        '蟹妖缩回壳里，横着退出了船舱。沉箱的锁早烂了——里面是一杆用老鲸脊骨磨成的猎叉长枪，枪身沉得压手，却意外地称手。',
        '（金币 +12，获得：鲸骨长枪 · 攻击+3）',
        '船壁的「正」字数到第三十七个就停了。最后一行刻痕很浅：「灯要是亮着，我就能看见回家的路。——愿见字者代我望一眼」',
        '你抬头望向灯塔的方向。塔光恰好转过来，从裂口扫进舱心，把满舱的海水照得透亮。',
      ]);
    },
    actions: [
      { text: '翻检船板底下堆积的海藻', when: () => S.sideQuests.glowweeds === 'active' && !S.flags.weed_cove, run: async () => {
        setFlag('weed_cove');
        fx({ item: 'glowweed' });
        await say([
          '船板底下堆积的海藻间，一株荧藻幽幽发亮——大概是被哪次涨潮卷进来搁住的。',
          '你把它起出来，荧光把四周的船骸照出一圈淡淡的轮廓。（获得：荧藻）',
        ]);
      } },
    ],
  },

  sea_cave: {
    name: '潮汐洞窟', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'cave.svg', mood: 'dark',
    desc: [
      '洞窟不深，却把潮声放大了十倍。钟乳石垂在头顶，水线在洞壁上留下一圈圈深色的年轮——那是海一涨一退，写了三千年的日记。',
      '洞底积着一泓幽深的水。水边的石壁上，荧藻沿着水线长成了一圈淡青色的星图。',
    ],
    brief: '潮声回荡的洞窟。水线旁的荧藻长成一圈星图。',
    exits: {
      e: { to: 'reef_shoal', label: '回礁滩', flavor: '你退出洞窟，潮声在背后一声声低了下去。' },
    },
    onEnter: async () => {
      if (S.flags.caveDone) return;   // 战败可重试
      await say([
        '你在洞底的水边落脚。水面忽然自己皱了起来——一圈，又一圈，不是被风。',
        '雾从水里立起来，拧成一个模糊的人形，两点冷光在雾心里亮起。它不像林子里那些迷路的怨念——它守着这洞里的什么，等了很久。',
      ]);
      const r = await battle('wraith');
      if (r !== 'win') return;
      setFlag('caveDone');
      await say([
        '人形散作碎雾。雾心里，它守着的东西露了出来：岩台上搁着一只巴掌大的潮珠——潮汐的心，永远微凉，握在掌心里，斗气竟顺着指尖流转起来。',
        '（获得：潮珠 · 斗气上限+4）',
        '岩台旁还有前任守窟人藏下的物件：一小袋金币和一瓶封蜡完好的浓药。（金币 +12，获得：大生命药水）',
      ]);
      fx({ gold: 12, item: ['tide_orb', 'potion_big'] });
    },
    actions: [
      { text: '沿着水线采集荧藻', when: () => S.sideQuests.glowweeds === 'active' && !S.flags.weed_cave, run: async () => {
        setFlag('weed_cave');
        fx({ item: 'glowweed' });
        await say([
          '水线旁的荧藻星图里，有一株格外亮。你连水带根把它起出来——洞里的潮声，仿佛跟着暗了一瞬。（获得：荧藻）',
        ]);
      } },
    ],
  },

  sea_temple_hall: {
    name: '海底神殿 · 前殿', ch: '第三部 · 海洋之印', sub: '小节三 · 大退潮之夜', bg: BG + 'sunken.svg', mood: 'holy',
    checkpoint: true,
    desc: [
      '神殿从海雾里浮出来：倾颓的石柱撑着半塌的穹顶，殿前的浅洼里沉着三百年的沙。梁柱上的波纹刻饰层层叠叠，在符文微光里像一整面凝住的海。',
      '大殿深处，潮汐祭坛的深蓝光透过门洞漫出来，把整座前殿浸在水色的幽明里。',
    ],
    brief: '半塌穹顶下的前殿。深蓝色的祭坛光从殿门深处漫出来。',
    exits: {
      n: { to: 'reef_shoal', label: '回礁滩', flavor: '你退回海路。身后的神殿沉回海雾里，涛声重新围拢过来。' },
      down: { to: 'tide_altar', label: '下 · 潮汐祭坛', flavor: '你踏着没过脚踝的浅水走向殿门深处。深蓝的光一寸寸淹上你的膝盖。' },
    },
    rest: { cost: 0, label: '在咏泉边整备' },
    onEnter: async () => {
      if (S.flags.hallClear) return;   // 战败可重试
      await say([
        '你们刚踏进前殿，两道黑影就从倾颓的柱后立起——黑袍，兜帽，袖口那只睁开的眼睛。',
        '「上座有令：潮起之日，先沉其岸。」武士的黑剑出鞘，剑身淌着紫雾，「神殿要清场了——连你们一起，沉进去。」',
      ]);
      const r = await battle('shadowknight');
      if (r !== 'win') return;
      setFlag('hallClear');
      give('tide_edict');
      await say([
        '武士溃散的黑水里，你捞起一卷火漆封着的潮令。',
        '（获得：影蚀潮令——「月晦既过，转图第三印。潮起之日，先沉其岸。——上座」。影蚀的手，比大退潮更早伸进了这片海。）',
        '殿心的咏泉还在汩汩地涌：先王留下的活水，历代朝圣者在这里洗去咸雾与疲惫。泉水的气息温热，全队的伤势与斗气都缓缓充盈。',
      ]);
    },
    actions: [
      { text: '研读殿壁的七印壁画', when: () => !S.flags.seaMural, run: async () => {
        setFlag('seaMural');
        await say([
          '前殿的壁画被海气洇得发暗，但笔意仍在：七位先王点燃七印，锁链垂进海底的深渊。第三位先王的符文是一顶潮汐的冠冕，冠下刻着一行小字——',
          '『潮起潮落，皆是大地呼吸。吾随潮声沉眠，听潮者，听吾。』',
          '艾莉娅指尖抚过字痕：「先王的气息就在潮声里。等下在祭坛前，用心听。」',
        ]);
      } },
    ],
  },

  tide_altar: {
    name: '海底圣所 · 潮汐祭坛', ch: '第三部 · 海洋之印', sub: '小节三 · 大退潮之夜', bg: BG + 'sunken.svg', mood: 'dark',
    desc: ['圣所穹顶开着一道天窗，退潮后的月光笔直地落进殿心。祭坛中央，海洋之印的深蓝光辉剧烈起伏，像一颗被按进石头里的心脏。'],
    brief: '月光直落的圣所。海洋之印在祭坛中央剧烈起伏。',
    exits: { up: { to: 'sea_temple_hall', label: '回前殿', flavor: '你踏着浅水退回前殿，深蓝的光在背后一寸寸淡下去。' } },
    onEnter: async () => {
      if (S.flags.rune3) return;
      if (!ev('shellChoice')) return;
      await say([
        '祭坛前的石阶上，搁着一只巴掌大的螺壳——螺口泛着不属于海的紫，像一只阖上的眼睛。',
        '卡雅的鱼叉横在身前：「别碰。老人们说，海收东西，也收手。」',
      ]);
      const j = await choose([
        { text: '退开半步——有些东西，不属于活人的行囊' },
        { text: '收起螺壳——知己知彼，它对圣殿的研究有用' },
      ]);
      if (j === 1) {
        fx({ item: 'abyss_shell', corruption: 1, flag: 'shellTaken' });
        await say([
          '你把螺壳收进行囊。贴着掌心的一瞬，壳里极轻极轻地——笑了一声。',
          '没有人说话。潮声填满了圣所，你告诉自己是涛声的错觉。但你的左手，在袖子里攥了一路。',
        ]);
      } else {
        await say(['你退开半步。潮水从殿门外漫进来，恰到好处地漫过螺壳，又退了出去——像海自己收走了它。']);
      }
    },
    actions: [
      { text: '直面潮祭司溟汐，夺回海洋之印', when: () => !S.flags.rune3, run: async () => {
        await say([
          '祭坛前的咸雾无风自涌——影蚀潮祭司溟汐从光晕里转过身来，潮汐就是它的脸，深渊就是它的嗓音。',
          '「三百年了，」它张开双臂，像拥抱整片海，「潮水终于涨到能淹没陆地的高度。而你们——不过是退潮时留在沙滩上的痕迹。」',
          '「让老水手教教你们——」卡雅的鱼叉斜指祭坛，「潮头三日后，海路一夜收。今夜收的，是你们的路！」',
        ]);
        const r = await battle('tidesage');
        if (r !== 'win') return;
        await say([
          '溟汐在祭坛前散成一层白盐。深蓝的光从盐层里升起，缓缓落进你的掌心——海洋之印认的不是血，是「听潮的人」。',
          '三枚符文在行囊里遥遥辉映：晨曦的金、星辰的蓝白、海洋的深蓝——像三颗终于靠在一起的星。',
          '天窗外的月光亮得惊人。海，开始涨潮了——它在把路，一寸一寸还给你们。',
        ]);
        fx({ item: 'rune3', maxHp: 5, rep: 2, flag: ['rune3', 'part3'] });
        checkpoint();
        if (S.flags.shellTaken) {
          await chapterEnd('ending_tide_whisper', '潮声呢喃', 'WHISPERS OF THE TIDE', [
            '归航的筏上，卡雅忽然问：「你行李里那个螺壳……刚才是不是动了一下？」',
            '「涛声而已。」你说。卡雅没再问。海把月光铺在浪上，一路铺回渔港——只是从这一夜起，你听潮的时候，潮也一直在听你。',
            '行囊深处，螺壳偶尔会轻轻搏动，节拍恰好比你心跳慢半拍——像一个在你身后，慢慢跟上来的人。',
          ]);
        } else {
          await chapterEnd('ending_tide_guardian', '沧海守护者', 'GUARDIAN OF THE TIDES', [
            '归航的筏上，卡雅把鱼叉横在膝头，忽然笑了：「知道吗，阿公说过——海给每个人的账都记着呢。今晚这一笔，它记你们头上的是『恩人』。」',
            '渔港的灯全亮了。老祈把塔光调到最亮，替你们照着进港的水路。老船长巴罗把珍藏的陈酒拍开泥封：「敬潮歌湾三十年里，最亮的一夜！」',
            '海把月光铺在浪上，一路铺回渔港。你听着潮声——今晚，它只是潮声。',
          ]);
        }
        setFlag('tideReturned');
        quest('q_harvest');
        await say([
          '次日清晨，艾莉娅在图纸上圈出东边的平原：「第四印『丰收之印』，由守穗人一族世代看护，供在金穗平原深处的丰年祭坛。」',
          '「可港里的商队说，」卡雅擦着鱼叉皱眉，「东边闹蝗灾闹得邪性——螟蛾过境，庄稼连着地一起烂。守穗人的地方，不该有这种事。」',
          '「影蚀折了海洋，绝不会放过第四印。」索恩把斧头扛上肩，「俺们得快些。」',
          '【第三部 · 海洋之印 · 完】——从海风岬往东，便是金穗平原。',
        ]);
        checkpoint();
      } },
    ],
  },

  /* ==================== 第四部 · 丰收之印 ==================== */

  golden_road: {
    name: '金穗官道 · 麦浪原', ch: '第四部 · 丰收之印', sub: '小节一 · 金穗平原', bg: BG + 'farm.svg', mood: 'warm',
    wild: true, checkpoint: true,
    desc: [
      '官道在麦浪原上铺开。本该是收获的季节——可麦浪一片一片地矮下去，穗子空得只剩壳，风一过，扬起的不是麦香，是一股发甜的腐味。',
      '田埂上倒着几具稻草人，斗笠滚在一边。天空里，锈色的螟蛾成群地盘旋，像一场下不完的雪。',
      '卡雅捏着一穗空壳，脸色沉了下来：「这不成蝗灾。这是有东西在替它们『收』。」',
    ],
    brief: '发着腐甜味的麦浪原。锈色的螟蛾在天空盘旋，像下不完的雪。',
    roam: { en: 'locusts', chance: 0.3, intro: '脚边的麦茬忽然簌簌作响——螟群贴着地皮朝你们涌了过来。' },
    exits: {
      w: { to: 'coast_road', label: '回海风岬', flavor: '你沿官道折返。两日后，海风的咸味重新漫过衣领。' },
      e: { to: 'harvest_village', label: '东 · 穗安村', flavor: '你踏着田埂东行。暮色里，一座围着谷仓的小村亮起零星的灯，安静得不像有人的样子。' },
    },
    onEnter: async () => {
      if (!ev('roadArrive')) return;
      await say([
        '路边，一个老农跪在田头，手里攥着一把空穗。看见你们，他眼睛里的光动了动，又暗下去：「又是逃难的吧……往东别去了，村里也在闹。」',
        '艾莉娅蹲下身，捻起一撮腐土凑近细看，眉头锁紧：「不是蝗害。土里的东西被『催熟』过了——是影蚀的手法。它们在把整片平原，炼成一坛腐熟的祭品。」',
      ]);
    },
  },

  harvest_village: {
    name: '穗安村', ch: '第四部 · 丰收之印', sub: '小节一 · 金穗平原', bg: BG + 'farm.svg', mood: 'warm',
    checkpoint: true,
    desc: [
      '穗安村围着几座大谷仓而建，仓壁上还挂着丰年祭的红绸——只是绸子褪了色，谷仓的门板钉着交叉的木条。',
      '街上行人稀少，家家户户的门缝里飘出熏艾的烟。村口的老槐树上挂着一面破锣，锣锤上缠着的红布已经发黑。',
      '村长立在槐树下，像已经等了很久。',
    ],
    brief: '围着谷仓的小村。仓门钉着木条，村口老槐树上挂着一面破锣。',
    exits: {
      w: { to: 'golden_road', label: '回麦浪原', flavor: '你出村西行，腐甜的风味重新漫过田埂。' },
      n: { to: 'warden_grove', label: '北 · 守穗人树林', flavor: '你沿田间小路向北。树林的边缘立着一圈半人高的界石，石上刻着穗纹。' },
      e: { to: 'old_mill', label: '东 · 老磨坊', flavor: '你出村东行。老磨坊的轮叶停在水声里，远远看去，像一个佝偻的背影。' },
      s: { to: 'locust_fields', label: '南 · 蝗灾的田垄', flavor: '你沿田垄南下。锈色的螟蛾在头顶越聚越密。' },
    },
    rest: { cost: 5, label: '在村里歇一晚' },
    npcs: {
      headman: {
        name: '穗安村长', img: null, role: '穗安村当家人',
        talk: async () => {
          if (S.sideQuests.seeds === 'active' && (S.items.grain || 0) > 0) {
            await say([
              '你把那袋祭典谷种递过去。村长的手抖了，捧着袋子的样子像捧着新生儿：「回来了……头茬谷种回来了。」',
              '他掀起袋角闻了闻，眼睛一下子红了：「没糟蹋——干干净净的。后生，你替全村把根续上了。」',
              '「老朽没什么好谢的，这十五枚金币你务必收下。等丰年祭重新开锣，全村给你立长生牌位！」',
              '（报酬：金币 +15，声望 +2）',
            ]);
            take('grain');
            fx({ gold: 15, rep: 2 });
            finishSide('seeds');
            return;
          }
          if (S.sideQuests.seeds === 'active') {
            await say(['「谷种在老磨坊——进去的东西，就再没见出来的。」村长往东努努嘴，「后生，千万当心。」']);
            return;
          }
          await say([
            '「先王的信物……」村长看着你掌心的光，长揖到地，「那老朽就托大了。」',
            '「半月前，一群『不会在麦地留脚印的东西』闯进村，把丰年祭用的头茬谷种抢进了东边老磨坊。谷种一断，祭坛认不出香火，守穗人婆婆锁着祭坛不许人靠近——她说，没有头茬谷种的祭礼，是喂给『那东西』的。」',
            '「村里的后生进去过三拨，没一个回来的。」村长的声音压得极低，「磨坊里如今住着什么，谁也不知道。」',
          ]);
          sideQuest('seeds');
        },
      },
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「平原上的客人，」渡鸦把货箱摊开，「腐烂的季节，护符比药水管用。」',
            { text: '「这平原上的腐穗，到底是什么来头？」', when: () => !S.flags.rotHint,
              run: async () => {
                setFlag('rotHint');
                await say([
                  '「腐穗？」乌鸦歪了歪头。',
                  '「庄稼烂，是虫蛀的。庄稼『熟』得太快，连地一起烂——那是被什么东西当口粮催的。你们猜，催熟一片平原，够喂饱什么？」',
                  '「守穗人树林里的老婆婆知道得最清楚。她家的规矩老得很，也灵得很。」兜帽朝北偏了偏，「顺着她的农谚走，祭坛认这个。」',
                  '你与艾莉娅对视一眼。街角只剩下一枚带着麦香的旧铜钱。',
                ]);
              } }, ['potion', 'potion_big', 'amulet', 'harvest_charm']);
        },
      },
    },
  },

  locust_fields: {
    name: '蝗灾的田垄', ch: '第四部 · 丰收之印', sub: '小节一 · 金穗平原', bg: BG + 'farm.svg', mood: 'dark',
    wild: true,
    desc: [
      '田垄在这里烂到了根：麦秆成片地伏倒，穗子黑得像烧过。锈色的螟蛾密密地贴在地皮上，把最后一点绿啃成沙沙的白噪。',
      '田埂尽头立着一个歪斜的稻草人，怀里却被人塞了一把新鲜麦穗——穗子还带着露水。',
    ],
    brief: '烂到根的田垄。稻草人怀里，有人塞了一把带露水的新麦。',
    roam: { en: ['locusts', 'husk'], chance: 0.32, fleeTo: 'harvest_village', intro: '田垄深处窸窣作响——比螟蛾更大的东西醒了。' },
    exits: {
      n: { to: 'harvest_village', label: '回穗安村', flavor: '你沿田埂折回村中。熏艾的烟气让人踏实了些。' },
    },
    actions: [
      { text: '帮农户点一把驱蝗火', when: () => !S.flags.locustHelped, run: async () => {
        setFlag('locustHelped');
        fx({ rep: 1, gold: 5 });
        await say([
          '你帮着把湿草堆上田头，点火，撒艾烟。火光一起，螟蛾的密阵果然退开了一条田垄。',
          '躲在沟里的农户们探出头来，朝你深深弯腰。一个孩子跑过来，往你手里塞了一把还带着体温的铜钱：「阿爹说，这是『火钱』，必须收。」',
          '（声望 +1，金币 +5）',
        ]);
      } },
    ],
  },

  old_mill: {
    name: '老磨坊', ch: '第四部 · 丰收之印', sub: '小节二 · 磨坊与守穗人', bg: BG + 'mill.svg', mood: 'dark',
    desc: [
      '磨坊的水轮停在水声里，风车的翼板断了一叶，斜指着天。门板虚掩着，门缝里漫出陈年的面粉味——和一股发甜的腐味。',
      '磨盘上的刻痕被人反复描过：是半句农谚，后半句被凿去了。',
    ],
    brief: '停了轮的老磨坊。磨盘上刻着半句被凿断的农谚。',
    exits: {
      w: { to: 'harvest_village', label: '回穗安村', flavor: '你退出磨坊，身后的水声一下子远了。' },
      n: { to: 'warden_grove', label: '北 · 守穗人树林', flavor: '你从磨坊后门穿出，抄林间小道向北。界石的穗纹在树影里若隐若现。' },
    },
    onEnter: async () => {
      if (S.flags.millDone) return;   // 战败可重试
      await say([
        '你推开磨坊的门。月光从破窗斜进来，照亮满地倒伏的空麻袋——谷种被吃得很干净。',
        '墙角的阴影里，一个佝偻的身影缓缓立起，头顶还插着几穗没能长成的麦子。它转过头——脸上没有眼睛，只有两张开合的嘴。',
      ]);
      const r = await battle('husk');
      if (r !== 'win') return;
      setFlag('millDone');
      give('grain');
      fx({ gold: 10 });
      await say([
        '腐行者散成一地朽藤。藤蔓深处，那袋被偷走的祭典谷种滚了出来——袋口的封蜡完好，穗安村的穗印还清清楚楚。',
        '（获得：祭典谷种。金币 +10——是先前进村的后生们攒下没来得及送回的工钱。）',
        '艾莉娅把谷种细细验过：「干干净净，一点没糟蹋。它们偷谷种，不是为了吃——是要断掉丰年祭的香火，让祭坛『饿着』。」',
      ]);
    },
    actions: [
      { text: '辨认磨盘上的刻痕', when: () => !S.flags.millRhyme, run: async () => {
        setFlag('millRhyme');
        await say([
          '磨盘上的刻痕深而稳，是守穗人的笔法——只是被人凿去了一半：',
          '『稻引金穗先开口，麦随黍后不回头；四更豆荚裂了口——』',
          '后两句没有了。凿口很新，像是怕人读完。艾莉娅拓下这半句：「剩下一半，应该就在守穗人手里。」',
        ]);
      } },
    ],
  },

  warden_grove: {
    name: '守穗人树林', ch: '第四部 · 丰收之印', sub: '小节二 · 磨坊与守穗人', bg: BG + 'grove.svg', mood: 'holy',
    checkpoint: true,
    desc: [
      '树林边缘立着一圈界石，石上的穗纹被历代守穗人的手摸得发亮。林中麦穗状的树冠层层叠叠，金色的穗光在枝叶间明明灭灭。',
      '一座石灯笼守着林间小径的入口，灯芯里燃着一豆安静的金火。树下的老妪拄着一柄木镰，像从树根里长出来的一部分。',
    ],
    brief: '界石环抱的树林。金色的穗光在树冠间明灭，老妪拄镰立在树下。',
    exits: {
      s: { to: 'harvest_village', label: '回穗安村', flavor: '你踏出界石圈，林中的金光在身后温柔地合拢。' },
      e: { to: 'old_mill', label: '东 · 老磨坊', flavor: '你沿林间小道向东。磨坊的断轮声隐隐传来。' },
      n: {
        to: 'harvest_altar', label: '北 · 丰年祭坛', flavor: '你沿林中小径向北。树冠让开一道天隙——金色的祭坛光，在林深处静静呼吸。',
        req: s => s.flags.riddleSolved, lock: '祭坛前的五谷槽扣着石盖——排布不合农谚，谁也敲不开',
      },
    },
    npcs: {
      rong: {
        name: '守穗人蓉婆婆', img: null, role: '守穗人一族 · 丰年祭坛的看护者',
        talk: async () => {
          if (!S.flags.rhyme) {
            setFlag('rhyme');
            await say([
              '老妪眯眼打量你掌心的光，木镰往地上一顿：「符文的光……三百年了，先王的路，到底还是有人走回来了。」',
              '「老身守着丰年祭坛。可自打谷种丢了、田烂了，坛前的五谷槽就扣死了——排布不合农谚，谁敲也不开。」',
              '她一字一顿地念：『稻引金穗先开口，麦随黍后不回头；四更豆荚裂了口，麻绳捆到仓门口。』',
              '「这是排五谷的次序。记住了，去把坛门敲开——里头那东西饿得太久了，别让它再等。」',
              '（农谚记下：丰年祭坛五谷槽的排布次序。）',
            ]);
            return;
          }
          if (S.sideQuests.seeds === 'done' && !S.flags.vineGift) {
            setFlag('vineGift');
            fx({ item: 'vine_mail' });
            await say([
              '蓉婆婆的目光落在你身上，忽然一怔：「谷种……你把头茬谷种送回村了？」',
              '她转身从树洞里捧出一件叠得整整齐齐的藤甲：「守穗人一族的谢礼。活藤编的，刀斧留痕，藤自己会收——别嫌它土。」',
              '（获得：荆藤战甲 · 受伤-3）',
            ]);
            return;
          }
          await say(['蓉婆婆拄着木镰：「农谚记牢了没有？『稻引金穗先开口』——次序错了，坛门敲一万年也不开。」']);
        },
      },
    },
  },

  harvest_altar: {
    name: '丰年祭坛', ch: '第四部 · 丰收之印', sub: '小节三 · 丰年祭', bg: BG + 'grove.svg', mood: 'holy',
    desc: [
      '林深处豁然开朗。丰年祭坛是一方沉进大地的圆台，坛心丰收之印的金光微弱地明灭，像一豆将尽的灯。',
      '坛前排着五座石槽，槽上扣着刻有穗纹的石盖。圆台四角，立着四座装满腐土的谷仓——腐香就从那里漫出来，甜得发腻。',
    ],
    brief: '沉进大地的圆台祭坛。五谷槽扣着石盖，四角谷仓里的腐香甜得发腻。',
    exits: {
      s: { to: 'warden_grove', label: '回守穗人树林', flavor: '你沿来路退回树林，穗光在头顶一盏盏亮起。' },
    },
    actions: [
      { text: '按农谚排布五谷槽', when: () => !S.flags.riddleSolved && !S.flags.part4, run: async () => {
        await say([
          '五谷槽的石盖上各刻着一种谷：稻、麦、黍、豆、麻。',
          '艾莉娅展开拓下的半句农谚：『稻引金穗先开口，麦随黍后不回头；四更豆荚裂了口——』后半句缺着，只有磨坊的凿口知道去了哪儿。',
          S.flags.rhyme ? '（蓉婆婆的农谚在你心里过了一遍——次序，全在里头。）' : '（没有完整的农谚。半句口诀，五座石槽……只能凭悟性试了。）',
        ]);
        const grains = ['稻', '麦', '黍', '豆', '麻'];
        const picked = [];
        for (;;) {
          const pool = grains.filter(g => !picked.includes(g));
          if (!pool.length) break;
          const i = await choose(pool.map(g => ({ text: `把「${g}」槽排在这一位` })));
          picked.push(pool[i]);
        }
        if (picked.join('') === '稻麦黍豆麻') {
          setFlag('riddleSolved');
          await say([
            '五座石盖次第落槽——「稻」槽的金光最先亮起，「麦」「黍」跟上，「豆」在第四位炸开一片细响，「麻」最后合拢，像一根绳头收进了仓门。',
            '轰——四座谷仓同时洞开，腐土退散，坛心的金光陡然涨起三倍。五谷槽排成一条笔直的路，直通祭坛。',
            '「合上了……」蓉婆婆的声音从林边传来，轻得像叹息，「三百年，坛门头一回自己开。」',
            '（祭坛前的路开了。可腐香的深处，有什么东西正在起身——）',
          ]);
        } else {
          fx({ hp: -2 });
          await say([
            '石盖咬错了位。五谷槽轰然复位，一股沉闷的反震顺着手臂撞进胸口。（生命 -2）',
            '坛心的金光黯了一瞬。蓉婆婆在林边摇头：「次序。想想稻穗什么时候先开口……」',
          ]);
        }
      } },
      { text: '直面腐穗巨灵饕穰，重燃丰收之印', when: () => S.flags.riddleSolved && !S.flags.rune4, run: async () => {
        await say([
          '腐香的甜味陡然浓了十倍。祭坛四角的谷仓炸开——由腐藤、谷壳与整片平原的丰收怨念堆成的巨灵，拖着满身穗影站了起来。',
          '「香……」它的声音像整仓谷粒同时倒下，「好香……把印……也给我……」',
          '「三百年了，」艾莉娅的杖尖亮起星辉，「它原本是守着祭坛的谷灵。影蚀把它喂成了这样——今天，让它吃饱的该是光，不是腐土！」',
        ]);
        const r = await battle('harvestgiant');
        if (r !== 'win') return;
        await say([
          '巨灵在金光里一层层剥落——腐藤褪尽，谷壳散开，最后只剩一小撮干净的谷粒，安安静静躺在祭坛石上。',
          '丰收之印从坛心升起，金色的光粒缓缓落进你的掌心——它认的不是血，是「让土地重新结果的人」。',
          '四枚符文在行囊里遥遥辉映。坛前的谷粒落进五谷槽的刹那，整片平原的麦浪，从地平线上一浪一浪地重新站了起来。',
        ]);
        fx({ item: 'rune4', maxHp: 6, rep: 2, flag: ['rune4', 'part4'] });
        checkpoint();
        if (S.corruption >= 1) {
          await chapterEnd('ending_rot_seed', '腐香暗种', 'THE ROT WITHIN', [
            '庆典的火堆烧了整夜。村里人围着你们唱歌，酒碗传了一轮又一轮。你也笑了——只是笑意到不了眼底。',
            '夜半，你独自回到祭坛。谷粒的甜香里，你听见行囊深处那两样东西在轻轻应和：螺壳搏动的节拍，黑石温热的低语——它们隔着一层圣布，在学大地的呼吸。',
            '「腐熟一片平原，够喂饱什么呢？」你在心里问。有什么东西，替你记下了这个问题。',
          ]);
        } else {
          await chapterEnd('ending_harvest_guardian', '大地的守望者', 'WARDEN OF THE HARVEST', [
            '庆典的火堆烧了整夜。蓉婆婆把那撮干净的谷粒亲手撒回田里，全村人跟着跪下去，又笑着站起来。',
            '「大地记性好得很，」她拍拍你的手背，「谁让它重新结果的，它记得谁。明年这时候，替你来碗新麦酒。」',
            '清晨，艾莉娅在图纸上圈出王都以北的群山：「第五印『战争之印』，沉眠在古战场深处；第六印『暮钟之印』，悬在暮色修道院的钟楼里。」',
            '「越往后，印越沉，」索恩把斧头擦得雪亮，「俺们的运气倒是一直挺旺。」',
          ]);
        }
        quest('q_horizon');
        await say([
          '启程前夜，蓉婆婆在界石上多刻了一行小字，念给你们听——',
          '『五印在途，六印在望。唯第七印，不在途中，在底下。』',
          '她合起木镰：「孩子们，往北走的时候，替老朽听听北边的风。风里要是有钟声，就说明时间还够。」',
          '【第四部 · 丰收之印 · 完】——七印之路，已行其四。终部「深渊之印」制作中。',
        ]);
        checkpoint();
      } },
    ],
  },
};

/* ---------------- 剧情复用文本 ---------------- */
const STORY_TEXT = {
  sevenSeals: [
    '「七印之名，依次是：晨曦、星辰、海洋、丰收、战争、暮钟，以及……深渊。」',
    '「深渊之印最为特殊——它不是锁，是莫格拉斯力量的『根』。先王们无法摧毁它，只能连同他一起封进影渊。」',
    '「如今嘛……」他自嘲地笑笑，「七枚里，已有三枚的光熄了。」',
    '「守护符文不是传说，孩子。它们是锁。而锁——正在生锈。」',
    '「井水变黑、乌鸦聚集、地底的磨牙声……都是影渊之下那位君主苏醒的征兆。他的仆从已经动了：他们要抢在封印崩坏前，把七印彻底毁掉。」',
    '「我本要去迷雾森林，找一位叫艾莉娅·星语的半精灵学者——她破解了符文古语。可我这把老骨头，未必走得到那里。」',
    '窗外一道闪电劈落。就在那一瞬，你看见旅店外的雨幕里，立着几道不属于任何行人的影子。',
  ],
};

/* ---------------- 旅途随机事件 ----------------
 * 在野外（wild:true）地点之间赶路时小概率触发，带独立冷却。
 * 事件应轻量：叙述 + 小额得失，战斗交给各地点的 roam。
 * 注意：可选项的第一项必须「安全」（测试桩与手滑党默认选 0）。 */
const TRAVEL_EVENTS = [
  {
    id: 'poet',
    intro: '路口的断石墩上坐着个背七弦琴的诗人，正就着山风给琴轴上松香。',
    run: async () => {
      await say([
        '「客人行行好，」诗人拨了个和弦，「听半支曲子再走。《七印谣》，先王年间传下来的，如今会唱的人不多了。」',
        '「……一印沉眠晨光里，二印悬在星塔尖；三印睡在潮水下，潮信一年褪一回……」',
        '调子苍凉。听完时，风好像也停了一停，一股热气顺着嗓子落进胸口。（斗气 +2）',
      ]);
      fx({ sp: 2 });
    },
  },
  {
    id: 'refugee',
    intro: '一家四口推着独轮车迎面走来，车上捆着的全部家当，看起来比最小的那个孩子还轻。',
    run: async () => {
      const i = await choose([
        { text: '递给他们几枚铜钱', req: s => s.gold >= 2, lock: '金币不足' },
        { text: '向他们打听前路的消息' },
        { text: '侧身让路，各自赶路' },
      ]);
      if (i === 0) {
        fx({ gold: -2, rep: 1 });
        await say([
          '你把铜钱塞进汉子手里。他愣了半晌，忽然拉着全家朝你深深一揖：「恩人！愿先王保佑你，保佑你走到想去的地方！」',
          '（声望 +1）',
        ]);
      } else if (i === 1) {
        await say([
          '「前头？」汉子苦笑着朝身后努努嘴，「我们就是从前头逃下来的。井水黑了，夜里不安静——客官自己当心，多看路，少停脚。」',
          '女人抱着孩子补了一句：「要是看见亮的东西……跟着亮的东西走，错不了。」',
        ]);
      } else {
        await say(['你们侧身相让。车轮碾过冻辙的声音远了，孩子回头看了你一眼，又把脸埋回母亲的围巾里。']);
      }
    },
  },
  {
    id: 'cache',
    intro: '路旁的沟里挂着一只撕破的行囊——不是劫案太新，就是主人走得太急。',
    run: async () => {
      fx({ gold: 3 });
      await say([
        '行囊里的干粮早冻成了石头，几件旧衣服也糟了，只有贴袋里一小把金币还完好。（金币 +3）',
        '你把行囊挂回路边显眼的树枝上——万一主人回头来找，干粮总还在。',
      ]);
    },
  },
  {
    id: 'caravan',
    intro: '一小队驮马从雾里走出来，驮箱捆得严实。押货的汉子朝你扬了扬手里的短棒，看清你的装束后，又换成了拱手。',
    run: async () => {
      const i = await choose([
        { text: '点头致意，目送商队远去' },
        { text: '向伙计买一瓶生命药水（8金币）', req: s => s.gold >= 8, lock: '金币不足' },
      ]);
      if (i === 0) {
        await say([
          '你们擦肩而过。领队的汉子回头喊了一句：「客官好走！这世道，兵器亮的都是自家人——咱们不抢你！」',
          '这话听着像夸奖，又像自嘲。',
        ]);
      } else {
        fx({ gold: -8, item: 'potion' });
        await say([
          '伙计麻利地递来一瓶药水，附赠一路顺风。「商路不好走喽，」他压低声音，「南边的雾、北边的雪，全都不安生。您多保重。」',
          '（获得：生命药水 ×1）',
        ]);
      }
    },
  },
  {
    id: 'crows',
    intro: '头顶传来翅膀擦动空气的声音——鸦群贴着树梢低低掠过，成百上千，全都朝着同一个方向去。',
    run: async () => {
      await say([
        '你顺着鸦群的去向望去——那是影渊的方向。',
        '艾莉娅仰头望着，直到最后一只鸦没入云层：「乌鸦认路，比人认得准。它们赶着去『看』什么……这可不是好兆头。」',
        '你们不约而同地加快了脚步。',
      ]);
    },
  },
  {
    id: 'fishsong',
    when: () => S.flags.part2,
    intro: '海风把一段调子送到官道上——前方的礁石上坐着个补网的渔人，一边补一边唱。',
    run: async () => {
      await say([
        '「潮涨莫贪满，潮退莫心慌；海留给人的，总是下一网。」',
        '粗粝的调子在浪声里荡开，一遍又一遍。你不知怎么听懂了些——呼吸沉了下来，斗气在经脉里缓缓流转。（斗气 +2）',
      ]);
      fx({ sp: 2 });
    },
  },
  {
    id: 'scarecrow',
    when: () => S.flags.part3,
    intro: '田头立着一个稻草人，斗笠歪着，怀里却被人塞了一把新鲜的麦穗。',
    run: async () => {
      await say([
        '麦穗还带着露水——是谁在灾难里，仍守着一点丰年的念想。',
        '你把麦穗别回稻草人怀里，替它扶正斗笠。索恩看了一眼，什么也没说，只是走远几步后，把肩膀上不知什么时候多的一小捆柴，放在了另一块田头。（生命 +3）',
      ]);
      fx({ hp: 3 });
    },
  },
];

/* ---------------- 队伍资料 ---------------- */
const PARTY = {
  aria:   { name: '艾莉娅·星语', img: CH + 'aria.svg', role: '半精灵符文学者' },
  thorne: { name: '索恩·铁须', img: CH + 'thorne.svg', role: '矮人守殿战士' },
  kaya:   { name: '卡雅', img: CH + 'kaya.svg', role: '潮歌湾渔家猎手' },
};
