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
  map:     { icon: '🗺️', name: '迷雾古图', desc: '泛黄的羊皮纸，标注着迷雾森林与符文圣殿的方位。行囊中可随时翻看。', kind: 'key', view: 'assets/map_part1.svg' },
  potion:  { icon: '🧪', name: '生命药水', desc: '琥珀色的药液，恢复10点生命。', kind: 'use' },
  potion_big: { icon: '🍶', name: '大生命药水', desc: '工匠反复蒸馏的浓浆，恢复25点生命。', kind: 'use' },
  honey:      { icon: '🍯', name: '林间蜂蜜', desc: '纪老爹蜂箱里割出来的，加一点山泉就是救命的甜。恢复6点生命。', kind: 'use' },
  roast_fish: { icon: '🐟', name: '湖畔烤鱼', desc: '阿满用苇秆串了在火上燎过的湖鱼，外皮焦香。恢复8点生命。', kind: 'use' },
  smoked_meat: { icon: '🥓', name: '猎户熏肉', desc: '霍七用松枝熏的野猪肉，咸香顶饱，赶山人的硬干粮。恢复9点生命。', kind: 'use' },
  hot_soup:    { icon: '🍲', name: '热姜汤', desc: '康婆的铜锅里永远温着的姜汤，一口下去从喉咙暖到脚尖。恢复7点生命。', kind: 'use' },
  clam_skewer: { icon: '🍢', name: '烤贝串', desc: '卤叔盐灶上烤得滋滋作响的贝串，咸鲜顶饱，赶海人的硬干粮。恢复8点生命。', kind: 'use' },
  fish_soup:   { icon: '🍜', name: '鱼骨汤', desc: '海爷的小锅咕嘟了一整天，鲜得能把眉毛鲜掉。恢复9点生命。', kind: 'use' },
  glassbead:  { icon: '🔘', name: '雾蓝玻璃珠', desc: '鸦巢里捡到的玻璃珠，天光下泛着雾一样的蓝。', kind: 'key' },
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
  /* ---- 生活道具与坐骑 ----
   * 火把：探索暗处（地窖/矿洞/暗窟）时自动点燃消耗，照出隐藏线索。
   * 坐骑（mount）：驮上行囊即乘骑。every=每N程省1刻；chance=骑乘时旅途遭遇概率；text=省程时的话。 */
  torch: { icon: '🔥', name: '火把', desc: '松脂浸过三遍的麻束，点燃能撑一炷香。摸黑探地窖、下矿洞、进暗窟时会自动点上，照出黑处藏着的线索。', kind: 'key' },
  mule:  { icon: '🐎', name: '老骡「短鬃」', desc: '渡鸦货车上退役的老驮骡，认路、耐粗饲、见了雾也不惊。驮上它赶路，每三程省下一刻。', kind: 'key',
    mount: { name: '老骡·短鬃', every: 3, chance: 0.22, text: '🐎 老骡子短鬃一甩，碎步赶得轻快——这一程省下一刻脚程。' } },
  horse: { icon: '🐴', name: '青骢马「踏雾」', desc: '白石城马市里最贵的脚力，蹄下生风，走夜路稳得像白天。驮上它赶路，每两程省下一刻，途中遇袭的可能也更小。', kind: 'key',
    mount: { name: '青骢马·踏雾', every: 2, chance: 0.10, text: '🐴 青骢马撒开四蹄，风从耳边过——这一程省下一刻脚程。' } },
  /* ---- 装备（kind:'equip'，slot: weapon|armor|accessory）---- */
  iron_sword:   { icon: '🗡️', name: '铁剑',     desc: '制式铁剑，顺手耐用。攻击 +1。',           kind: 'equip', slot: 'weapon',    atk: 1 },
  bandit_blade: { icon: '🔪', name: '山匪弯刀', desc: '红巾头子的佩刀，刃口有缺。攻击 +2。',     kind: 'equip', slot: 'weapon',    atk: 2 },
  leather_armor:{ icon: '🥼', name: '旅人皮甲', desc: '硝好的皮革护身。受到伤害 -1。',           kind: 'equip', slot: 'armor',     def: 1 },
  guard_mail:   { icon: '🛡️', name: '卫兵锁甲', desc: '白石城卫戍的制式锁甲。受到伤害 -2。',     kind: 'equip', slot: 'armor',     def: 2 },
  star_pendant: { icon: '📿', name: '星辉坠饰', desc: '嵌着碎星石的坠子，微微发暖。生命上限 +6。', kind: 'equip', slot: 'accessory', maxHp: 6 },
  wolf_fang:    { icon: '🦷', name: '狼牙项链', desc: '头狼的獠牙磨成的护身符。会心一击率 +10%。', kind: 'equip', slot: 'accessory', crit: 0.10 },
  old_seal:     { icon: '💠', name: '守殿人印戒', desc: '铁须氏代代相传的旧戒，戒面磨得发亮。生命上限 +4。', kind: 'equip', slot: 'accessory', maxHp: 4 },
  mist_pearl:   { icon: '🔮', name: '雾泽明珠', desc: '湖水磨了百年的珍珠，贴身戴着，心绪莫名安宁。生命上限 +3。', kind: 'equip', slot: 'accessory', maxHp: 3 },
  oldcoins:     { icon: '🪙', name: '七枚古铜币', desc: '湖心洲浅水里排成一列的旧币，绿锈斑斑——同行七人，一人一枚省下的船钱。', kind: 'key' },
  reed_charm:   { icon: '🪈', name: '苇编哨', desc: '老船夫亲手编的苇哨，吹起来像雾散开的声音。斗气上限 +3。', kind: 'equip', slot: 'accessory', spMax: 3 },
  logger_axe:   { icon: '🪓', name: '伐木斧', desc: '伐木场留下的厚背斧，主人逃得急，斧刃倒是新磨的。攻击 +2。', kind: 'equip', slot: 'weapon', atk: 2 },
  lamp_crystal: { icon: '💠', name: '引火晶屑', desc: '灯柱顶端的聚光晶屑，攥在掌心，指缝里漏出细小的金光。', kind: 'key' },
  rite_blade:   { icon: '⚔️', name: '咏祭礼剑', desc: '圣殿仪仗所用的礼剑，剑身刻着颂晨的经文。攻击 +2。', kind: 'equip', slot: 'weapon', atk: 2 },
  whale_lance:  { icon: '🔱', name: '鲸骨长枪', desc: '用老鲸脊骨磨成的猎叉长枪，沉而有劲。攻击 +3。', kind: 'equip', slot: 'weapon', atk: 3 },
  tide_weave:   { icon: '🧥', name: '潮织法衣', desc: '渔家妇女以潮汐线织成的外衣，水汽难侵。受到伤害 -2。', kind: 'equip', slot: 'armor', def: 2 },
  vine_mail:    { icon: '🥬', name: '荆藤战甲', desc: '守穗人以活藤编成的甲衣，藤蔓会自己收紧。受到伤害 -3。', kind: 'equip', slot: 'armor', def: 3 },
  tide_pearl:   { icon: '⚪', name: '深海珍珠', desc: '万顷波涛压出来的圆月。生命上限 +5。', kind: 'equip', slot: 'accessory', maxHp: 5 },
  tide_orb:     { icon: '🔵', name: '潮珠', desc: '永远微凉的一颗潮汐之心，握着它斗气流转不息。斗气上限 +4。', kind: 'equip', slot: 'accessory', spMax: 4 },
  harvest_charm:{ icon: '🧿', name: '麦金护符', desc: '磨得发亮的麦穗金环，穗影里藏着大地的偏心。会心一击率 +8%。', kind: 'equip', slot: 'accessory', crit: 0.08 },
  tower_page:   { icon: '🗒️', name: '机关图志·残页', desc: '《观星台机关图志》的残页，记着星盘刻度的校准之法。', kind: 'key' },
  shadow_note:  { icon: '📓', name: '影蚀手记', desc: '斥候的手记：「晨曦将燃。报于上座：影主之意，先取星辰，后图晨曦。」', kind: 'key' },
  rune5:   { icon: '🚩', name: '战争之印', desc: '七印之五，先王军阵的旗魂，暗金的光在里面猎猎如旗。', kind: 'key' },
  rune6:   { icon: '🔔', name: '暮钟之印', desc: '七印之六，为长夜计时的钟魂，幽蓝的光随一声不存在的钟鸣缓缓荡漾。', kind: 'key' },
  dogtag:  { icon: '🏷️', name: '沙场军牌', desc: '折断皮带上的黄铜军牌，背面刻着一个再也无人呼唤的名字。', kind: 'key' },
  war_map: { icon: '📐', name: '布阵图残页', desc: '影蚀辎重营的军阵图残页，只画着五面战旗中的三面。', kind: 'key' },
  war_order: { icon: '📄', name: '影蚀工令', desc: '「上座亲谕：掘通古渠，静待月晦。——影」。他们在古战场挖的不是印，是路。', kind: 'key' },
  bell_tongue: { icon: '🔩', name: '暮钟的钟舌', desc: '钟楼大钟的铜舌，被辅祭偷了去。没有它，暮钟发不出声。', kind: 'key' },
  /* ---- 藏宝图（击败特定敌人搜出；行囊中可翻阅线索，见 TREASURES）---- */
  tmap_goblin:   { icon: '🗺️', name: '哥布林的藏宝图', kind: 'key',
    desc: '油布裹着的粗皮纸，炭条画得歪歪扭扭，角落按着三只石斧的印子。',
    read: [
      '皮纸上是一团炭条涂的圈圈，中间戳着一个大大的「叉」。歪歪扭扭几笔画的似乎是：三块青石头，一块压一块，再压一块——',
      '「叉」的旁边画着三只石斧，还有一串谁也看不懂的鬼画符。以哥布林的手艺，这已经算得上精工细作了。',
      '（图上的叠石，像是雾林深处有人迹的地方——隐秘小径？）',
    ] },
  tmap_bandit:   { icon: '🗺️', name: '红巾的藏宝图', kind: 'key',
    desc: '折得整整齐齐的一张羊皮图，图角盖着山寨的火漆印，画工意外地好。',
    read: [
      '羊皮图上画着隘口的岩石，一道斧凿的记号认得出——正是白霜隘口岩石上那道。',
      '记号下头画着一个「叉」，旁边用炭条描着一行歪字：「风雨口，背风窝，弟兄们的体己。」',
      '（红巾汉子们劫来的财货，看来就埋在隘口的背风处。）',
    ] },
  tmap_smuggler: { icon: '🗺️', name: '走私客的防水图', kind: 'key',
    desc: '蜡封裹了三层的海图残页，海水晶都没渗进去。画的是潮歌湾的沉船群。',
    read: [
      '海图上描着湾里六七道船骸的影子，最大的一道旁边画着「正」字——正是沉船湾那艘刻满正字的巨舟。',
      '另一道小些的船影被圈了出来，船头画着一座黄铜铳座，图注写着：「快船『鹞鹰号』压舱暗格——饶是本事再大，也别叫海吞了本钱。」',
      '（落款只有一个潦草的「七」字。这位走私客的运数，终究还是叫海收走了。）',
    ] },
  tmap_miner:   { icon: '🗺️', name: '矿工的藏宝单', kind: 'key',
    desc: '半张被体温焐软的记账纸，正面是矿上欠薪的数目，背面是一笔一笔的「凑」字账。',
    read: [
      '记账纸的正面是矿上欠薪的数目，背面歪歪扭扭记着另一笔账：「老四出三文，老七出三文……凑到今天，够给婆娘扯身布、给孩子抓药。剩下的，埋汤泉边热泥里。」',
      '末尾画着个记号：三道热气，底下一块压着木牌的界石——是雪谷野汤泉边那块「勿动」的界石。',
      '（矿工们一文一文凑出的卖命钱，就埋在温泉边的热泥底下。老规矩，埋钱的地方，得有人看着。）',
    ] },
  tmap_crab:   { icon: '🗺️', name: '蟹妖的藏宝图', kind: 'key',
    desc: '被螯肢磨出毛边的半张皮纸，油渍斑斑——看不出是抢来的还是捡来的。',
    read: [
      '皮纸上几笔歪歪扭扭的炭线：一具大鱼的骨头，肋骨拱成一道「门」，门下戳着一个大大的「叉」。',
      '「叉」旁边画着一只张牙舞爪的蟹，蟹钳里还夹着一枚亮闪闪的圆片——以蟹妖的性子，亮的东西它都往窝里拖。',
      '（巨骨拱成的「门」——像是鲸骨滩那副大鲸的肋穹。）',
    ] },
  /* ---- 宝藏掘获的装备 ---- */
  jade_charm:   { icon: '🟢', name: '合掌玉佩', desc: '被盘得温润的青玉佩，刻着先王的合掌纹章。生命上限 +3。', kind: 'equip', slot: 'accessory', maxHp: 3 },
  guard_brace:  { icon: '🟡', name: '戍卒的铜护腕', desc: '白石城戍卒的制式铜护腕，内侧錾着一个名字。受伤 -1。', kind: 'equip', slot: 'accessory', def: 1 },
  corsair_hook: { icon: '🪝', name: '私掠者的虎爪链', desc: '私掠船长贴身的虎爪链扣，扣环上还挂着半枚赌骰。攻击 +1。', kind: 'equip', slot: 'accessory', atk: 1 },
  star_silver_charm: { icon: '🔷', name: '星髓银坠', desc: '一小块星髓银磨成的坠子，天越暗，它越亮。会心一击率 +8%。', kind: 'equip', slot: 'accessory', crit: 0.08 },
  miner_lamp:  { icon: '🏮', name: '老矿工的风灯', desc: '挡风的灯罩磨得发亮，风雪里也吹不灭。斗气上限 +2。', kind: 'equip', slot: 'accessory', spMax: 2 },
  peace_knot:  { icon: '🪢', name: '孩子们打的平安结', desc: '慈幼堂的孩子们用红绳一人一道编成的结。生命上限 +2。', kind: 'equip', slot: 'accessory', maxHp: 2 },
  sea_rope:    { icon: '🧵', name: '海母祠的红绳', desc: '祝婆婆亲手系的红绳，在全祠最早的一盏祈愿灯下压了三十年。生命上限 +3。', kind: 'equip', slot: 'accessory', maxHp: 3 },
  whale_amber: { icon: '🟠', name: '老鲸的琥珀', desc: '鲸脂裹出的老琥珀，贴身戴着，冬天下水也挡得住寒气。生命上限 +4。', kind: 'equip', slot: 'accessory', maxHp: 4 },
  /* ---- 装备（kind:'equip'，slot: weapon|armor|accessory）---- */
  war_glaive:  { icon: '🗡️', name: '折戟长戈', desc: '碑林深处找回的老将佩戈，戈头折过又重铸。攻击 +4。', kind: 'equip', slot: 'weapon', atk: 4 },
  war_mail:    { icon: '🛡️', name: '战殁重铠', desc: '从战将黑铠上剥下的残甲，千锤百炼。受到伤害 -4。', kind: 'equip', slot: 'armor', def: 4 },
  jade_chime:  { icon: '🎐', name: '玉磬坠', desc: '修道院代代相传的玉磬，声音清得能压住噩梦。斗气上限 +6。', kind: 'equip', slot: 'accessory', spMax: 6 },
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
  warhorn:    { icon: '📯', name: '战号之锋', cost: 10, kind: 'magic', power: 3.2, weapon: true, reqFlag: 'rune5', desc: '以战争之印附剑，万军莫当的一击（无视护甲）' },
  knell:      { icon: '🔔', name: '暮钟长鸣', cost: 10, kind: 'magic', power: 1.7, weapon: true, all: true, reqFlag: 'rune6', desc: '暮钟的余音荡开，撼动全场（无视护甲）' },
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
    drops: [{ item: 'tmap_goblin', chance: 0.35, skip: () => (S.items.tmap_goblin || 0) > 0 || S.flags.dug_goblin,
      text: '投索哥布林的腰囊里滚出一只油布小包——里头除了碎铜钱，还有一张画得歪歪扭扭的皮纸图。' }],
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
    drops: [{ item: 'tmap_bandit', chance: 1, skip: () => (S.items.tmap_bandit || 0) > 0 || S.flags.dug_bandit,
      text: '红巾头子的皮甲夹层里缝着一张折得整整齐齐的图，图角盖着山寨的火漆印。' }],
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

  /* ---- 第一部扩写 · 迷雾森林与圣殿 ---- */
  mistcrows: {
    name: '雾鸦群', char: CH + 'raven.svg',
    exp: 9, gold: 4,
    units: [
      { name: '头鸦', hp: 8, dmg: [1, 2],
        moves: [
          { name: '挖啄', type: 'atk', weight: 2 },
          { name: '俯衔回旋', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '贴着雾顶兜了个圈，收翅俯冲——【俯衔回旋】！' },
        ],
        die: '头鸦一声哑叫，斜斜栽进了坡下的雾里。' },
      { name: '雾鸦', hp: 6, dmg: [1, 2], moves: [{ name: '抠啄', type: 'atk' }], die: '雾鸦扑棱着逃回枝头，再也不敢下来。' },
    ],
    intro: '坡上的鸦群炸开，贴着雾顶盘旋而下——它们的眼睛亮得不像鸟。',
    win: '鸦群重新拢进雾里。你脚边的枯枝上留下它们收集的亮东西：几枚硬币，一粒磨亮的玻璃珠。',
    death: [
      '无数翅膀盖下来，雾漫进你的口鼻。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  bramble: {
    name: '荆棘蔓灵', char: CH + 'husk.svg',
    hp: 16, dmg: [1, 3], def: 1, exp: 13, gold: 6, noFlee: true,
    moves: [
      { name: '荆鞭', type: 'atk', weight: 2 },
      { name: '缠根须', type: 'stun', chance: 0.3, cd: 3, hint: '可能缠住你的脚！', text: '地面的根须悄然拱起，猛地绞住你的脚踝——【缠根须】！' },
      { name: '抽枝凝刺', type: 'shield', amount: 4, cd: 3, hint: '正在凝出棘刺', text: '断口处噼啪抽出新一层荆棘，密密地护住核心。' },
    ],
    intro: '贮木场的老藤无声地拧作一团人形的荆丛，挡在工具棚前——它在替什么人，看着这地方。',
    win: '荆丛散成满地带刺的碎叶，肥进泥土里。藤心里缠着伐木人来不及带走的厚背斧，斧刃竟是新磨的。',
    death: [
      '荆棘从四面八方卷来，温柔而不容拒绝，像大地收走一件借走太久的东西。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  sentinel: {
    name: '被蚀的石兽', char: CH + 'harvestgiant.svg',
    hp: 20, dmg: [2, 4], def: 1, exp: 14, gold: 8, noFlee: true,
    rageAt: 10, rageText: '刻痕里的黑气烧穿了石皮——石兽的眼窝亮起两点紫焰，爪势骤然狂乱！',
    moves: [
      { name: '石爪', type: 'atk', weight: 2 },
      { name: '重碾', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '整个前倾，石躯带着千钧之势砸落——【重碾】！' },
      { name: '镇庭低吼', type: 'buff', cd: 3, hint: '石兽的怒意攀升', text: '石躯深处滚出低沉的轰鸣，整座灯庭跟着共振。' },
    ],
    intro: '石兽的关节里迸出砂与尘——三百年不曾动过的东西，为你一个人醒了过来。此战，无处可退。',
    win: '石兽散作碎金与石屑，纷纷扬扬，像一场迟到了三百年的落雪。碎屑里，一枚完好的晶屑兀自亮着。',
    death: [
      '石爪落下前，你恍惚看见它眼里掠过一丝不属于紫焰的哀意。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },

  /* ---- 第二部扩写 · 霜脊山道与白石城 ---- */
  frosthusk: {
    name: '霜僵', char: CH + 'husk.svg',
    hp: 15, dmg: [2, 4], def: 1, exp: 13, gold: 6,
    drops: [{ item: 'tmap_miner', chance: 0.35, skip: () => (S.items.tmap_miner || 0) > 0 || S.flags.dug_miner,
      text: '霜壳剥落，冻僵的手里还攥着半张焐软了的记账纸——背面密密麻麻记着一笔「凑」出来的账。' }],
    moves: [
      { name: '冻爪', type: 'atk', weight: 2 },
      { name: '碎冰重击', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '僵直的整个躯体贴地扑砸下来——【碎冰重击】！' },
      { name: '寒气缠身', type: 'stun', chance: 0.3, cd: 3, hint: '可能冻住你的手脚！', text: '张开嘴吐出一大团白雾，寒气顺着你的袖口爬进去——【寒气缠身】！' },
    ],
    intro: '雪堆里立起一个叮当作响的影子——冻僵的矿工，还保持着下矿那天弯腰拾镐的姿势。',
    win: '霜壳簌簌散落。僵直的身躯终于躺平了，脸上那种「还在等换班」的神情松开了。',
    death: [
      '冰凉的手掌贴上你的额头，寒意一寸寸漫过口鼻。',
      '——但晨曦之痕在你胸口烫了一下。故事还没完。',
    ],
  },
  corrupt_guard: {
    name: '蚀卒', char: CH + 'assassin.svg',
    hp: 20, dmg: [3, 5], def: 1, exp: 15, gold: 8,
    moves: [
      { name: '长枪突刺', type: 'atk', weight: 2 },
      { name: '横扫枪杆', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '枪杆抡圆，把半条巷子的雪泥都扫了起来——【横扫枪杆】！' },
      { name: '锁子铁壁', type: 'shield', amount: 5, cd: 4, hint: '正在缩甲成盾', text: '拖着枪杆退后半步，蚀变的锁子甲片片竖起，护住身前。' },
    ],
    intro: '披着白石城甲衣的影子缓缓转过身来——甲缝里淌着紫雾，它还记着换防的口令。',
    win: '蚀卒散成一滩黑雾，甲衣「哗啦」瘫在地上。甲叶的缝隙里，卡着几枚没来得及发下的饷钱。',
    death: [
      '紫雾顺着枪杆爬上你的手腕，耳边响起整支军队踏步的声音。',
      '——黑暗尽头，晨曦符文最后一次亮起。',
    ],
  },
  overseer: {
    name: '蚀变的矿监', char: CH + 'husk.svg',
    hp: 26, dmg: [3, 5], def: 1, exp: 17, gold: 12, noFlee: true,
    rageAt: 13, rageText: '矿监手里的名册哗啦啦自己翻动起来——它嘶吼着，锤势陡然狂乱！',
    moves: [
      { name: '矿锤', type: 'atk', weight: 2 },
      { name: '坍方重锤', type: 'heavy', mult: 1.7, cd: 2, hint: '高伤害！', text: '把矿锤抡过头顶砸落，像轰塌一整面坑壁——【坍方重锤】！' },
      { name: '清点名册', type: 'buff', cd: 3, hint: '矿监的怨念在攀升', text: '翻开烂掉的名册，一个名字一个名字地念——整座空村应声呻吟。' },
    ],
    intro: '矿监还握着那本名册——它把整个村子的人，都「记」在了上面。此战，无处可退。',
    win: '矿监散成砂与黑雾，名册飘落在地，最后一页被风吹开——是空白。名册上欠着的，终于都清了。',
    death: [
      '矿锤落下来之前，你听见它念完了最后一个名字——像交了最后一次班。',
      '——恍惚间，你怀中的符文最后一次发烫。',
    ],
  },

  /* ---- 第三部 · 潮歌湾 ---- */
  deepone: {
    name: '深潜者', char: CH + 'deepone.svg',
    hp: 20, dmg: [3, 5], exp: 16, gold: 10,
    drops: [{ item: 'tmap_smuggler', chance: 0.2, skip: () => (S.items.tmap_smuggler || 0) > 0 || S.flags.dug_smuggler,
      text: '它胀大的喉囊里滚出一卷蜡封三层的防水布——海水晶都没渗进去，裹着一张海图残页。' }],
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
    drops: [{ item: 'tmap_smuggler', chance: 0.45, skip: () => (S.items.tmap_smuggler || 0) > 0 || S.flags.dug_smuggler,
      text: '胀裂的喉囊里滚出一卷蜡封三层的防水布——海水晶都没渗进去，裹着一张海图残页。' }],
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
    drops: [{ item: 'tmap_crab', chance: 0.35, skip: () => (S.items.tmap_crab || 0) > 0 || S.flags.dug_crab,
      text: '掀开的旧甲缝里卡着一卷磨出毛边的皮纸——蟹妖也爱亮东西，连人写的字都往窝里拖。' }],
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

  /* ---- 第三部扩写 · 潮歌湾滩涂 ---- */
  brinehusk: {
    name: '盐壳鬼', char: CH + 'husk.svg',
    hp: 16, dmg: [2, 4], def: 1, exp: 14, gold: 6,
    moves: [
      { name: '盐爪', type: 'atk', weight: 2 },
      { name: '盐壳重锤', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '体表的盐壳鼓胀到极限，轰然炸裂——【盐壳重锤】！' },
      { name: '结晶护壳', type: 'shield', amount: 4, cd: 3, hint: '正在凝出盐壳', text: '周身的盐卤飞快析出结晶，层层叠成一面白壳。' },
    ],
    intro: '盐堆里立起一具窸窣作响的白影——晒透的盐壳里裹着的，不知是渔人还是别的什么，还保持着晒盐的姿势。',
    win: '盐壳簌簌剥落，化进卤水池里。池边留下几枚被盐腌得发亮的铜钱，和一把磨秃的盐耙。',
    death: [
      '冰凉的白壳贴上你的口鼻，咸涩漫进呼吸。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  lampfish: {
    name: '灯眼鮟鱇', char: CH + 'deepone.svg',
    hp: 18, dmg: [3, 5], exp: 15, gold: 8,
    moves: [
      { name: '獠牙撕咬', type: 'atk', weight: 2 },
      { name: '灯诱暴咬', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '头顶的「灯」猛地炸亮，晃花你的眼——【灯诱暴咬】！' },
      { name: '毒鳍横扫', type: 'poison', mult: 1.0, cd: 3, hint: '淬毒！', text: '背鳍带着紫黑的黏液横扫而过！' },
    ],
    intro: '黑暗的水面浮起一点冷光，光后头是一张落差极大的巨口——深海的东西，提着灯出来了。',
    win: '灯眼鮟鱇的「灯」闪了两闪，熄了。庞大的影子无声地沉回深水，沙面上留下一小把亮晶晶的沉币。',
    death: [
      '冷光在你眼前炸开，巨口合拢——深海吞掉了最后一丝天光。',
      '——但怀中的符文最后一次发烫。',
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

  /* ---- 第五部 · 战痕古战场 ---- */
  warshades: {
    name: '荒冢战影', char: CH + 'shadowknight.svg',
    exp: 24, gold: 14,
    units: [
      { name: '执矛战影', hp: 22, dmg: [4, 6],
        moves: [
          { name: '锈矛', type: 'atk', weight: 2 },
          { name: '战阵合击', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '与倒下的同伴残影并肩突进——【战阵合击】！' },
        ],
        die: '战影散成一蓬锈色的雾。' },
      { name: '执盾战影', hp: 26, dmg: [3, 5], def: 1,
        moves: [
          { name: '盾缘钝击', type: 'atk', weight: 2 },
          { name: '举盾', type: 'shield', amount: 6, cd: 3, hint: '正在凝聚护盾', text: '锈盾上的凿痕里透出暗金的光。' },
          { name: '盾击', type: 'heavy', mult: 1.4, cd: 2, hint: '高伤害！', text: '整面锈盾砸落——【盾击】！' },
        ],
        die: '锈盾哐当落地，战影跪倒成灰。' },
    ],
    intro: '两道披甲的影子从壕沟里立起——甲缝里没有血肉，只有一千年前没散尽的战意。',
    win: '战影散作锈色的雾，雾里落下一小把腐蚀发黑的军饷。你替最后倒下的那具残影拢了拢衣甲。',
    death: [
      '锈色的雾漫过你的眼睛。荒原上，一千年的军阵朝你合围过来。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  campguard: {
    name: '影蚀营卫', char: CH + 'shadowknight.svg',
    hp: 40, dmg: [5, 8], def: 1, exp: 30, gold: 14, noFlee: true,
    moves: [
      { name: '黑刺', type: 'atk', weight: 2 },
      { name: '影蚀重斩', type: 'heavy', mult: 1.6, cd: 2, hint: '高伤害！', text: '挥出裹挟紫雾的【影蚀重斩】！' },
      { name: '凝盾', type: 'shield', amount: 6, cd: 4, hint: '正在凝聚护盾', text: '抬手凝出一面幽黑的盾壁。' },
    ],
    intro: '营地的紫焰灯齐齐一暗——巡营的影蚀营卫从帐篷的阴影里围拢过来。',
    win: '营卫溃成黑水。辕门下的火盆里，烧剩一半的军令还在冒烟。',
    death: [
      '紫雾淹没你的视野。营地的号角低低地响了一声，像在点名。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  wargeneral: {
    name: '影蚀战将 · 断矛', char: CH + 'shadowknight.svg',
    hp: 210, dmg: [8, 12], def: 2, exp: 60, gold: 55, noFlee: true,
    rageAt: 105, rageText: '战争之印的暗金光灼进它的兜帽——战将发出沙场点兵般的长啸，锈甲层层炸开，露出底下涌动的黑雾！它的攻势骤然狂暴！',
    moves: [
      { name: '断矛突刺', type: 'atk', weight: 2 },
      { name: '万矛齐发', type: 'heavy', mult: 1.8, cd: 2, hint: '极高伤害，务必防御！', text: '荒原上所有的断矛应声震颤，齐齐朝你攒射——【万矛齐发】！' },
      { name: '战旗壁垒', type: 'shield', amount: 9, cd: 4, hint: '正在凝聚护盾', text: '五面残旗无风自张，垂下一面铁色的光壁。' },
      { name: '亡魂军号', type: 'stun', chance: 0.3, cd: 4, hint: '可能锁住你的行动！', text: '呜——一声不该存在的号角从地底响起——【亡魂军号】！' },
      { name: '汲战意', type: 'drain', mult: 1.0, cd: 3, hint: '汲取生命', text: '你的战意顺着伤口被抽走，涌进它的锈甲。' },
    ],
    intro: '战旗台上，锈甲的巨影拄着一柄折断的长矛站起。它背后，战争之印的暗金光在旗影里明灭。',
    win: '断矛当啷落地。战将的锈甲一片片剥落，露出里面一枚安安静静的暗金印玺——它等这一战，等了一千年。',
    death: [
      '锈色的雾没过你的口鼻。荒原的风里，千军万马的呼喝声由远及近。',
      '——黑暗尽头，符文最后一次亮起。',
    ],
  },

  /* ---- 第六部 · 暮色修道院 ---- */
  mutes: {
    name: '缄默修士', char: CH + 'shadowknight.svg',
    exp: 26, gold: 15,
    units: [
      { name: '执杖修士', hp: 24, dmg: [4, 6],
        moves: [
          { name: '悔罪杖击', type: 'atk', weight: 2 },
          { name: '缄默重杖', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '铁头牧杖抡圆砸落——【缄默重杖】！' },
        ],
        die: '修士的黑袍散开，底下空无一人。' },
      { name: '执烛修士', hp: 20, dmg: [3, 5],
        moves: [
          { name: '烛火鞭', type: 'atk', weight: 2 },
          { name: '沉默祷言', type: 'stun', chance: 0.3, cd: 3, hint: '可能锁住你的行动！', text: '无声的祷词直接撞进你的颅骨——【沉默祷言】！' },
        ],
        die: '烛火熄灭，修士散成一缕青烟。' },
    ],
    intro: '晚课的阴影里立起两名黑袍修士——他们的嘴唇被黑线缝住，祷词直接撞进你的颅骨。',
    win: '缝线崩断，黑袍落地。远处，晚课的钟声轻轻荡了一声，像叹息。',
    death: [
      '黑线缠上你的嘴唇，无声的祷词灌进你的耳朵。暮色修道院的钟，再也没能为你敲响。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  acolyte: {
    name: '影蚀辅祭', char: CH + 'assassin.svg',
    hp: 28, dmg: [4, 7], exp: 24, gold: 12,
    moves: [
      { name: '掠影重击', type: 'heavy', mult: 1.5, cd: 2, hint: '高伤害！', text: '黑袍鼓荡，裹着香灰的掌风拍落——【掠影重击】！' },
      { name: '蚀骨薰香', type: 'poison', mult: 1.1, cd: 3, hint: '淬毒！', text: '打翻的香炉腾起紫烟——蚀骨的薰香呛进喉咙！' },
      { name: '香炉砸', type: 'atk', weight: 2 },
    ],
    intro: '黑袍辅祭从阴影里转过身来，怀里死死抱着什么东西——铜舌在袍子里磕出一声闷响。',
    win: '辅祭的黑袍散作烟尘，只留下一串发烫的紫脚印，朝山门外去了。',
    death: [
      '蚀骨的薰香灌进肺里。暮色里的晚课钟声，成了为你敲响的丧钟。',
      '——但怀中的符文最后一次发烫。',
    ],
  },
  chantress: {
    name: '影蚀圣咏者 · 夜祷', char: CH + 'tidesage.svg',
    hp: 230, dmg: [8, 12], def: 2, exp: 70, gold: 60, noFlee: true,
    rageAt: 115, rageText: '暮钟之印的幽蓝光刺进她的兜帽——圣咏者的咏叹陡然拔高，整座钟楼跟着她的声音震颤！她的攻势骤然狂暴！',
    moves: [
      { name: '夜祷咏叹', type: 'atk', weight: 2 },
      { name: '葬钟重鸣', type: 'heavy', mult: 1.8, cd: 2, hint: '极高伤害，务必防御！', text: '她十指张开，大钟在她头顶轰然重鸣——【葬钟重鸣】！' },
      { name: '黑夜帷幔', type: 'shield', amount: 10, cd: 4, hint: '正在凝聚护盾', text: '圣歌层层叠起，黑纱般的帷幔裹住她的身形。' },
      { name: '钟鸣震魂', type: 'stun', chance: 0.35, cd: 4, hint: '可能锁住你的行动！', text: '一声不谐和的钟鸣当头砸落——【钟鸣震魂】！' },
      { name: '安魂圣歌', type: 'drain', mult: 1.1, cd: 3, hint: '汲取生命', text: '她唱起倒转的安魂曲，你的气力随着音符流进她的喉咙。' },
    ],
    intro: '钟楼顶层，黑袍的圣咏者悬在钟舌旁，像停驻在琴弦上的一只蛾。她没有脸，只有一道唱着圣歌的、缓缓开合的缝。',
    win: '咏叹声碎在半空。夜祷的黑袍一层层垂落，钟舌上只留下一枚幽蓝的印玺，随一口无声的钟鸣轻轻荡着。',
    death: [
      '圣歌灌满你的耳朵，世界安静下来——安静得像一支只为你而唱的安魂曲。',
      '——黑暗尽头，符文最后一次亮起。',
    ],
  },

  /* ---- 终部 · 影渊要塞 ---- */
  bridgeguard: {
    name: '影渊桥头守将', char: CH + 'shadowknight.svg',
    hp: 70, dmg: [6, 9], def: 1, exp: 45, gold: 30, noFlee: true,
    moves: [
      { name: '黑刃', type: 'atk', weight: 2 },
      { name: '重锤斩', type: 'heavy', mult: 1.7, cd: 2, hint: '高伤害！', text: '黑剑抡起，像锤一样砸落——【重锤斩】！' },
      { name: '凝盾', type: 'shield', amount: 7, cd: 4, hint: '正在凝聚护盾', text: '桥面的黑曜石应声而起，在它身前拼成盾壁。' },
    ],
    intro: '桥头，一名影蚀武士自阴影中立起，黑剑出鞘的声音像骨头折断。',
    win: '守将的黑剑断成两截，它的躯体像退潮的黑水一样从铠甲里泻出。要塞的大门在你们面前轰然洞开。',
    death: [
      '你倒在独石桥上。雾海深处，那个游弋的巨大影子终于有了名字，也终于有了晚餐。',
      '——影渊的风里，有人在低声咒骂，又有人在低声祈祷。两者都希望你再试一次。',
    ],
  },
  mograth: {
    name: '暗影君主 · 莫格拉斯', char: CH + 'mograth.svg',
    hp: 260, dmg: [9, 13], def: 2, exp: 100, gold: 100, noFlee: true, sacrifice: true,
    rageAt: 130, rageText: '莫格拉斯的铠甲缝隙里爆出紫焰——「好！很好！三百年了，终于有人配得上让我认真！」他的攻势骤然狂暴！',
    moves: [
      { name: '深渊斩', type: 'atk', weight: 2 },
      { name: '王座碾压', type: 'heavy', mult: 1.9, cd: 2, hint: '极高伤害，务必防御！', text: '他单手举剑，像举起整座王座劈落——【王座碾压】！' },
      { name: '深渊护壁', type: 'shield', amount: 10, cd: 4, hint: '正在凝聚护盾', text: '紫焰自他脚下盘旋而上，凝成一圈黑曜石般的壁障。' },
      { name: '深渊锁链', type: 'stun', chance: 0.35, cd: 4, hint: '可能锁住你的行动！', text: '七条锁链从王座底下窜出——【深渊锁链】！' },
      { name: '汲渊', type: 'drain', mult: 1.1, cd: 3, hint: '汲取生命', text: '你的生命顺着剑刃倒流进他的黑甲——三百年了，他渴了很久。' },
    ],
    intro: '黑曜王座上，莫格拉斯终于握住了他三百年不曾出鞘的剑。整座大厅的光，同时暗了下去。',
    win: '黑甲崩解。莫格拉斯的身影在紫焰中一层层变淡——王座之上，落下了三百年来的第一缕晨光。',
    death: [
      '你倒在王座阶前。莫格拉斯俯视着你，眼里的紫焰没有得逞的快意，只有一种近乎悲悯的平静。',
      '「回去吧，孩子。」他说，「把路走完，再回来。」',
    ],
  },
};

/* ---------------- 任务 ---------------- */
const QUESTS = {
  q_inn:    { title: '黑鸦旅店的怪客', hint: '灰岭镇黑鸦旅店里，那位灰袍老者似乎有话想对你说。' },
  q_night:  { title: '风雨之夜', hint: '在旅店客房歇一晚吧。今夜风雨大作，握紧你的剑。' },
  q_aria:   { title: '晨曦之痕', hint: '带着符文碎片南下，穿过迷雾森林，寻找符文学者艾莉娅·星语。' },
  q_temple: { title: '符文圣殿', hint: '通过三重试炼：勇气、智慧、心灵，重燃晨曦祭坛。' },
  q_north:  { title: '星辰之印', hint: '北上白石城——星辰之印就供在星塔顶上。' },
  q_city:   { title: '白石城的阴影', hint: '觐见莉安娜女王，查清大臣巴洛克的底细。' },
  q_tower:  { title: '星塔之夜', hint: '今夜月晦，影蚀领主亲取星辰之印——赶到星塔顶！' },
  q_tide:   { title: '海洋之印', hint: '南下潮歌湾——第三印沉眠在海底神殿，大退潮之夜海路自现。' },
  q_harvest:{ title: '丰收之印', hint: '东行金穗平原——蝗灾与腐穗的背后，是影蚀对第四印的图谋。' },
  q_war:    { title: '战争之印', hint: '北行战痕古战场——第五印沉眠在战旗之下，影蚀的爪子已经先一步伸进了亡者的地界。' },
  q_bell:   { title: '暮钟之印', hint: '西行暮色修道院——第六印悬在钟楼顶层。风里有钟声，时间还够。' },
  q_abyss:  { title: '深渊之印 · 影渊', hint: '最后一印不在途中，在底下。北上影渊，走进那座黑曜石的要塞。' },
  q_done:   { title: '七印之路 · 暂歇', hint: '在艾尔多兰随意行走，收集未见的角落。' },
};

/* ---------------- 支线任务 ---------------- */
const SIDE_QUESTS = {
  herb:   { title: '月下香草', hint: '为采药人玛戈采集3株月光草。林道、隐秘小径、黄昏营地各长着一株。' },
  fare:   { title: '湖底的船钱', hint: '湖心洲的浅水里沉着七枚古铜币——同行七人各自省下的船钱。替老船夫把它们送回湖底，替亡者把账清了。' },
  lamps:  { title: '复明的灯柱', hint: '石兽灯庭有三对灯柱被影蚀弄熄了。集齐三枚引火晶屑（被蚀的石兽、钟塔残基的钟腹、地宫的烛泪塔），让灯庭重新亮起来。' },
  bees:   { title: '走失的蜂群', hint: '养蜂人纪老爹的蜂群连王带巢飞进了林子，多半在苔藓谷的老栎树洞里结了团。替他把蜂群带回去。' },
  bounty: { title: '隘口的匪首', hint: '驿镇告示：红巾匪首盘踞白霜隘口，取其首级回来领赏18金币。' },
  lost:   { title: '宵禁下的失踪', hint: '帮街角老妇寻找失踪的学徒艾德温。宵禁后的城西小巷，或许有线索。' },
  lamb:     { title: '走失的羊羔', hint: '牧羊坡的石头丢了头羊羔（额头一块灰）。天冷了，它准往暖和的地方钻——雪谷野汤泉的白气最旺。' },
  porridge: { title: '慈幼堂的口粮', hint: '下城慈幼堂的粥一日稀过一日。给白嬷嬷带两块猎户熏肉，让四十七个孩子喝上稠粥。' },
  creek:      { title: '溪水的账', hint: '石桥渡的溪水浑了半个月——上游是霜脊山的矿坑，坑道下游冻着一道水闸。砸开它，下游的水才能重新流清。' },
  seventh:    { title: '第七张脸', hint: '白石城铸像广场上，先王的像合掌而立。回荒石料场，把这位先王的模样讲给莫大——他敢刻了。' },
  oldfriends: { title: '山里的旧友', hint: '霍七惦记着灰岭镇的老猎户哈克。替他跑一趟灰岭集市问声近况，再把口信带回山口。' },
  letters:    { title: '矿工的家书', hint: '空营矿村何十斤攒了一沓家书与工牌——好几户矿工家属，逃难在了南边的灰岭镇。' },
  glowweeds: { title: '灯塔的荧藻', hint: '为守塔人老祈采集3株荧藻（礁滩、沉船湾、潮汐洞窟），重亮潮歌灯塔。' },
  shipwall:  { title: '船壁的名字', hint: '海母祠的祝婆婆想听沉船湾那面刻满「正」字的船壁的最后一行——她儿子的刀法，她认得。' },
  grandrod:  { title: '阿公的旧竿', hint: '孤礁钓台的遮棚里立着卡雅阿公的老钓竿——「留给认得的娃」。带回灯塔，交给跟阿公钓了一辈子鱼的老祈。' },
  seeds:  { title: '被偷走的谷种', hint: '穗安村的祭典谷种被偷进了老磨坊——替村长取回来。' },
  warname:{ title: '碑林的名字', hint: '亡者碑林的老兵亡魂想找回三块沙场军牌（折戟丘、白骨哨塔、影蚀辎重营），好让碑林重新记住他们的名字。' },
  belltongue: { title: '哑了的暮钟', hint: '守钟人修士的钟舌被影蚀辅祭偷上了钟楼——替他取回来。' },
};

/* ---------------- 结局（章节收尾 + 终局，可收集） ---------------- */
const ENDINGS = [
  { id: 'ending_star_guardian', icon: '🌟', name: '星辰守护者' },
  { id: 'ending_undercurrent',  icon: '🌑', name: '暗流涌动' },
  { id: 'ending_tide_guardian', icon: '🌊', name: '沧海守护者' },
  { id: 'ending_tide_whisper',  icon: '🐚', name: '潮声呢喃' },
  { id: 'ending_harvest_guardian', icon: '🌾', name: '大地的守望者' },
  { id: 'ending_rot_seed',      icon: '🍂', name: '腐香暗种' },
  { id: 'ending_war_warden',    icon: '🚩', name: '战旗不倒' },
  { id: 'ending_war_whisper',   icon: '🌫️', name: '锈色低语' },
  { id: 'ending_bell_warden',   icon: '🔔', name: '晚祷的回声' },
  { id: 'ending_bell_back',     icon: '🔕', name: '钟声的背面' },
  { id: 'ending_dawn',          icon: '🌅', name: '破晓之光' },
  { id: 'ending_watcher',       icon: '🌙', name: '守夜人之誓' },
  { id: 'ending_sacrifice',     icon: '🕯️', name: '晨曦之殉' },
  { id: 'ending_dusk',          icon: '🥀', name: '灰烬之约' },
  { id: 'ending_corrupt',       icon: '👑', name: '暗影新王' },
];

/* ============================================================
 * 商店（渡鸦 / 货郎共用进货表，售价全境统一）
 * unique 的货物只卖一件；已持有或已装备则不再上架。
 * ============================================================ */
const SHOP = {
  torch:         { cost: 3,  label: '一支火把 · 照亮黑暗一角',      line: '「松脂浸足了三遍，」渡鸦把火把递过来，「地窖、矿洞、暗窟——黑处藏的东西，只给带光的人看。」' },
  potion:        { cost: 8,  label: '一瓶生命药水 · 恢复10',        line: '你接过药水。瓶身还带着货车夹层的凉意。' },
  potion_big:    { cost: 20, label: '一瓶大生命药水 · 恢复25',      line: '浓浆似的药液在瓶里缓缓打转。「省着喝，」渡鸦说，「这玩意比金子还稠。」' },
  amulet:        { cost: 18, label: '一枚星光护符 · 濒死救命一次',  line: '星光护符在你掌心轻轻一颤，像一颗小小的心跳。「可别浪费了，」渡鸦说，「它只肯为人碎一次。」' },
  iron_sword:    { cost: 15, label: '一把铁剑 · 攻击+1',   unique: true, line: '铁剑入手沉稳，比您那把陪您睡过桥洞的旧剑轻了三分。' },
  leather_armor: { cost: 18, label: '一件旅人皮甲 · 受伤-1', unique: true, line: '皮甲硝得柔软，贴身一穿，风都好像小了些。' },
  star_pendant:  { cost: 22, label: '一枚星辉坠饰 · 生命上限+6', unique: true, line: '坠饰里的碎星石一闪一闪，像把一小片夜空挂在了脖子上。' },
  tide_weave:    { cost: 26, label: '一件潮织法衣 · 受伤-2', unique: true, line: '潮织法衣入手微凉，海风一吹，衣料里像有细浪走过。' },
  harvest_charm: { cost: 24, label: '一枚麦金护符 · 会心+8%', unique: true, line: '麦金护符在指间转了半圈。「大地的偏心，」渡鸦说，「戴着的人出剑都准三分。」' },
  mule:          { cost: 25, label: '一匹老骡「短鬃」 · 赶路每三程省一刻', unique: true, line: '老骡子冲你打了个响鼻。渡鸦拍拍它的脖子：「短鬃，一张认路的活地图。往后赶路，让它替你省力气——驮着就是骑，不用鞍。」' },
  horse:         { cost: 70, label: '一匹青骢马「踏雾」 · 赶路每两程省一刻', unique: true, line: '青骢马通身青白，蹄子磕在石板上像敲更。渡鸦压低嗓子：「踏雾——走夜路不惊东西的名字。骑上它，路上清净得多。」' },
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
 * 酒馆传闻（随天数与剧情推进刷新，讲过的不再重复）
 * 好酒下肚，天下的消息就活了：天数越多、走得越远，酒馆里的新鲜事越多。
 * ============================================================ */
const TAVERN_RUMORS = [
  { id: 'road_fog', when: () => timeDay() <= 3, lines: [
    '「南边的雾一天浓过一天。老辈人说，雾涨到第三天还不散，林子就要『换脾气』了。」',
    '「换什么脾气？」他压低嗓子，「——吃人的脾气。」',
  ] },
  { id: 'creek_muddy', when: () => timeDay() >= 2, lines: [
    '「石桥渡的老吴说，溪水半个月前就开始发浑。上游出了什么事，没人敢上去看。」',
  ] },
  { id: 'crows_watch', when: () => timeDay() >= 2, lines: [
    '「鸦眠坡的乌鸦近来疯了一样，白天黑夜往东南山里飞。乌鸦认路——它们赶着去『看』什么。」',
  ] },
  { id: 'honey_good', when: () => timeDay() >= 2, lines: [
    '「林间蜂场纪老爹的蜂蜜，顶顶管用：饿了掰一口，伤了敷一口。就是他家蜂群最近怪怪的。」',
  ] },
  { id: 'night_fog', when: () => timeDay() >= 3, lines: [
    '「夜里别赶路！雾里的『没脸东西』白天还讲点规矩，一入夜，连火把都照不住。」',
    '「真要夜行？记三个字：不对视。」',
  ] },
  { id: 'torch_talk', when: () => timeDay() >= 2, lines: [
    '「夜里探废墟、下地窖，先去货郎那儿买支火把。老掘客的行话：黑处藏的东西，只给带光的人看。」',
    '「雇不起火把？听说星辉法师都会一手『星火引灯』的小术——一缕斗气，亮一炷香，比火把还稳当。」',
  ] },
  { id: 'temple_gate', when: () => S.flags.heardLegend || timeDay() >= 3, lines: [
    '「符文圣殿的大门三百年没开过。门上三枚符文：晨曦、星辰、深渊。」',
    '「门楣刻着句老话：『吾随最后一缕光沉眠』。猜了几百年，没人猜中过。」',
  ] },
  { id: 'shrine_bird', when: () => S.flags.shrineBless, lines: [
    '「林中古祠是间怪祠——荒了三百年，一尘不染。有人说是只白鹇在打扫，有人说是先王的魂。」',
    '「依我看呐，是还有人做好事，世道就还没坏透。」',
  ] },
  { id: 'aria_seen', when: () => S.flags.aria, lines: [
    '「听说有个银头发的半精灵学者在雾林里走动，见人就打听晨曦符文。」',
    '「精灵的星辉魔法，三百年没见过了。那可是砍不穿的墙、烧不化的火。」',
  ] },
  { id: 'part1_dawn', when: () => S.flags.part1, lines: [
    '「大新闻！圣殿金顶亮了！守殿人那个矮子下山买了十斤酒，逢人就说『灯点亮了』！」',
    '「三百年头一回。要我说，世道怕是要变。」',
  ] },
  { id: 'part2_guard', when: () => S.flags.part2, lines: [
    '「北边白石城在换防，卫兵抽走一半调去北境。城防空成那样，可别出事。」',
  ] },
  { id: 'mine_silent', when: () => timeDay() >= 3, lines: [
    '「霜脊山的银矿去年秋天说停就停。矿上的人，逃的逃，没的没——如今山里夜里行走的东西，比活人还多。」',
  ] },
  { id: 'goat_spring', when: () => timeDay() >= 3, lines: [
    '「赶山的人都懂：在霜脊山迷了路，就找白气。牧羊坡南边雪谷里有眼野汤泉，天越冷，白气越旺。」',
  ] },
  { id: 'moat_dark', when: () => S.flags.inCity || timeDay() >= 4, lines: [
    '「白石城的护城河发黑了。老辈人讲，城根下的水最通人性——水黑成那样，是城里在『烂心』。」',
  ] },
  { id: 'granary_night', when: () => S.flags.granaryClue, lines: [
    '「官仓夜里搬粮的车队？嘘——车是谁家的，官仓的墙知道。可墙不会说，你也当没看见。」',
  ] },
  { id: 'part2_clear', when: () => S.flags.part2, lines: [
    '「大快人心！白石城的巴洛克大人下了大狱，满城的戒严告示一夜之间撕了个干净！」',
    '「星塔顶上那颗宝石又亮了。老人们说，那颗星记事——它记着是谁把夜守住的。」',
  ] },
  { id: 'part3_tide', when: () => S.flags.part3, lines: [
    '「潮歌湾的老渔人说，今年潮汛不对劲——该退的时候不退，该涨的时候黑得像墨。」',
  ] },
  { id: 'harbor_gloom', when: () => timeDay() >= 4, lines: [
    '「南边潮歌湾的灯塔黑了三十年。灯一黑，海里的『老规矩』就散了——夜滩莫走，走一趟少一双鞋。」',
  ] },
  { id: 'whale_king', when: () => timeDay() >= 4, lines: [
    '「鲸骨滩上那副大鲸骨，老辈人说是『鲸王』。猎鲸人敬它如敬神——滩上祭台的火，三十年没人敢断。」',
  ] },
  { id: 'salt_keeper', when: () => timeDay() >= 5, lines: [
    '「潮歌湾的盐场散了三十年工，就剩个卤叔守着几十口锅。他说盐是百味之首——世道再乱，汤不能淡。」',
  ] },
  { id: 'sea_blind', when: () => timeDay() >= 5, lines: [
    '「海母祠的祝婆婆眼睛瞎了三十年，可她说她『看得见』海。谁家出海都去讨一句风——奇怪的是，讨过风的，都回了港。」',
  ] },
  { id: 'tide_lamp', when: () => S.flags.lampLit, lines: [
    '「潮歌湾的灯塔亮了！渔人们说，塔光扫过夜海那晚，滩上的黑影齐齐退回了水里——三十年了，头一回。」',
  ] },
  { id: 'part4_locust', when: () => S.flags.part4, lines: [
    '「金穗平原来信，说田里见了蝗虫的苗头。丰年祭要是办不成，那是要饿死人的。」',
  ] },
  { id: 'part5_rollcall', when: () => S.flags.part5, lines: [
    '「古战场夜里有人点名——当过兵的都懂，那是坟头的兵在点卯。近年头一回听见。」',
  ] },
  { id: 'part6_bell', when: () => S.flags.part6, lines: [
    '「西边暮色修道院的钟哑了几百年。前几日夜里，有人听见它『当』了一声。就一声。」',
  ] },
];
/* 酒馆传闻循环：who 是酒客的称呼；请一碗酒听一条，讲过的不再重复 */
async function tavernRumors(who, cost = 2) {
  await say([`${who}拎着酒壶凑过来，在你对面坐下，压低了嗓门。`]);
  for (;;) {
    const pool = TAVERN_RUMORS.filter(r => !S.events['rum_' + r.id] && r.when());
    const opts = [
      { text: `请${who}喝一碗，听条新鲜传闻（${cost}金币）`, req: s => s.gold >= cost, lock: '金币不足',
        run: async () => {
          const r = pool.length ? pool[rnd(pool.length)] : null;
          if (!r) { await say([`「新鲜事？」${who}咂了咂酒，「都叫我讲尽了。等过两天出了新的事，我头一个告诉你。」`]); return; }
          fx({ gold: -cost });
          S.events['rum_' + r.id] = true;
          await say(r.lines);
          await say(['（传闻记下了。日子过得越久、路走得越远，酒馆里的新鲜事就越多。）']);
        } },
      { text: '「改日再聊。」', run: async () => {} },
    ];
    const i = await choose(opts);
    if (i < 0) return;
    await opts[i].run();
    if (i === opts.length - 1) return;
  }
}

/* ============================================================
 * 委托板（酒馆墙上，每天刷新一张随机委托）
 * 讨伐式：按击杀计数（战斗胜利自动累计）；采办式：行囊里备齐即交。
 * ============================================================ */
const BOUNTIES = [
  { id: 'wolves', title: '狼患', type: 'kill', en: 'wolves', n: 2, gold: 10, minDay: 1,
    text: '『古道与林缘狼群猖獗，已有两拨行商被劫。猎杀狼群两拨，凭狼耳领赏十枚。』——驿路商会' },
  { id: 'crows', title: '鸦患', type: 'kill', en: 'mistcrows', n: 2, gold: 8, minDay: 1,
    text: '『鸦眠坡的鸦群愈发放肆，抢货啄畜。猎杀雾鸦两拨，赏八枚。』——灰岭猎户会' },
  { id: 'honey', title: '征蜜', type: 'fetch', item: 'honey', n: 2, gold: 7, minDay: 1,
    text: '『旅店后厨征林间蜂蜜两罐，治病配方急用，价钱公道。』——黑鸦旅店后厨' },
  { id: 'fish', title: '鲜味', type: 'fetch', item: 'roast_fish', n: 2, gold: 7, minDay: 1,
    text: '『本店征湖畔烤鱼两条，鲜字当头，苇秆串的优先。』——黑鸦旅店掌柜' },
  { id: 'wraith', title: '雾魅', type: 'kill', en: 'wraith', n: 1, gold: 12, minDay: 2,
    text: '『雾里的没脸东西近日贴着官道游荡，货郎夜不敢行。驱散雾魅一尊，赏十二枚。』——驿路商会' },
  { id: 'goblin', title: '掠袭', type: 'kill', en: 'goblin', n: 1, gold: 9, minDay: 2,
    text: '『哥布林掠袭者劫道伤人。剿灭一伙，赏九枚。』——灰岭镇公所' },
  { id: 'bramble', title: '荆扰', type: 'kill', en: 'bramble', n: 1, gold: 11, minDay: 2,
    text: '『林间老藤成了精，缠了两个药农。伐木场的老规矩：蔓灵挡道，砍散者赏。』——樵夫行会' },
  { id: 'thugpack', title: '路匪', type: 'kill', en: 'thug', n: 2, gold: 9, minDay: 3,
    text: '『山匪近来在霜脊山风口一带劫货，商旅裹足。剿灭两伙，赏九枚。』——驿路商会' },
  { id: 'frosthusk', title: '僵行', type: 'kill', en: 'frosthusk', n: 1, gold: 12, minDay: 3,
    text: '『矿村一带有冻僵不散之物游荡，行旅夜不敢走。驱散一具，赏十二枚。』——官道驿镇卫兵所' },
  { id: 'meatrun', title: '征肉', type: 'fetch', item: 'smoked_meat', n: 2, gold: 8, minDay: 3,
    text: '『本店征猎户熏肉两块，行商配干粮急用，松枝熏的优先。』——官道驿镇客栈' },
  { id: 'corrupt_guard', title: '夜行', type: 'kill', en: 'corrupt_guard', n: 1, gold: 14, minDay: 4,
    text: '『宵禁后有披城防甲衣之物游荡街巷，卫兵不敢近前。驱散一具，赏十四枚。』——白石城卫戍' },
  { id: 'deepone', title: '滩祸', type: 'kill', en: 'deepone', n: 2, gold: 14, minDay: 4,
    text: '『退潮滩上的长臂灰绿之物接连拖人下水，渔行悬赏：猎杀深潜者两具，凭鳃盖领赏十四枚。』——潮歌湾渔行' },
  { id: 'brinehusk', title: '盐祟', type: 'kill', en: 'brinehusk', n: 1, gold: 12, minDay: 4,
    text: '『盐灶滩夜里盐堆挪位，晒透的「人形」上工巡滩。驱散盐壳鬼一具，赏十二枚。』——盐灶滩卤叔' },
  { id: 'reefcrab', title: '覆舟', type: 'kill', en: 'reefcrab', n: 1, gold: 13, minDay: 5,
    text: '『沉船湾的老蟹妖又掀了一条修船。取其螯者，赏十三枚。』——潮记船坞' },
  { id: 'lampfish', title: '提灯', type: 'kill', en: 'lampfish', n: 1, gold: 12, minDay: 5,
    text: '『入夜后滩涂上有冷光游弋，专诱夜渔人。猎杀灯眼鮟鱇一尾，赏十二枚。』——渔家客栈' },
];
function bountyProg(b) {
  if (!b || !S.bounty) return 0;
  return b.type === 'kill'
    ? Math.max(0, (S.kills[b.en] || 0) - (S.bounty.base || 0))
    : Math.min((S.items[b.item] || 0), b.n);
}
async function bountyBoard() {
  await say(['旅店大堂的墙上钉着一块委托木板，钉眼摞着钉眼，是几十年攒出来的厚茧。']);
  if (S.bounty) {
    const b = BOUNTIES.find(x => x.id === S.bounty.id);
    if (!b) { S.bounty = null; return; }
    const prog = bountyProg(b);
    if (prog >= b.n) {
      await say([`委托【${b.title}】办妥了！`]);
      if (b.type === 'fetch') take(b.item, b.n);
      S.doneBounties = S.doneBounties || [];
      S.doneBounties.push(b.id);
      S.bounty = null;
      fx({ gold: b.gold, rep: 1 });
      await say([`（领赏：金币 +${b.gold}，声望 +1）`, '掌柜在木板上敲了颗新钉：「明儿有新差事，常来瞧。」']);
      return;
    }
    await say([`在办委托【${b.title}】：`, b.text, `（进度 ${prog}/${b.n}）`]);
    const i = await choose([{ text: '再等等' }, { text: '不干了，撕掉委托' }]);
    if (i === 1) { S.bounty = null; await say(['你把委托纸撕了下来。掌柜撇撇嘴：「年轻人，三分钟热度。」']); }
    return;
  }
  const pool = BOUNTIES.filter(b => timeDay() >= b.minDay && !(S.doneBounties || []).includes(b.id));
  if (!pool.length) { await say(['板上空空。掌柜两手一摊：「差事都办完了？好兆头——就是我这儿没新纸可钉喽。」']); return; }
  const b = pool[timeDay() % pool.length];   // 按天轮换：每天来，看到的都不一样
  await say([`今日委托【${b.title}】：`, b.text, `（报酬：${b.gold} 金币）`]);
  const i = await choose([{ text: '揭下告示，接下委托' }, { text: '先不下手' }]);
  if (i !== 0) { await say(['你把告示端详了两眼，又按了回去。']); return; }
  S.bounty = { id: b.id, base: b.type === 'kill' ? (S.kills[b.en] || 0) : 0, day: timeDay() };
  await say(['你揭下告示。掌柜在本子上记了一笔：「办妥了回来领赏。」（委托已记入侧栏，办妥即领赏）']);
}

/* ============================================================
 * 藏宝图寻宝：击败特定敌人可搜出藏宝图（见 ENEMIES 各 drops），
 * 行囊里「翻阅」藏宝图读线索，到埋宝处挖出宝藏（选项只在持图时出现）。
 * ============================================================ */
const TREASURES = {
  goblin: {
    map: 'tmap_goblin', flag: 'dug_goblin', digAt: 'forest_deep',
    digText: '对照藏宝图，挖开三块叠着的青石',
    intro: [
      '三块青石叠在老树根间，压得严丝合缝——以哥布林的力气，藏好之后想再刨出来，只怕得请动一整个寨子。',
      '你搬开顶上那块石头。泥土翻动的腥气散开，林子深处，几双青灰色的兽瞳应声亮起——挖掘声，把狼群引来了。',
    ],
    guard: 'wolves',
    found: [
      '狼群散进雾里。翻开的土坑底下，是一只哥布林的腰囊和一只上了油的小木匣：碎铜钱、抢来的耳环戒指、一瓶从哪个倒霉货郎身上捋下来的药水——还有一枚被盘得温润的青玉佩，刻着先王的合掌纹章。',
      '大概是哪个香客的遗物，被这群贼骨头从路上抢来，又当成宝贝埋进了土里。',
      '（金币 +15，获得：生命药水 ×1，合掌玉佩 · 生命上限+3）',
    ],
    loot: { gold: 15, item: ['potion', 'jade_charm'] },
  },
  bandit: {
    map: 'tmap_bandit', flag: 'dug_bandit', digAt: 'frost_pass',
    digText: '按藏宝图所指，在斧凿记号下的岩缝里挖挖看',
    intro: [
      '斧凿的记号还留在岩石上。记号正下方的岩缝被碎石虚掩着——搬开来，底下是个垫着干草的土坑，埋着一口沉甸甸的小木箱。',
      '箱子上着锁，但锁扣早被风雪锈酥了，一撬就开。',
    ],
    found: [
      '箱子里是红巾汉子的「体己」：一袋金币、一瓶封蜡完好的浓浆药——还有一只白石城戍卒的制式铜护腕，内侧錾着一个名字。',
      '箱盖内侧刻着一行小字，笔画被人摩挲得发亮：「喂饱了肚子，谁乐意把脑袋别在裤腰上劫道……」',
      '（金币 +20，获得：大生命药水 ×1，戍卒的铜护腕 · 受伤-1）',
    ],
    loot: { gold: 20, item: ['potion_big', 'guard_brace'] },
  },
  miner: {
    map: 'tmap_miner', flag: 'dug_miner', digAt: 'snow_hot_spring',
    digText: '按藏宝单所指，在界石旁的热泥里挖挖看',
    intro: [
      '汤泉边的界石压着半朽的木牌，牌上的字被热气熏得只剩「勿动」两个。界石旁的热泥泛着咕嘟咕嘟的小泡——矿工们一文一文凑出的「账」，就埋在这里。',
      '热泥刚扒开一道缝，汤泉深处的白雾忽然拧了拧，立起一个叮当作响的影子——老矿工们说过，埋钱的地方，得有人看着。',
    ],
    guard: 'frosthusk',
    found: [
      '影子散成一摊清水。热泥底下是一只封着蜡的陶瓮，泥封上按着一圈手印，深深浅浅，是许多双挖矿挖变形的手。',
      '瓮里是矿工们凑出的卖命钱，一小瓶封蜡完好的药——还有一枚星髓银磨的小坠子：天越暗，它越亮。',
      '（金币 +15，获得：生命药水 ×1，星髓银坠 · 会心+8%）',
    ],
    loot: { gold: 15, item: ['potion', 'star_silver_charm'] },
  },
  smuggler: {
    map: 'tmap_smuggler', flag: 'dug_smuggler', digAt: 'shipwreck_cove',
    digText: '按防水图所指，潜进「鹞鹰号」的压舱暗格',
    intro: [
      '鹞鹰号——湾里那艘船头留着黄铜铳座的快船，半截身子埋在沙里。压舱暗格的位置，防水图画得分毫不差。',
      '你屏息扎进水里。暗格的盖板刚撬开一条缝，水下的阴影里，一条灰绿的长臂悄无声息地卷了过来——这艘船的新主人，可比老船长凶多了。',
    ],
    guard: 'deepone',
    found: [
      '长臂的主人也溃成了咸水。压舱暗格里的东西分毫未损：蜡封的钱袋、一瓶浓浆似的药，还有一条贴身的虎爪链扣——私掠船长的老规矩，本钱不离身。',
      '你把它攥在手里掂了掂。海的账，这一笔总算有人来收了。',
      '（金币 +30，获得：大生命药水 ×1，私掠者的虎爪链 · 攻击+1）',
    ],
    loot: { gold: 30, item: ['potion_big', 'corsair_hook'] },
  },
  crab: {
    map: 'tmap_crab', flag: 'dug_crab', digAt: 'whale_beach',
    digText: '按藏宝图所指，在鲸肋穹门下的沙里挖挖看',
    intro: [
      '鲸肋拱成的穹门下，沙面被浪梳得平平整整——唯有穹顶投下的阴影正中，微微凸起一个小小的沙包。',
      '你刚扒开一把沙，阴影深处便「咔」地一声，一只巨大的螯肢探了出来——蟹妖也爱亮东西，何况是它整窝的家当。',
    ],
    guard: 'reefcrab',
    found: [
      '蟹妖顶开沙层，横着退出老远，缩进鲸骨深处再也不肯出来。沙坑里露出一窝「亮东西」：被螯肢抛光的旧币、几粒珠贝，还有一块拳头大的琥珀——鲸脂裹出的老琥珀，握在掌心，一股隔着寒气的暖。',
      '（金币 +15，获得：大生命药水 ×1，老鲸的琥珀 · 生命上限+4）',
    ],
    loot: { gold: 15, item: ['potion_big', 'whale_amber'] },
  },
};
/* 生成某张藏宝图的「挖掘」动作（埋宝地点的 actions 里引入 treasureAction(id)） */
function treasureAction(tid) {
  const t = TREASURES[tid];
  return {
    text: t.digText,
    when: () => !S.flags[t.flag] && (S.items[t.map] || 0) > 0,
    run: async () => {
      await say(t.intro);
      if (t.guard) {
        const r = await battle(t.guard);
        if (r !== 'win') return;
      }
      await say(t.found);
      fx(t.loot);
      setFlag(t.flag);
    },
  };
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
      e: {
        to: 'shrine_pass', label: '东 · 山口小径', flavor: '你踏出镇东的小径，翻上风口的石梁。山风迎面，小祠的火光隐约可见。',
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
            null, ['potion', 'amulet', 'torch']);
        },
      },
      hunter: {
        name: '老猎户哈克', img: null, role: '灰岭镇最好的猎手',
        talk: async () => {
          if (S.flags.huoHarkAsk && !S.flags.harkReply) {
            setFlag('harkReply');
            await say([
              '「霍七？」老猎户擦箭的手停住了，「那愣小子还活着？！」他大笑三声，笑到一半又咳了起来，「活着就好，活着就好……」',
              '「替我捎话给他：老哈克还咬得动弓弦，眼也不花。就是不敢进林子了——雾里的东西不认套子，叫他也防着点。」',
              '他把擦好的箭插回箭囊，望了望北面的山口：「告诉他，灰岭的酒还温着。哪天他肯下山，头一坛我请。」',
            ]);
            return;
          }
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
      { text: '把矿村的家书与工牌送到逃难的人家', when: () => S.flags.heLetters && !S.flags.lettersDone, run: async () => {
        setFlag('lettersDone');
        finishSide('letters');
        fx({ rep: 2 });
        await say([
          '你按着信皮上的名字，一户一户问过去。老四家的婆娘在货郎摊帮工，接过信的手抖了很久——她把信贴在胸口，半天说出一句：「他人呢？」',
          '你说：矿上的账清了，人走得体面，灯一直有人擦着。她背过身去，好一会儿才转回来，把工牌端端正正挂上了门楣。孩子们仰着头看，看了一整晚。',
          '一整条巷子的人家都听说了。有人往你手里塞了把炒栗子，有人只是朝你弯了弯腰。（声望 +2）',
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
    actions: [
      { text: '点亮光，探身照向井口深处', needsLight: true, when: () => !S.flags.wellGleam, run: async () => {
        if (!await payLight()) return;
        setFlag('wellGleam');
        fx({ gold: 3 });
        await say([
          '你把光探进井口。光圈顺着一圈圈井砖往下走——走到水面下，砖缝里的东西让光钉住了：半淹的井壁上，嵌着一道铁箍，箍着的砖比别的砖薄，四边磨出了缝。',
          '那是一道门。砌在井底下的门。',
          '门边的砖上还挂着一截断掉的麻绳，绳头系着一枚老式铜牌——镇上打水人的旧物，不知是谁的，也永远不会有人来认了。',
          '你收回光。乌鸦们齐刷刷把头低得更深，像怕被光烫着。（金币 +3。乌鸦守的不是井，是井底那扇门。）',
        ]);
      } },
    ],
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
              '独眼店主压低嗓子：「客官是往南去？劝您一句——别喝村口的井水。这几天，井水黑得像墨，乌鸦落满了屋脊，赶都赶不走。」',
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
      regular: {
        name: '常客老歪', img: null, role: '黑鸦旅店的酒鬼 · 跑过江湖的脚夫',
        talk: async () => {
          if (S.flags.cedricDead && !S.flags.laowaiCondolence) {
            setFlag('laowaiCondolence');
            await say([
              '「昨夜里那动静，你没事？」老歪给你倒了一盅压惊酒，手有点抖，「老爷子……唉。他常坐那把椅子，镇上没人敢坐，也没人舍得搬。」',
              '「你往后要出远门？路上有啥新鲜事，回来讲给老歪听——酒我请你，故事换酒，天经地义。」',
            ]);
            return;
          }
          await tavernRumors('老歪');
        },
      },
    },
    actions: [
      { text: '查看墙上的委托木板', run: async () => { await bountyBoard(); } },
    ],
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
    actions: [
      { text: '压低烛火，钻进墙角的地洞', needsLight: true, when: () => !S.flags.cellarHole, run: async () => {
        if (!await payLight()) return;
        setFlag('cellarHole');
        fx({ gold: 3 });
        await say([
          '你把烛火压得只剩一豆，侧身钻进墙角的洞。地洞只容一人爬行，两壁的土比灰岭镇的年纪还老——这洞不是昨夜那东西挖的，是「走」出来的：不知多少代，不知多少东西，沿着它去同一个方向。',
          '爬出一丈多远，指头碰到一样硬物：半截朽烂的油布包，里头是一小把磨得发亮的旧铜钱——像是哪个「过路的」也在这儿摸过黑，掉了盘缠。',
          '洞壁深处的抓痕层层叠叠，最新的一道划断了最旧的一道。所有的爪痕，都朝着南边——雾林的方向。',
          '你退回地窖，后背的冷汗贴着衣裳。（金币 +3。这条地道比灰岭镇还老，而且一直通到南边去……）',
        ]);
      } },
    ],
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
      setSlot('night');   // 子夜惊变：把时间拨到深夜
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
      e: { to: 'white_spring', label: '东 · 碎石坡下', flavor: '你踏着碎石坡下到谷底。水声从坡底的雾里透出来，清凌凌的。' },
      w: { to: 'stone_ford', label: '西 · 溪谷断桥', flavor: '你朝西面的水声走去。溪谷里，半座断桥歪在湍流上。' },
      s: { to: 'forest_cross', label: '南 · 林中岔路', flavor: '古道在荒草尽头没入林缘。雾气从树梢漫下来，晨露打湿了你的靴子。' },
    },
    roam: {
      en: 'wolves', chance: 0.25, fleeTo: 'forest_cross', intro: '荒草深处传来低低的呜咽声——狼群盯上古道已经很久了。',
      byTime: { night: { en: 'wraith', chance: 0.35, intro: '夜里的古道认不得人。雾从荒草里拧出一个没有脸的轮廓，贴着地皮漂过来。' } },
    },
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
    npcs: {
      zhao: {
        name: '逃难的老农赵老汉', img: null, role: '烽燧下避难的农户',
        talk: async () => {
          if (!S.flags.zhaoMet) {
            setFlag('zhaoMet');
            await say([
              '「老汉姓赵，柳树屯的。」老农搓着皴裂的手，讪讪地笑，「占了客官的火堆，别怪罪——地里人，见了亮堂地方就挪不动窝。」',
              '「井水黑了那年，村里人跑了一半。往南的、往北的，老汉拖家带口走到这儿，实在走不动了。」',
              '「客官往南进林子？两句话送你：东边碎石坡下有眼白花泉，水甜，毒不死人；西边石桥渡有个姓吴的守渡人，从前是扛枪的，靠得住。」',
            ]);
            return;
          }
          if (S.flags.part1 && !S.flags.zhaoNews) {
            setFlag('zhaoNews');
            await say([
              '「回来了？！」赵老汉一骨碌爬起来，指着东南山脊，「那金顶——金顶亮了！昨儿夜里老汉起夜，看见山顶上像点了一轮小太阳！」',
              '他忽然朝你深深作了个揖，什么也没说。孩子们从铺盖后面探出头，学着他的样子，也作了个歪歪扭扭的揖。',
            ]);
            return;
          }
          await say([
            '「锅里还有糊糊，客官不嫌弃就盛一碗。」赵老汉往火堆里添了根柴，「夜里老听见林子那边有鸦群过，黑压压的，朝一个方向飞。老辈人说，鸦群望哪儿，哪儿就出大事。」',
          ]);
        },
      },
    },
  },

  white_spring: {
    name: '白花泉', ch: '第一部 · 晨曦之印', sub: '小节一 · 南下古道', bg: BG + 'forest.svg', mood: 'warm',
    desc: [
      '古道东侧的碎石坡下，藏着一眼浅泉。泉边开满不知名的白色小花，四季不谢——逃难的农户没骗人：认准开白花的泉眼，毒不死人。',
      '泉水清得能数清底下的卵石。奇怪的是，泉边那圈白花的内侧，有一小片谁也不肯去的空地——像是有什么东西贴着地皮走过，花们都避着那里开。',
    ],
    brief: '开满白花的浅泉。花圈内侧留着一小片避开的空地。',
    rest: { cost: 0, label: '在泉边打尖歇脚' },
    exits: {
      w: { to: 'south_road', label: '回南下古道', flavor: '你灌满水囊，踏着碎石坡回到古道上。' },
      s: { to: 'old_quarry', label: '南 · 运石古道', flavor: '泉眼再往南，草坡下陷成一道道整齐的车辙——三百年前的运石道。' },
    },
    onEnter: async () => {
      if (!ev('springVisit')) return;
      await say([
        '你掬起一捧泉水。凉意顺着喉咙沉下去，一路洗到肺腑里——连日的赶路与惊惶，忽然都被这口甜水压住了。呼吸沉下来，斗气在经脉里缓缓匀开。（斗气 +3）',
        '你这才留意到花圈内侧那片空地：一列，七个脚印的形状，步子很齐。有什么东西曾贴着地皮列队走过，白花至今不肯朝那边开。',
      ]);
      fx({ sp: 3 });
    },
    actions: [
      { text: '在泉底的卵石间摸索', when: () => !S.flags.springFind, run: async () => {
        setFlag('springFind');
        await say([
          '泉底最深处压着一只锈头盔，盔沿豁了口，是烽燧上那种制式。你把它捞上来抖了抖——盔壳里滚出几枚被水磨得发亮的金币。',
          '头盔内沿刻着一行小字：「戍卒赵四，替看火的人留。」',
          '（金币 +4）',
        ]);
        fx({ gold: 4 });
      } },
    ],
  },

  stone_ford: {
    name: '石桥渡', ch: '第一部 · 晨曦之印', sub: '小节一 · 南下古道', bg: BG + 'road.svg', mood: 'warm',
    desc: [
      '古道在这里被一条湍溪拦腰截断。原先的五孔石桥塌了三孔，桥身歪进水里，只剩靠岸的两孔还勉强站着。',
      '溪边搭着一间窝棚，一个瘸腿汉子正在补船——左腿的裤管空荡荡地挽着结。他手边立着根磨得发亮的长篙，见你看过来，扬了扬下巴：「过溪？坐船。」',
    ],
    brief: '断桥与湍溪。瘸腿的守渡人正在补船。',
    rest: { cost: 2, label: '在渡口的火堆边歇脚' },
    exits: {
      e: { to: 'south_road', label: '回南下古道', flavor: '你踏着碎石回到古道上。身后，船桨搅水的声音不紧不慢。' },
      n: { to: 'fern_gully', label: '北 · 溪谷小径', flavor: '老吴说，沿溪往上走有一条采药人踩出来的小径，能省一段冤枉路。' },
    },
    npcs: {
      wugou: {
        name: '守渡人吴钩', img: null, role: '石桥渡的守渡人 · 老兵',
        talk: async () => {
          if (!S.flags.wugouMet) {
            setFlag('wugouMet');
            await say([
              '「姓吴，单名一个钩字。」汉子把船桨搁下，「当过十二年兵，丢了条腿，剩这把子力气，就守着这个渡口。」',
              '「桥是开春的桃花汛冲塌的。官府的告示贴了三张，修桥的银子还没影儿——不过我这儿渡人不收钱。给口饭吃、带个口信，就算船资。」',
              '「往北去林子的客人都问同一件事：雾里到底有什么。」他往溪对岸努了努嘴，「我只能说：狼饿了一年，胆子肥了。走夜路的，火把别离手。」',
            ]);
            return;
          }
          if (S.flags.sluiceBroken && !S.flags.wugouThanks) {
            setFlag('wugouThanks');
            fx({ gold: 3, rep: 1 });
            await say([
              '你还没开口，吴钩的手先探进了溪水——搅了两下，摊开掌心。水从指缝里漏下去，清得能看见掌纹。',
              '「清了。」他盯着自己的手看了半晌，忽然朝北面的山口拱了拱手，「矿上那道闸，是客官砸的？好汉子。这溪里有一半是俺的饭碗，另一半，是下游几十户人家的水缸。」',
              '他把三枚金币拍进你手里，不由分说：「船资。这一趟，是替几十户人家摆的渡。」（声望 +1，金币 +3）',
            ]);
            return;
          }
          if (S.flags.part1 && !S.flags.wugouNews) {
            setFlag('wugouNews');
            await say([
              '「哟，从圣殿山下来的？」吴钩上下打量你，「今早溪对岸的老鸦全朝金顶那边飞，叫得那叫一个欢——咱这破渡口，多少年没这么热闹过了。」',
              '他把长篙往船上一横：「替我谢谢那位点灯的。从前夜里赶路，就指望烽燧和圣殿那点亮。」',
            ]);
            return;
          }
          if (!S.flags.creekAsked) {
            setFlag('creekAsked');
            sideQuest('creek');
            await say([
              '吴钩一边补船一边跟你闲扯：「北边古战场，俺当年在那儿丢的腿。」他忽然把船桨往水里一指，「客人要是打北边来，替我留意一件事：溪水这半月浑得邪性，上游准出了事。」',
              '「上游是霜脊山的矿坑。矿上的人原先隔三差五下来买酒，如今一个不见——他们准是把什么脏东西，捂在水里了。你要是路过，替老吴看一眼；能治，就治。」',
              '（支线接取：溪水的账——去霜脊山矿坑，看看上游出了什么事。）',
            ]);
            return;
          }
          await say([
            '吴钩一边补船一边跟你闲扯：「北边古战场，俺当年在那儿丢的腿。前些日子有个疯疯癫癫的货郎路过，说碑林夜里有人点名——啧，军营里的老话，坟头的兵也要点卯。」',
            '「客人要是打北边来，替我留意一件事：溪水这半月浑得邪性，上游准出了事。」',
          ]);
        },
      },
    },
    actions: [
      { text: '帮忙把坍桥的条石搬上渡船', when: () => !S.flags.fordHelped, run: async () => {
        setFlag('fordHelped');
        fx({ rep: 1 });
        await say([
          '你挽起袖子，把两块浸在水里的条石搬上渡船。吴钩也不客气，指挥你垫在哪头、怎么吃力，俨然把你当了个新兵。',
          '「不赖。」他看着你把最后一块码稳，难得笑了一下，「兵油子都说不动了，你这愣头青倒实在。——渡口的火堆你随时来，茶水管够。」',
          '（声望 +1）',
        ]);
      } },
    ],
  },

  old_quarry: {
    name: '荒石料场', ch: '第一部 · 晨曦之印', sub: '小节一 · 南下古道', bg: BG + 'mountain.svg', mood: 'dark',
    desc: [
      '白花泉再往南，山体被人工剖开一大片——三百年前，圣殿的石料就是从这道剖面上采下去的。凿痕整齐得吓人，一排排码进山骨里。',
      '料场深处搭着一间石板棚，棚前立着半座没完工的石像：先王的身形、合掌的手势，偏偏没有脸。',
    ],
    brief: '三百年前的圣殿采石场。半座没有脸的先王像立在棚前。',
    exits: {
      n: { to: 'white_spring', label: '回白花泉', flavor: '你沿着运石的旧车辙回到泉边，水声重新清亮起来。' },
    },
    roam: {
      en: 'wolves', chance: 0.25, fleeTo: 'white_spring', intro: '料场的回声把你的脚步放大了——岩壁后传来低低的呜咽。',
      byTime: { night: { en: 'wraith', chance: 0.35, intro: '夜里，那些凿痕齐齐发出风哨声。雾顺着岩缝淌下来，凝成一个没有脸的影子。' } },
    },
    npcs: {
      mason: {
        name: '老石匠莫大', img: null, role: '守着采石场的最后一位石匠',
        talk: async () => {
          if (!S.flags.masonLore) {
            setFlag('masonLore');
            await say([
              '老人头也不抬，錾子下的石粉簌簌地落：「别踩我的放样线。」',
              '「圣殿的石料，全打这剖面上出的。我爹的爷爷那辈儿，给七位先王刻像。刻到第七位，上头传下话来：脸，先别刻。」',
              '「传了三代，谁也说不清为什么。到我这辈儿，我照着老样子的身形刻，脸——」錾子停了停，「不敢。总觉得刻完了，就该出事了。」',
              '他终于抬头看你一眼：「客官要是进圣殿，替我看看第七座坛。要是坛上真有那位没有脸的……替我瞅瞅，他到底长什么样。」',
              '「对了，」他往你手里塞了一小块白白的石屑，「捎给圣殿的守殿人。铁须家的老规矩：料场的石屑到了，就是料场还有人。」',
            ]);
            return;
          }
          if (S.flags.statueHands && !S.flags.masonFace) {
            setFlag('masonFace');
            finishSide('seventh');
            fx({ gold: 8, rep: 1 });
            await say([
              '「回来了？」莫大直起腰，「圣殿里……那位到底长什么样？」',
              '你把白石城铸像广场上那位先王的模样讲给他听：左手按剑，右手五指并拢，轻轻合在胸前——三百年了，那双手一直合着。有人贴脏东西，就有撕脏东西的手。',
              '莫大怔了很久，忽然转身钻进石板棚，翻出一把裹了三层油布的錾子，在袖口上擦了又擦：「合掌……合掌好啊。手合则印固——这张脸，我刻。」',
              '他把八枚金币按进你手里：「跑腿钱。等像刻成了，你来料场，头一个看。」（声望 +1，金币 +8）',
            ]);
            return;
          }
          await say([
            '錾子声不紧不慢。「急什么，」老人说，「石头的活儿，以百年计。」',
          ]);
        },
      },
    },
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
    roam: {
      en: 'wolves', chance: 0.05, fleeTo: 'hermit_hut', intro: '岔路口的老橡树后，传来野兽踏碎枯枝的轻响。',
      byTime: { night: { en: 'wraith', chance: 0.25, intro: '入夜后的岔路口四下皆是雾。老橡树的刻痕间，浮出两点冷光——它也在读那些名字。' } },
    },
    actions: [
      { text: '细看岔路口的老橡树', when: () => !S.flags.oakMarks, run: async () => {
        setFlag('oakMarks');
        await say([
          '老橡树的树皮上层层叠叠全是刀刻：名字、箭头、生肖、没寄出去的短句。「阿禾往南」「勿走夜路」「雾涨时，跟亮的东西走」……一代代赶路人在同一棵树上留下话。',
          '一根横枝上还挂着只油布小包，布面被雨水洗得发白，字倒还清楚：「给比我更缺的人。」——里面是三枚金币。',
          '你收下金币，把油布包原样挂了回去。总会有下一个人路过。（金币 +3）',
        ]);
        fx({ gold: 3 });
      } },
      { text: '擦净路口的木路牌', when: () => !S.flags.signClean, run: async () => {
        setFlag('signClean');
        await say([
          '路牌歪在岔口，苔藓把字啃得只剩笔画。你用剑鞘刮净苔衣——',
          '「西：林道 · 商队 · 湖。东：小径 · 近而险。西北：采药人。北：出林 · 圣殿山。」',
          '最底下还有一行小字，刻的人手劲很轻：「林子没有坏路，只有坏天气。慢走。」',
        ]);
      } },
    ],
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
      n: { to: 'crow_ridge', label: '北 · 缓坡枯林', flavor: '你沿林道向北折上缓坡。头顶有翅膀擦动空气的声音，一声接一声。' },
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

  crow_ridge: {
    name: '鸦眠坡', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '林道在这里拱起一道光秃的缓坡，坡上立着几十棵枯死的桦树，每一根枝桠上都蹲着乌鸦。',
      '白日里，鸦群一茬一茬起飞，全都朝着同一个方向去；入夜后，又一群一群落回来。猎户们都管这里叫「鸦眠坡」——乌鸦睡觉的地方，却总望着什么醒着的东西。',
    ],
    brief: '枯桦如林的缓坡，枝头蹲满进出的乌鸦。',
    exits: {
      s: { to: 'forest_road', label: '回林道', flavor: '你顺着坡道下到林边。鸦群在头顶盘旋了一匝，散进雾里。' },
    },
    roam: {
      en: 'mistcrows', chance: 0.3, fleeTo: 'forest_road', intro: '你踩断一根枯枝——满坡的鸦齐齐压低了头，像一群听令的哨兵。',
      byTime: { night: { en: 'wraith', chance: 0.15, intro: '坡上的鸦全睡着了。太静了——静得能听见雾走路的声音。' } },
    },
    onEnter: async () => {
      if (!ev('crowRidgeVisit')) return;
      await say([
        '乌鸦是不肯白看热闹的东西。它们成百上千，起飞、盘旋、落回，翅膀擦着雾顶，全都朝着东南方山脊上那一点被云缝遮住的金光。',
        '你想起那辆鸦羽色的货车。那位「渡鸦」，恐怕也一直在数着同样的东西。',
      ]);
    },
    actions: [
      { text: '爬上坡顶的枯桦眺望', when: () => !S.flags.crowClimb, run: async () => {
        setFlag('crowClimb');
        await say([
          '你攀上最高的那棵枯桦。风一下子大了，鸦群从你四周掠过去，竟没有一只惊叫。',
          '东南方向，云层裂开一线——雾海尽头的山脊上，一座金色穹顶静静反着光。鸦群成流地涌向那里，又成流地折返，像在数着什么。',
          '「圣殿还在等人。」古图边角那行小字这么写。鸦群比人先知道。',
        ]);
      } },
      { text: '掏一掏近处枝桠上的鸦巢', when: () => !S.flags.crowNest, run: async () => {
        setFlag('crowNest');
        await say([
          '你挑了个低矮的旧巢，指尖伸进去——枯枝碎叶之间，闪着乌鸦们捡来的亮东西：几枚硬币，还有一粒透亮的玻璃珠，天光下泛着雾一样的蓝。',
          '满坡的鸦看着你，一声不叫。你收起硬币，捏起玻璃珠对着光看了看——跟乌鸦讲道理，是走雾林的第一条规矩；但好东西，乌鸦也懂等人来取。（金币 +5，获得：雾蓝玻璃珠）',
        ]);
        fx({ gold: 5, item: 'glassbead' });
      } },
    ],
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
      sw: { to: 'fern_gully', label: '西南 · 蕨语谷地', flavor: '你沿坡坎下到溪谷。蕨草高过肩膀，满谷都是悄悄话。' },
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
      treasureAction('goblin'),
    ],
    roam: {
      en: ['wolves', 'wraith'], chance: 0.45, fleeTo: 'dusk_camp',
      intro: '雾深处传来窸窣的响动——你的手背青筋暴起。',
      loot: { flag: 'wolfLoot', gold: 8, item: 'wolf_fang', text: '你在苔藓上拾获一小袋它们从上一个倒霉旅人身上劫走的金币，头狼的尸身旁还滚着一枚磨好的獠牙项链。（金币 +8，获得：狼牙项链）' },
      byTime: {
        day: { en: 'wolves', chance: 0.4, intro: '日头照不进林子，狼的眼睛先亮了——青灰色的兽瞳一双一双围上来。' },
        night: { en: 'wraith', chance: 0.5, intro: '夜里的雾是活的。它贴着你的后颈呼吸，冷光在你眼前一寸寸亮起来。' },
      },
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
      s: { to: 'lakeside_marsh', label: '南 · 苇荡深处', flavor: '你沿湖南岸的土埂往南。芦苇渐渐高过头顶，苇荡里窸窸窣窣。' },
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
      { text: '替亡者把七枚船钱送回湖底', when: () => (S.items.oldcoins || 0) > 0, run: async () => {
        await say([
          '你摊开手掌。老船夫的雾脸凑过来，看了很久很久——蓑衣底下透出一声极轻的、像气泡的水响。',
          '「……省下的，终究是要还的。」他伸出长篙，篙头轻轻一拨——七枚古铜币依次落水，一枚，一枚，涟漪一圈追着一圈，荡到看不见的湖心才停。',
          '「同行七人，账清了。」老船夫直起腰，把一枚苇编的小哨塞进你手里，「替死人办事，活人不能白跑。这哨子是老汉自己编的——雾再大，它响一声，路就让开三尺。」',
          '（获得：苇编哨 · 斗气上限+3，声望 +1）',
        ]);
        take('oldcoins');
        fx({ item: 'reed_charm', rep: 1 });
        finishSide('fare');
        setFlag('farePaid');
        await say([
          '回程时你回头望了一眼——湖心的雾裂开了一线，极淡的天光落下去，在水面上铺了一条窄窄的、亮亮的路。',
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
      await say([
        '起身时你瞥见浅水：水底的石床上，七枚古铜币排成整齐的一列，绿锈斑斑——一人一枚，是这七个同行人各自省下的船钱。他们攒了一路，却没能赶上付账。',
        '老船夫的规矩在你耳边响：「死人的货，活人拿走，不算偷。」——可这几枚看起来不像货，倒像七句没来得及出口的话。',
      ]);
      sideQuest('fare');
    },
    actions: [
      { text: '涉水拾起那七枚古铜币', when: () => S.sideQuests.fare === 'active' && !S.flags.coinsTaken, run: async () => {
        setFlag('coinsTaken');
        fx({ item: 'oldcoins' });
        await say([
          '水凉得咬骨头。你一枚一枚把它们捡起来——最后那一枚上刻着个「末」字，是队里最小的那个。',
          '（获得：七枚古铜币。老船夫说过，湖里的账，总得有人替他们清。）',
        ]);
      } },
    ],
  },

  lakeside_marsh: {
    name: '湖畔沼泽', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '雾泽湖的水从南岸漫出来，泡成一片芦苇沼泽。苇秆高过人头，风一过，整片苇荡便压低了嗓子窃窃私语。',
      '水洼之间横着伐木人搭的旧栈道，朽得厉害，踩一步晃三晃。苇荡深处，一个戴斗笠的小小身影蹲在水边，一动不动。',
    ],
    brief: '芦苇沼泽与朽栈道。苇荡深处蹲着个小小的斗笠身影。',
    exits: {
      n: { to: 'mist_lake', label: '回雾泽湖畔', flavor: '你沿栈道回到开阔的湖畔。苇荡的私语被抛在身后。' },
      s: { to: 'fern_gully', label: '南 · 蕨语谷地', flavor: '栈道到了尽头，你踩着苇根间的土埂往南。蕨草渐渐高过芦苇。' },
    },
    roam: {
      en: 'wraith', chance: 0.3, fleeTo: 'mist_lake', intro: '栈道忽然一沉——苇荡里的雾拧出一个没有脸的轮廓，就贴在水面上。',
      byTime: { night: { en: 'wraith', chance: 0.45, intro: '入夜后，苇荡里的私语有了词。雾里那些没脸的，今晚全贴着水面等他乡客。' } },
    },
    npcs: {
      aman: {
        name: '渔童阿满', img: null, role: '蹲在苇荡里钓鱼的小孩',
        talk: async () => {
          if ((S.items.glassbead || 0) > 0 && !S.flags.amanTrade) {
            setFlag('amanTrade');
            await say([
              '「哇——」阿满的眼睛一下子瞪圆了，「雾蓝珠子！爷爷说，雾里走的湖要有一颗湖心的珠子引路……给我换吧换吧，我用顶顶好的东西换！」',
            ]);
            take('glassbead');
            give('roast_fish', 2);
            await say([
              '他把玻璃珠揣进怀里，从鱼篓里掏出两条用苇秆串好的烤鱼塞给你：「火上燎了一早上的！爷爷吃了都说好！」',
              '（获得：湖畔烤鱼 ×2）',
            ]);
            return;
          }
          if (S.flags.farePaid && !S.flags.amanFish) {
            setFlag('amanFish');
            give('roast_fish', 1);
            await say([
              '「怪了怪了，」阿满压低声音，神秘兮兮的，「今早湖心的雾裂了一道，鱼全疯了似地上钩——爷爷说，湖底的账清了，鱼就肯还人情了。」',
              '他献宝似的举起鱼篓，扔给你一条顶肥的：「客气啥！湖请客！」（获得：湖畔烤鱼 ×1）',
            ]);
            return;
          }
          await say([
            '「嘘——」阿满头也不回，手指竖在唇边，「你把我的老鳜吓跑了。它可有名了，整片湖就它成精，钓了十年，一回都没上来过。」',
            '「苇荡里少走深处，」他忽然压低声音，「雾贴着水的地方，有没脸的。爷爷说它们不害人，就是爱跟着……跟着跟着，就把你的影子跟丢了。」',
          ]);
        },
      },
    },
    actions: [
      { text: '在苇丛里捡拾野鸭蛋', when: () => !S.flags.reedEggs, run: async () => {
        setFlag('reedEggs');
        await say([
          '你沿着栈道边缘拨开苇丛，在一处干苇垛里摸到一窝野鸭蛋，还温着。你留下两枚，取走三枚，剥壳生吃，腥甜顶饿。（生命 +2）',
          '阿满远远看见，直朝你比大拇指：会留蛋的，是懂水的人。',
        ]);
        fx({ hp: 2 });
      } },
    ],
  },

  fern_gully: {
    name: '蕨语谷', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '溪谷在这里收窄，两侧的坡上长满齐肩的蕨草。风从谷口灌进来，蕨叶彼此摩挲，发出一阵阵像说悄悄话的窸窣声。',
      '老辈人说，这谷里的低语是迷路人的怨气在找话搭——听清一个字的，就再也走不出去了。',
    ],
    brief: '蕨草夹道的溪谷。风一过，满谷都是悄悄话。',
    exits: {
      n: { to: 'lakeside_marsh', label: '北 · 湖畔沼泽', flavor: '你循着水汽向北。蕨草渐渐矮下去，芦苇高起来。' },
      ne: { to: 'forest_deep', label: '东北 · 隐秘小径', flavor: '你攀上东侧的坡坎。苔藓吸走脚步声的浓雾小径，就在坡上。' },
      sw: { to: 'stone_ford', label: '西南 · 石桥渡', flavor: '你沿溪而下。水声渐大，断桥的轮廓出现在谷口。' },
    },
    roam: {
      en: ['wolves', 'wraith'], chance: 0.3, fleeTo: 'stone_ford', intro: '满谷的窸窣声忽然停了——蕨草深处，有什么东西替它们开了口。',
      byTime: { night: { en: 'wraith', chance: 0.4, intro: '入夜的蕨语谷不再说悄悄话——它开始点名。被点到的是你。' } },
    },
    actions: [
      { text: '静下心听谷中的低语', when: () => !S.flags.fernListen, run: async () => {
        setFlag('fernListen');
        await say([
          '你闭上眼，把呼吸放到最缓。窸窣声一层层退去，退到最底下，果然有一缕极细的、像哭又像唱的调子。',
          '「……回家……锅还温着……」',
          '你把斗篷裹紧了些。怨气不可怕，可怕的是它们记得的东西太暖。你朝声音的方向低了低头，替它们把这句话收下了。（斗气 +2）',
        ]);
        fx({ sp: 2 });
      } },
    ],
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
      w: { to: 'mossy_dell', label: '西 · 软苔谷地', flavor: '你绕过老树根系向西。脚下的腐叶渐渐变成厚得没踝的软苔。' },
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
      n: { to: 'watchtower_stand', label: '北 · 林缘高地', flavor: '你沿猎径向北。林缘的高地上，一座高脚木塔的影子支在雾里。' },
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
    actions: [
      { text: '查看墙上风干的兽皮', when: () => !S.flags.lodgeHide, run: async () => {
        setFlag('lodgeHide');
        await say([
          '兽皮硝得很用心，皮子内侧用炭条画着记号：三道弯是狼窝，圆圈是泉眼，叉是「没脸的东西」出没的树界。',
          '最大那张熊皮的内侧，压着一个小小的油纸包——盐渍的肉干，硬得能敲鼓，香气却还在。猎户家的规矩：房门留给下一个走夜路的人，吃的也是。',
          '你掰下一条慢慢嚼。血里回暖。（生命 +4）',
        ]);
        fx({ hp: 4 });
      } },
    ],
  },

  watchtower_stand: {
    name: '高脚瞭望塔', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '猎户们在林缘的高地上架起的一座高脚木塔：四根独柱撑起一间小屋，梯子抽在半空——防的不是野兽，是会学人开门的野兽。',
      '塔顶的瞭望口正对着东北方向的山脊。塔柱上留着几道新鲜的抓痕，深可入木。',
    ],
    brief: '猎户的高脚木塔。梯子抽在半空，柱上有爪痕。',
    exits: {
      s: { to: 'hunter_lodge', label: '回废弃猎屋', flavor: '你放下梯子回到猎屋前，又把梯子照原样抽回半空。' },
    },
    roam: {
      en: 'wolves', chance: 0.25, fleeTo: 'hunter_lodge', intro: '塔影底下，青灰色的兽瞳一双一双亮了起来。',
      byTime: { night: { en: 'wraith', chance: 0.35, intro: '夜里，塔柱上的爪痕泛着幽光。雾从林缘漫上来，没有风，却全朝一个方向倒。' } },
    },
    actions: [
      { text: '攀上瞭望塔顶', when: () => !S.flags.towerView, run: async () => {
        setFlag('towerView');
        await say([
          '你攀着独柱上的木钉翻进塔屋。视线一下子越过了雾海——',
          '东北方向，金色穹顶在云缝里反着光；穹顶更北，一道雪线横贯天际。雪线之下，天际隐隐透着一线烟色——按古图的方位，那是「白石城」的方向。',
          '瞭望口的木缝里塞着猎户的应急皮囊，你抖出几枚金币。（金币 +4）',
        ]);
        fx({ gold: 4 });
      } },
    ],
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
      w: { to: 'bee_clearing', label: '西 · 林间蜂场', flavor: '你沿篱笆后的小径向西。嗡嗡的蜂声穿过树隙迎面而来。' },
    },
    rest: { cost: 3, label: '在灶边歇一晚' },
    actions: [
      { text: '帮玛戈翻晒药草', when: () => !S.flags.margoTip, run: async () => {
        setFlag('margoTip');
        await say([
          '你把屋檐下受潮的药草搬到篱笆上摊开。玛戈指挥若定：「当归铺底层，月光草挂高头——别挨着荤腥，串了味我听得出来。」',
          '活干完，她往你手里塞了一把炒过的白花：「白花泉的水，古道东边、碎石坡下头。斗气乏了就去喝一口——那泉水养气，比药水便宜。」',
          '（斗气 +2。玛戈说的泉眼，就在南下古道东侧。）',
        ]);
        fx({ sp: 2 });
      } },
    ],
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

  bee_clearing: {
    name: '林间蜂场', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'warm',
    desc: [
      '采药人小屋以西是一片洒满碎金的林间空地：十几只木蜂箱错落在老橡树下，蜂声嗡嗡的，像一锅温着的小米粥。',
      '蜂场却显出一种奇怪的冷清——大半蜂箱的巢门空着，蛛网结在了门口。只剩两只箱子还热闹。',
    ],
    brief: '老橡树下的蜂场。大半蜂箱空了，蜂声稀稀拉拉。',
    exits: {
      e: { to: 'hermit_hut', label: '回采药人小屋', flavor: '你循着药草香回到玛戈的篱笆院。' },
      s: { to: 'mossy_dell', label: '南 · 软苔谷地', flavor: '蜂场的南缘往下沉，一片软苔谷地摊在雾里，绿得发亮。' },
    },
    npcs: {
      ji: {
        name: '养蜂人纪老爹', img: null, role: '雾林里最后一个养蜂人',
        talk: async () => {
          if (S.sideQuests.bees === 'active' && S.flags.beeSwarm) {
            await say([
              '「嗡嗡的——听见没！」纪老爹迎出老远，你头顶上乌泱泱跟着一大团蜂，像一朵会飞的云。',
              '「王台！王台回来了！」他手脚麻利地开箱、上脾、诱王，蜜蜂顺顺当当涌进空箱，「好孩子，它们肯跟你走，是你身上没带汗腥气。」',
            ]);
            fx({ gold: 4, rep: 1 });
            give('honey', 3);
            finishSide('bees');
            await say([
              '他敲开一只封好的蜜脾，割了三块用荷叶包上：「拿着，林子里顶顶管用的甜。饿了掰一口，伤了敷一口。」',
              '（报酬：金币 +4，林间蜂蜜 ×3，声望 +1）',
            ]);
            return;
          }
          if (S.sideQuests.bees === 'active') {
            await say(['「蜂群还没回来？」纪老爹往南边努努嘴，「软苔谷地的老栎树，树洞又深又暖——它们八成在那儿结了团。记住，用手掏是要挨蜇的。」']);
            return;
          }
          if (S.sideQuests.bees === 'done') {
            await say(['「蜂群归了箱，蜜就断了不了。」纪老爹美滋滋地割着蜜，「客官路过就有口甜的——比药水便宜，比金币贴心。」']);
            return;
          }
          await say([
            '「瘪了，全瘪了。」纪老爹拍着空蜂箱，心疼得直咂嘴，「前儿夜里一场怪雾过坡，蜂群连王带巢飞了个精光——老蜂性子倔，认死理，八成在南边软苔谷地的老栎树洞里结了团。」',
            '「客官替我跑一趟？把蜂群引回来，蜂蜜管你够——老婆子玛戈的咳药，还指着这口蜜呢。」',
          ]);
          sideQuest('bees');
        },
      },
    },
    actions: [
      { text: '查看还热闹的两只蜂箱', when: () => !S.flags.hiveSeen, run: async () => {
        setFlag('hiveSeen');
        await say([
          '你凑近那两只还热闹的蜂箱。巢门口的守卫蜂进进出出，腿上全挂着一粒粒灰绿色的花粉——不是花蜜的颜色。',
          '纪老爹凑过来看了一眼，脸色变了：「这是雾苔的花粉。南边谷地里，开的是不该开的花……」',
        ]);
      } },
    ],
  },

  mossy_dell: {
    name: '苔藓谷', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'warm',
    desc: [
      '谷地往下沉成一泓软苔的洼地，苔藓厚得能没过脚踝。雾到了这里像被吸进绒布里，连声音都跟着软了下来。',
      '洼地正中蹲着一株中空的老栎树，树洞黑黢黢的，却传出嗡嗡的、像念经一样的蜂鸣。一只白鹇鸟正在苔藓上跳来跳去，对谁都不怕。',
    ],
    brief: '软苔覆盖的谷洼。老栎树洞里嗡嗡作响，白鹇鸟跳来跳去。',
    rest: { cost: 0, label: '在软苔上小憩' },
    exits: {
      n: { to: 'bee_clearing', label: '北 · 林间蜂场', flavor: '你踩着软苔上坡，蜂声在身后渐渐稀落。' },
      e: { to: 'old_shrine', label: '东 · 老树根间', flavor: '你拨开垂藤向东。老树根系之间，露出一角青灰色的飞檐。' },
    },
    onEnter: async () => {
      if (!ev('dellVisit')) return;
      await say([
        '白鹇鸟歪头打量你，忽然抖开一身白羽，在苔藓上扑腾起一场小小的雪。',
        S.flags.shrineBless ? '你想起林中古祠供箱边那串小小的爪印——就是它。这满谷的软苔、那间一尘不染的古祠，原来都是这位「扫地白鹇」的活计。' : '它跳两步，回头看你一眼，像在等你跟上。',
      ]);
    },
    actions: [
      { text: '把蜂群从老栎树洞里请出来', when: () => S.sideQuests.bees === 'active' && !S.flags.beeSwarm, run: async () => {
        const i = await choose([
          { text: '用蘸湿的布巾捂住口鼻，慢慢收拢蜂团' },
          { text: '徒手直接掏——省事！' },
        ]);
        if (i === 1) {
          await say(['你把手伸进树洞。蜂群「轰」地炸了锅——鼻尖、手背、耳朵后面，火辣辣地肿了一圈。（生命 -2）']);
          fx({ hp: -2 });
        } else {
          await say(['你照纪老爹教过的法子，湿布掩住口鼻，掌心托着蜂脾，一点一点把蜂团拢进布兜里。蜂群只是嗡嗡地抗议，没下死口。']);
        }
        setFlag('beeSwarm');
        await say([
          '蜂王认得回家的路。你转身往北走，头顶上那朵「云」便不远不近地跟着——雾林里的旅人要是抬头看见，怕是要吓出一身汗。',
        ]);
      } },
      { text: '跟着白鹇鸟走一段', when: () => !S.flags.birdFollow, run: async () => {
        setFlag('birdFollow');
        await say([
          '白鹇鸟在前面蹦蹦跳跳，把你领到谷地边缘一丛齐腰的蕨草前，用喙笃笃地敲了两下石头。',
          '蕨草底下藏着一口上釉的小陶罐，罐口的蜡封完好。你撬开来——是林蜜，陈年的，琥珀色的，香得整片谷地都是甜的。',
          '不知是谁存下的，也不知存了多少年。（获得：林间蜂蜜 ×2）',
        ]);
        give('honey', 2);
      } },
    ],
  },

  dusk_camp: {
    name: '黄昏营地', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: ['背风的岩坡下，一圈烧剩的篝火。这里是穿越雾林前最后的落脚点。'],
    brief: '背风的岩坡，篝火的余烬还温着。',
    checkpoint: true,
    exits: {
      s: { to: 'forest_cross', label: '回岔路口', flavor: '你踏上来路，向南折回岔路口。' },
      e: { to: 'logger_camp', label: '东 · 谷地伐木场', flavor: '你朝谷地东侧穿行。溪水声里混进一种陌生的响动——像工具被风吹得轻晃。' },
      n: {
        to: 'pilgrim_path', label: '北 · 朝圣古道', flavor: '你们连夜拔营。雾林尽头，一条被草鞋磨得温润的石板路，顺着山势静静爬向上方的金顶。',
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
      { text: '向艾莉娅讨教照明的法子（星火引灯）', when: () => S.flags.aria && !S.flags.lightSpell, run: async () => {
        setFlag('lightSpell');
        await say([
          '「探黑的地界儿，别硬闯。」艾莉娅把法杖横在膝上，「地窖、矿洞、塌了顶的殿——黑处藏的东西，只给带光的人看。」',
          '她教你一手符文学者的家传小术：屈指为引，以一缕斗气凝出一团暖黄的光球，悬在肩头，亮一炷香——便是「星火引灯」。',
          '你练到半夜，指缝里终于漏出一点稳当的光。（学会照明术：此后探暗处可消耗 2 点斗气照亮；若有火把亦可直接点燃。）',
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
      await say([
        '✦ 艾莉娅·星语加入了队伍！她是独立的战斗单位，将在战斗中按「态势」自主施展星辉魔法：星火弹 / 星辉庇护 / 治愈星雨。',
        '当晚轮到你守火。艾莉娅靠着行囊睡去，雾在谷口站了一整夜，像也在等天亮。',
        '（睡前她提了一句：探黑的地界儿别硬闯——想学「星火引灯」的照明小术，在营火边向她讨教即可。）',
      ]);
      sleepToDawn();   // 救援与夜谈耗去半夜，一觉到天明
    },
  },

  logger_camp: {
    name: '湮没的伐木场', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'dark',
    desc: [
      '谷地东侧是一片伐木人废弃的营地：贮木架塌了一半，锯台上的圆锯锈成了一朵褐色的花，一斧没砍完的橡树桩上，密密麻麻全是记数的刻痕。',
      '逃跑的痕迹很新，收拾的痕迹没有——工具散了一地，像是人们砍到一半，忽然听见了什么，扔下一切就走了。',
    ],
    brief: '废弃的伐木场。橡树桩上刻满记数，工具散了一地。',
    exits: {
      w: { to: 'dusk_camp', label: '回黄昏营地', flavor: '你离开伐木场。身后，贮木架在雾里吱呀响了一声，又静了。' },
      ne: { to: 'berry_thicket', label: '东北 · 向阳果坡', flavor: '你朝东北的向阳坡穿行。空气里渐渐浮起一股熟透的甜香。' },
    },
    onEnter: async () => {
      if (S.flags.loggerClear) return;   // 战败可重试
      await say([
        '你刚踏进营地，散落一地的工具忽然轻轻震颤起来——不是风。',
        '贮木场四周的老藤无声地立了起来，拧作一团人形的荆丛，缓缓挡在工具棚前。雾林里的东西各守各的规矩：这一团，守的是这片伐木场。',
      ]);
      const r = await battle('bramble');
      if (r !== 'win') return;
      setFlag('loggerClear');
      await say([
        '荆丛散作满地带刺的碎叶。藤心里缠着一柄厚背斧——斧刃新磨过，主人逃得再急，也没舍得把它扔远。',
        '（获得：伐木斧 · 攻击+2）',
      ]);
      give('logger_axe');
      fx({ gold: 6 });
      await say([
        '藤丛底下还压着伐木人没带走的钱袋，你抖了抖，倒出六枚金币。（金币 +6）',
        '工具棚的棚顶塌了半边。借着隙进来的天光，你看见棚柱上钉着一块记工板。',
      ]);
    },
    actions: [
      { text: '翻看棚柱上的记工板', when: () => !S.flags.loggerLog, run: async () => {
        setFlag('loggerLog');
        await say([
          '记工板上是管工的粉笔字，一笔一划记着工数。最后一行的字迹深得几乎划破木板：',
          '「都散了吧。雾一天浓过一天，夜里『没脸的』站在锯台上看我们干活。工钱我压在藤丛底下了，谁逃难路过，拿去当盘缠。这山，就当咱们从没伐过。」',
          '你把记工板翻过去扣好。有些人逃走的时候，把善意留在了原地。',
        ]);
      } },
    ],
  },

  berry_thicket: {
    name: '浆果坡', ch: '第一部 · 晨曦之印', sub: '小节二 · 迷雾森林', bg: BG + 'forest.svg', mood: 'warm',
    desc: [
      '伐木场以东的向阳坡上，灌木丛密得插不进手，枝头挂满熟透的浆果，红得发紫，甜香老远就闻得到。',
      '灌木丛里错落钉着一排小木牌，是猎户们的记号：浆果管够，但每样只许摘三成——「给鸟留冬，给人留来年」。',
    ],
    brief: '向阳的浆果坡。木牌上的老规矩：只摘三成。',
    exits: {
      w: { to: 'logger_camp', label: '回伐木场', flavor: '你揣着浆果折回伐木场，甜香一路跟着你。' },
      s: { to: 'watchtower_stand', label: '南 · 高脚瞭望塔', flavor: '你拨开灌木下坡。猎户的高脚木塔立在林缘的高地上。' },
    },
    actions: [
      { text: '照老规矩摘三成浆果', when: () => !S.flags.berryPick, run: async () => {
        setFlag('berryPick');
        await say([
          '你挑熟透的摘了一小捧，数着不超过枝头的三成。浆果酸甜的汁水一下子把赶路的乏气冲散了。（生命 +3）',
          '一只花栗鼠蹲在木牌上看着你，胡须一抖一抖，像在验收你守没守规矩。',
        ]);
        fx({ hp: 3 });
      } },
    ],
  },

  pilgrim_path: {
    name: '朝圣古道', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'road.svg', mood: 'warm',
    wild: true,
    desc: [
      '出了雾林，一条被千万双草鞋磨得温润的石板路顺着山势爬升。路旁每隔一里便有一座小小的神龛，龛里的长明灯大多灭了，龛沿的凹槽里积满香灰。',
      '三百年前，朝圣的人就是踩着这条路，一路诵着那句古谚上山的。路边的断碑上还认得出半句：「……尔当于何处寻吾」。',
    ],
    brief: '被草鞋磨温的石板朝圣路。路旁的神龛大多熄了灯。',
    roam: {
      en: 'wolves', chance: 0.05, fleeTo: 'dusk_camp', intro: '石板路的荒草间，掠过几道青灰的影子。',
      byTime: { night: { en: 'wraith', chance: 0.25, intro: '夜里的朝圣路上，神龛的灯一盏一盏自己亮了——不是为你照路。雾里浮出没脸的香客，也想上山。' } },
    },
    exits: {
      s: { to: 'dusk_camp', label: '回黄昏营地', flavor: '你退回雾林边缘的营地。石板路在身后安静地爬向山上。' },
      n: { to: 'temple_foot', label: '北 · 圣殿石阶', flavor: '石板路在千级石阶脚下到了头。雾海之上，圣殿的金顶越来越近。' },
    },
    npcs: {
      tangjiu: {
        name: '断腿的香客唐九', img: null, role: '朝圣路上摔断了腿的老香客',
        talk: async () => {
          if (!S.flags.tangjiuMet) {
            setFlag('tangjiuMet');
            await say([
              '神龛边靠着个五十来岁的汉子，左腿绑着歪歪扭扭的夹板，脸色疼得发白，见了你却先笑：「别慌，活人。摔的，不是遇的。」',
              '「唐九，跑香客的头儿。三十六里朝圣路，老子走了二十七年——今年这趟，栽在最后三里上。」他自嘲地咧咧嘴，「腿是小事，误了日子才是大事：今儿不上山，就得再等一年。」',
              '他看了看你行囊里的药水瓶，眼神在那点光上停了一瞬，又挪开了。',
            ]);
          }
          const i = await choose([
            { text: '递给他一瓶生命药水', when: () => !S.flags.tangjiuHelped, req: s => (s.items.potion || 0) > 0, lock: '没有生命药水' },
            { text: '替他把夹板重新绑紧些' },
            { text: '打听上山的路' },
          ]);
          if (i === 0) {
            take('potion');
            fx({ rep: 1 });
            setFlag('tangjiuHelped');
            await say([
              '药水下肚，唐九疼得龇牙咧嘴的额头眼见着舒展开来。「好药！」他活动了活动腿，忽然正色，「恩公，谢礼我拿不出，就送你一句老香客的话——」',
              '「山上灯庭的灯，熄了三对，是叫黑心的东西弄熄的。可灯芯的晶屑不灭，灯就死不了：石兽身上、钟肚子里、地宫的烛泪里，总有留着的。」',
              '「灯亮着，路就是活的。」他郑重地朝你拱了拱手。（声望 +1）',
            ]);
          } else if (i === 1) {
            setFlag('tangjiuSplint');
            await say([
              '你把他歪掉的夹板拆开，用绑带一层层勒紧。唐九疼得直抽凉气，嘴里却不停：「手法不错，军中的？还是猎户家的？」',
              '「这腿啊，绑得再紧也得歇半月。」他望着山上的金顶，忽然笑了，「没事，圣殿等得了三百年，不差我这半月。倒是你们——上山的路从灯庭里穿，看见熄了的灯，就晓得这山里进过什么脏东西。」',
            ]);
          } else {
            await say([
              '「路就一条，好走得很。」唐九朝北面一指，「石板路到头是千级石阶，石阶尽头是灯庭——七对石兽灯柱，一路把你送到大门跟前。」',
              '「门上三枚符文，按错了会被门『请』出去。进殿先见守殿人，铁须家的矮人，嗓门大，心肠热。三重试炼过了，晨曦才肯认你。」',
              '「去吧。替老子也看一眼——三百年了，那盏灯还亮不亮。」',
            ]);
          }
        },
      },
    },
    actions: [
      { text: '把神龛的长明灯重新点上', when: () => !S.flags.shrineLamp, run: async () => {
        setFlag('shrineLamp');
        await say([
          '你拨开神龛里的积灰，就着火折子把长明灯重新点上。豆大的一点火光跳了跳，稳稳地立住了。',
          '三百年没人做的功课，今天续上了。唐九在旁边看着，忽然背过身去，抬手抹了把脸。',
          '「……我妈从前上山，就在这座龛前添的灯。」他瓮声瓮气地说。（斗气 +2）',
        ]);
        fx({ sp: 2 });
      } },
    ],
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
    actions: [
      { text: '在石阶中段回望雾海', when: () => !S.flags.stepsLook, run: async () => {
        setFlag('stepsLook');
        await say([
          '你停在石阶中段，转身回望——雾海在脚下铺到天边，来路已经看不见了：灰岭镇、古道、白花泉、雾林，都收在一片白茫茫底下。',
          '只有东北方向的山脊透出一线雪色。艾莉娅在你身后轻声说：「翻过那道山脊，就是霜脊山。星辰之印……在更北边的白石城里等着。」',
          '你们都不说话。两个人的影子被石兽灯柱里的金光拉得很长，一直铺到来路的方向。',
        ]);
      } },
    ],
    exits: {
      s: { to: 'pilgrim_path', label: '下山 · 朝圣古道', flavor: '你踏着石阶而下。千级石阶脚下，朝圣古道安静地伸向雾林。' },
      w: { to: 'orchard_terrace', label: '西 · 果园梯田', flavor: '你绕过石阶西侧。层层的石垒梯田上，果树的枝桠挂满熟透的果子。' },
      n: { to: 'lamp_court', label: '登上 · 石兽灯庭', flavor: '你拾级而上。千级石阶的尽头，两列石兽灯柱的金光在雾里明明灭灭，像沉睡的心跳。' },
      se: {
        to: 'spur_fork', label: '东北 · 北下山道', flavor: '你们翻过山脊北侧，沿着下山道向霜脊山北麓走去。',
        req: s => s.flags.part1, lock: '先完成圣殿中的试炼',
      },
    },
  },

  lamp_court: {
    name: '石兽灯庭', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '最后一段石阶尽头是一座宽阔的灯庭：七对石兽灯柱分列两旁，兽背上驮着灯盏，一路排向圣殿正门。',
      '大多灯柱里还有金光在明灭。唯独东侧三对暗着——灯柱上多了几道不该存在的刻痕，一只细长的「眼睛」，被硬生生刻进石兽的额头。',
    ],
    brief: '七对石兽灯柱的灯庭。东侧三对暗着，柱身有「睁眼」刻痕。',
    checkpoint: true,
    exits: {
      s: { to: 'temple_foot', label: '退回石阶', flavor: '你退回石阶平台。灯庭的金光在你背后连成两列，一直亮进雾里。' },
      w: { to: 'guest_hall', label: '西 · 低矮石屋', flavor: '你绕到灯庭西侧。一排低矮的石屋伏在坡下，最东头一间，门口的小龛竟供着新香。' },
      n: { to: 'temple_gate', label: '走向圣殿大门', flavor: '你穿过灯庭。两列金光与你同行，在你身后次第合拢。' },
    },
    onEnter: async () => {
      if (!ev('lampIntro')) return;
      await say([
        '熄灭的灯盏里积着灰，灰里掺着黑色的粉末。艾莉娅捻起一点，凑近闻了闻，眉头拧紧：「有人给灯『下过药』。这不像是毁坏——更像是，不容许这里亮着。」',
        '「灯芯的聚光晶屑被撬走了，」她指着兽背上的空槽，「一支灯柱一颗。想让它们复明……得找齐三颗晶屑。」',
      ]);
      sideQuest('lamps');
      await say(['✦ 支线接取：复明的灯柱——找齐三枚引火晶屑，让熄灭的灯柱重新亮起来。']);
    },
    actions: [
      { text: '按住刻着「睁眼」的灯柱', when: () => !S.flags.sentDown, run: async () => {
        await say([
          '你把掌心贴上那道刻痕。石头是冷的，冷得不像晒了三百年太阳的东西。',
          '刻痕深处渗出一线黑气，顺着石纹爬满整根灯柱——石兽的关节里迸出砂与尘。它低下头，看着你。',
        ]);
        const r = await battle('sentinel');
        if (r !== 'win') return;
        setFlag('sentDown');
        await say([
          '石兽散作碎金与石屑，纷纷扬扬，像一场迟到了三百年的落雪。雪里，一枚完好的聚光晶屑兀自亮着。',
          '艾莉娅接住晶屑，对着光看：「被蚀的部分随它碎干净了。这一颗……还能用。」',
          '（获得：引火晶屑 · 其一，金币 +8）',
        ]);
        fx({ item: 'lamp_crystal', gold: 8 });
      } },
      { text: '把三枚引火晶屑嵌回灯柱顶端', when: () => S.sideQuests.lamps === 'active' && (S.items.lamp_crystal || 0) >= 3 && !S.flags.lampsLit, run: async () => {
        await say([
          '你踩着石兽的背，把三枚晶屑逐一嵌回空槽。晶屑触到灯盏的一瞬，三百年不曾断过的灯油「轰」地醒了过来——',
          '三对熄灭的灯柱次第复明，金光连成完整的一列。整座灯庭像深深吸了一口气。',
        ]);
        take('lamp_crystal', 3);
        fx({ maxHp: 3, rep: 1 });
        finishSide('lamps');
        setFlag('lampsLit');
        await say([
          '最后一只石兽的眼窝里，金光极轻地闪了一下——像致意，也像卸下了什么。',
          '索恩抱着巨斧看了半晌，闷声道：「铁须氏点了一辈子的灯。小子，这一手，替俺们全家谢过你了。」',
          '（生命上限 +3，声望 +1）',
        ]);
      } },
    ],
  },

  orchard_terrace: {
    name: '荒废的果园梯田', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'warm',
    desc: [
      '圣殿石阶西侧的山坡上，一层层石垒的梯田顺着山势铺下来，栽满果树——僧侣们的果园，荒了三百年，树却没人管地活着，枝头挂满果子。',
      '梯田正中立着一个戴斗笠的稻草人，破袈裟当衣，木勺当手。你分明记得，刚才经过时，它背对着你——现在，它正对着你来的方向。',
    ],
    brief: '石垒梯田上的荒废果园。稻草人不知何时换了方向。',
    exits: {
      e: { to: 'temple_foot', label: '回圣殿石阶', flavor: '你穿过梯田回到石阶。身后果叶沙沙，像谁在数你的脚步。' },
    },
    roam: {
      en: 'bramble', chance: 0.3, fleeTo: 'temple_foot', intro: '梯田边的老藤悄然立了起来——连果园的篱，也长了三百年的心眼。',
      byTime: { night: { en: 'wraith', chance: 0.35, intro: '入夜的果园静得反常，稻草人还朝着你来的方向。雾顺着田垄漫上来，拧出一个没有脸的影子。' } },
    },
    actions: [
      { text: '从果树上摘些果子', when: () => !S.flags.orchardPick, run: async () => {
        setFlag('orchardPick');
        await say([
          '果子没人摘，熟透了落，落了烂，烂了肥田，来年结得更盛——三百年的循环。你挑了两个最饱满的，坐在田埂上吃完，甜得眯起眼。（生命 +3）',
          '藤蔓在你身后轻轻收回了刚探出的一半。',
        ]);
        fx({ hp: 3 });
      } },
      { text: '端详那个稻草人', when: () => !S.flags.scarecrowSeen, run: async () => {
        setFlag('scarecrowSeen');
        await say([
          '你绕着稻草人走了一圈。破袈裟、木勺手、歪斗笠，都寻常——直到你看见它胸口挂着的小木牌。',
          '木牌上是老僧的字：「果园无主，果熟自落；落者归僧，余者归鸟。鸟啄不尽的，归过路人。」',
          '你朝它拱了拱手，摘果子便摘得心安理得起来。',
        ]);
      } },
    ],
  },

  guest_hall: {
    name: '香客寮遗址', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '灯庭西侧有一排低矮的石屋，是旧时接待朝圣者的香客寮。屋顶塌了大半，唯独最东头一间收拾得干干净净，门口的小龛里供着一尊合掌石像，龛前的香灰还新。',
      '一位鬓发全白的老妇正跪在小龛前，一下一下，擦拭着早已看不出颜色的门槛。',
    ],
    brief: '塌了大半的香客寮。唯一干净的小屋里供着新香，老妇在擦门槛。',
    exits: {
      e: { to: 'lamp_court', label: '回石兽灯庭', flavor: '你退出香客寮。身后，擦门槛的沙沙声不紧不慢地继续着。' },
    },
    npcs: {
      sue: {
        name: '老香客素娥', img: null, role: '守着香客寮小龛的老妇',
        talk: async () => {
          const i = await choose([
            { text: '「婆婆，这殿……您守了多久？」' },
            { text: '「熄掉的那三对灯柱，还能修么？」', when: () => S.sideQuests.lamps === 'active' && !S.flags.lampsLit },
            { text: '「讨口水喝。」', when: () => !S.flags.sueWater },
          ]);
          if (i === 0) {
            setFlag('sueLore');
            await say([
              '「守不住多久喽，」素娥擦门槛的手没停，「我进山那年，殿里就剩守殿的铁须老爷子一个人了。他说：香客寮的门槛，是给走不动的人歇脚的，断不得。」',
              '「他就抬了张草席让我住下。这一住……他把殿守到只剩他一个，我把门槛擦到只剩我一张席。」她笑了笑，「人老得快，殿老得慢，说不清喽。」',
              '「殿里的火啊，比人长久。你进去见着守殿人，替我问一声：门槛，还擦得动么。」',
            ]);
          } else if (i === 1) {
            setFlag('sueHint');
            await say([
              '「修是修得好。」素娥朝灯庭的方向抬了抬下巴，「那些石兽，是守殿人亲手凿的。兽背上的晶屑灯芯，一支灯柱一颗，坏不了，只是叫人撬了去。」',
              '「被蚀了一半的石兽里，兴许还有一颗囫囵的；钟塔那口哑钟的肚子里，守殿人惯常藏备用的；地宫的烛泪堆成塔，守殿人把备件封在泪壳里——三代目交代的：灯要常亮，晶屑常备。」',
              '她重新低下头去擦门槛：「客官要是寻着了，替我把灯点上。夜里跪着，也好有个亮。」',
            ]);
          } else {
            setFlag('sueWater');
            await say([
              '素娥从屋里拎出一只粗陶壶，给你倒了碗温水。水是山泉，带着一点松木的清气。',
              '「慢慢走，」她说，「殿里的路，急不得。」（斗气 +1）',
            ]);
            fx({ sp: 1 });
          }
        },
      },
    },
    actions: [
      { text: '翻看寮内的香客登记簿', when: () => !S.flags.guestLedger, run: async () => {
        setFlag('guestLedger');
        await say([
          '供桌底下压着一册厚厚的登记簿，纸页黄脆。几百年的名字密密麻麻：卖炭的、赶考的、还愿的、逃荒的……',
          '最后一页只有一行，墨迹很新：「素娥，携香三炷，长住。」',
          '再往前翻，隔了整整一册空白——那三百年里，一个名字也没有。',
        ]);
      } },
    ],
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
      s: { to: 'lamp_court', label: '退回灯庭', flavor: '你退回灯庭。两列石兽灯柱望着你，金光明明灭灭。' },
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
          if (S.flags.masonLore && !S.flags.stoneDelivered) {
            setFlag('stoneDelivered');
            fx({ rep: 1 });
            await say([
              '你把那块白石屑递过去。索恩捏在指间看了看，忽然别过脸去，好一会儿才哑声说：「料场还有人……三百年了，料场还有人记着俺们。」',
              '他把石屑小心收进胸口的皮囊里：「替俺谢谢那位老师傅。莫家的錾子，跟铁须家的斧子，是同一座殿的两条根。」',
              '（声望 +1）',
            ]);
            return;
          }
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
      n: { to: 'bell_stump', label: '北 · 塔影荒草', flavor: '你沿回廊向北。荒草深处伏着一道倾颓的影子，像一座折断的塔。' },
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
      { text: '举光照亮禅房墙角的刻痕', needsLight: true, when: () => !S.flags.cloisterMarks, run: async () => {
        if (!await payLight()) return;
        setFlag('cloisterMarks');
        fx({ item: 'torch:2' });
        await say([
          '僧舍的黑暗深得连白昼都进不来。你举起光，贴着墙角一寸寸照过去——积尘之下，砖上刻着几行小字，笔迹和三代目守殿人如出一辙：',
          '「钟哑之年，磨牙声亦止。地底的东西畏钟声，却学会了等人把它弄哑。——三百年前弄哑钟的，不是天灾，是与人换了价的祸。」',
          '刻痕旁边的石龛里，油布裹着两支上了油的新火把——守殿人备了三百年、始终没等到来取的人。（获得：火把 ×2）',
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
    actions: [
      { text: '从烛泪塔底翻找', when: () => S.flags.cryptDone && !S.flags.cryptCrystal, run: async () => {
        setFlag('cryptCrystal');
        await say([
          '烛泪积成的小塔层层叠叠。你贴着塔基，小心地掰开最底下一层——泪壳里封着一枚聚光晶屑，被烛火焐了不知多少年，竟一点没坏。',
          '历代守殿人把备件藏在历代守殿人中间。这份谨慎，本身就是一句遗言。',
          '（获得：引火晶屑 · 其三）',
        ]);
        fx({ item: 'lamp_crystal' });
      } },
    ],
  },

  bell_stump: {
    name: '钟塔残基', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'dark',
    desc: [
      '回廊尽头，一座塌了大半的钟塔伏在荒草里。塔身的裂口像一道没缝上的伤，半口青铜古钟斜嵌在瓦砾中，钟口朝天，接了三百年的雨。',
      '塔基上绕着一圈枯朽的绳痕——有人试过把这口钟弄倒、弄碎，或者弄哑。绳索换了三次，钟还在。',
    ],
    brief: '塌了大半的钟塔。半口古钟斜嵌在瓦砾里，钟口朝天。',
    exits: {
      s: { to: 'temple_cloister', label: '回圣殿回廊', flavor: '你沿着墙根退回回廊。荒草在身后合拢，把钟塔重新藏了起来。' },
      w: { to: 'temple_spring', label: '西 · 山壁石窟', flavor: '你拨开塔后的荒草向西。山壁凹进一处石窟，里头传出极轻的、一滴一滴的水声。' },
    },
    onEnter: async () => {
      if (!ev('bellStumpVisit')) return;
      await say([
        '艾莉娅仰头望着那道裂口：「守殿人的钟。老辈人说，圣殿的钟只为大事实响——七印重燃一次，钟声就传遍一遍艾尔多兰。」',
        '「这口钟哑了三百年。」她轻声说，「它在等一桩配得上它的大事。」',
      ]);
    },
    actions: [
      { text: '敲一敲半埋的古钟', when: () => !S.flags.bellStruck, run: async () => {
        setFlag('bellStruck');
        await say([
          '你解下剑鞘，在钟腹上轻轻磕了一下。',
          '声音不大，却深——像一颗石子落进三百年的井里。满塔的荒草伏了一伏，远处鸦群轰然惊起，绕着圣殿金顶转了三圈才散。',
          '胸腔里的血也跟着那口钟嗡嗡震颤，斗气在经脉里荡开一圈涟漪。（斗气 +2）',
        ]);
        fx({ sp: 2 });
      } },
      { text: '探身查看钟腹内侧', when: () => !S.flags.bellBelly, run: async () => {
        setFlag('bellBelly');
        await say([
          '钟腹内侧干燥，避开了三百年的雨。里头用油布裹着一个小包裹——守殿人藏的私货：一小袋金币，和一枚备用的聚光晶屑。',
          '油布上用炭条写着字：「灯要常亮。晶屑常备。——铁须·三代目」',
          '（金币 +6，获得：引火晶屑 · 其二）',
        ]);
        fx({ gold: 6, item: 'lamp_crystal' });
      } },
    ],
  },

  temple_spring: {
    name: '不冻泉石窟', ch: '第一部 · 晨曦之印', sub: '小节三 · 符文圣殿', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '钟塔残基再往西，山壁向内凹成一个石窟。一泓细泉从石缝里渗出来，滴进一方人工凿出的石槽，槽沿刻着两个字：「不冻」。',
      '雾海之上的圣殿山滴水成冰，唯独这眼泉三百年不冻。石槽的沿口，被一只只手掌摸出了温润的包浆。',
    ],
    brief: '山壁石窟里的细泉。三百年不冻，石槽沿口摸出了包浆。',
    exits: {
      e: { to: 'bell_stump', label: '回钟塔残基', flavor: '你退出石窟。泉滴声在身后一声一声，不急，不停。' },
    },
    actions: [
      { text: '掬一捧不冻泉水', when: () => !S.flags.springDrink, run: async () => {
        setFlag('springDrink');
        await say([
          '泉水凉得钻骨，入喉却是一线暖意。守殿人登山前在这儿净手，下山前在这儿濯剑——三百年的进退起落，都在这一捧水里过过一遍。',
          '斗气顺着那线暖意在经脉里走了一个周天，通泰之极。（斗气 +3）',
        ]);
        fx({ sp: 3 });
      } },
      { text: '细看石槽底部的刻字', when: () => !S.flags.springInscribe, run: async () => {
        setFlag('springInscribe');
        await say([
          '石槽底刻着一行小字，水光晃眼，你看了半天才认全：',
          '「三代目铭：火有灯火庭，剑有剑碑林，人有人的香客寮，泉有泉的不冻心。殿不只要有人守，还要有水记得。」',
          '你想起回廊里冷了的铁炉、塌了顶的僧舍、哑了三百年的钟——以及那位擦个不停的门槛。',
        ]);
      } },
    ],
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
    roam: { en: 'thug', chance: 0.35, intro: '风雪里蹿出一条裹着兽皮的身影——山匪把这片山脊当成了自家院子。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '夜里的山脊认不得人。风雪拧出一个没有脸的轮廓，贴着崖线漂过来。' } } },
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
      s: { to: 'shrine_pass', label: '南 · 风口山神祠', flavor: '你出南门踏上山道。风口的白气里，隐约可见一间小祠的檐角。' },
    },
    rest: { cost: 5, label: '在客栈休整一晚' },
    actions: [
      { text: '查看驿镇客栈的委托木板', run: async () => { await bountyBoard(); } },
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
      boozehound: {
        name: '疤脸酒客', img: null, role: '驿镇酒摊的老油子 · 南北消息灵通',
        talk: async () => { await tavernRumors('疤脸汉子'); },
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
    roam: { en: ['thug', 'goblin'], chance: 0.22, fleeTo: 'frost_pass', intro: '坑道阴影里蹿出一条佝偻的身影——废弃的矿坑，如今是山匪和哥布林的仓库。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '坑道深处的雾漫出坑口。雪地上，几点冷光贴着矿车的旧辙漂了过来。' } } },
    exits: {
      e: { to: 'frost_pass', label: '回白霜隘口', flavor: '你退出矿坑，风雪重新罩下来，把身后的坑口糊成一片灰白。' },
      n: { to: 'miner_camp', label: '北 · 矿村方向', flavor: '你沿着矿车的旧辙向北。翻过雪坡，一片窝棚的轮廓伏在山坳里。' },
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
      { text: '砸开坑道下游冻住的水闸', when: () => S.sideQuests.creek === 'active' && !S.flags.sluiceBroken, run: async () => {
        setFlag('sluiceBroken');
        finishSide('creek');
        fx({ rep: 1 });
        await say([
          '坑道下游的岩缝里横着一道水闸，闸后的黑水冻成一面浑浊的镜子——矿上的尾水全捂在这道闸后面，捂浑了一整条溪。',
          '你抡起剑柄，一下，两下——冻壳「轰」地裂开，黑水裹着雪泥冲了出去，在坑口外撞出一团白汽，一路朝下游的溪谷奔去。',
          '浊水终会流尽。「替下游的人把水看住了。」你把剑擦干净。（声望 +1。回石桥渡看看吧——吴钩念叨这溪水半个月了。）',
        ]);
      } },
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
      { text: '举光照向坑道深处的冻壁', needsLight: true, when: () => !S.flags.mineGleam, run: async () => {
        if (!await payLight()) return;
        setFlag('mineGleam');
        fx({ gold: 4 });
        await say([
          '矿道深处的冻壁泛着幽蓝，光照上去，一层薄冰把底下东西映得清清楚楚——「睁眼」刻痕旁边，多了几个方方正正的凿坑。',
          '坑口的边缘还新着，碎屑没有冻进冰层里。有人比矿工们逃亡更晚来过这儿，把岩层里的星髓银一粒一粒凿走了。',
          '凿坑底下的冰壳里冻着一小截皮绳，绳上拴着几枚散碎的银砂——「过路的」抖落了盘缠，也抖落了行迹。（金币 +4。影蚀还在来。他们在往山里挖。）',
        ]);
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
    roam: { en: 'thug', chance: 0.12, fleeTo: 'burnt_post', intro: '营外的旷野上晃过一条人影——荒驿那头的劫道者，最近摸到营边来了。',
      byTime: { night: { en: 'wraith', chance: 0.25, intro: '夜里的营地边，雾贴着车辙漂过来。有士兵压着嗓子念叨：「又来点名了。」' } } },
    exits: {
      s: { to: 'spur_fork', label: '回山麓岔路', flavor: '你沿官道折返南下，重新走进山风里。' },
      e: { to: 'road_town', label: '东 · 官道驿镇', flavor: '你踏上下山的岔道，驿镇的炊烟渐渐可见。' },
      n: { to: 'whitestone_gate', label: '北 · 白石城', flavor: '官道在旷野上铺开。两天后，白石城的白墙在云层下静静发着光。' },
      w: { to: 'burnt_post', label: '西 · 烧塌的荒驿', flavor: '你折向官道西侧。焦木的轮廓在荒草尽头歪歪斜斜地立着。' },
      ne: { to: 'ridge_watchtower', label: '东北 · 岭线烽哨', flavor: '你朝东北的岭线爬去。塌了半边的烽哨蹲在雪线上，像一顶戴了三百年的斗笠。' },
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
      s: { to: 'snow_hot_spring', label: '南 · 雪谷野汤', flavor: '你沿隘口南坡下到谷底。雪谷深处，一团白气正从洼地里慢慢升起来。' },
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
    actions: [treasureAction('bandit')],
  },

  /* ---- 第二部扩写 · 山道与官道 ---- */

  shrine_pass: {
    name: '风口山神祠', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'warm',
    desc: [
      '驿镇以南的风口上蹲着一间巴掌大的山神祠，半间屋顶的瓦被山风揭走了，剩下的瓦上压着三块白石头。',
      '祠里没有神像，只有一方被摩挲得发亮的供桌——赶山人不供像，供的是「风调雪顺」四个刻字。桌角的香灰是新的：这年头，还有人记得来还愿。',
      '祠檐下避风处，一个断眉的汉子正给火塘添柴，身边挂着几条熏得油亮的肉。',
    ],
    brief: '风口上的巴掌大山神祠。断眉猎户的火塘就生在檐下。',
    rest: { cost: 0, label: '在祠檐下避风歇脚' },
    exits: {
      n: { to: 'road_town', label: '北 · 回官道驿镇', flavor: '你出祠北上，驿镇的炊烟很快接住了你。' },
      e: { to: 'goat_slope', label: '东 · 牧羊坡', flavor: '你翻过祠后的石梁，坡上传来断断续续的铃铛声。' },
      w: { to: 'grayridge_gate', label: '西 · 下山去灰岭镇', flavor: '你沿山口小径下到镇口。灰岭镇的炊烟，还是老样子。' },
    },
    onEnter: async () => {
      if (!ev('shrineVisit')) return;
      await say([
        '供桌前的小木匣里插着几根竹签，签上刻着赶山人的规矩：「山里三不借：火不借，盐不借，运气不借。」',
        '可火塘边的断眉汉子朝你扬了扬下巴——意思分明是：火，随便烤。',
      ]);
    },
    actions: [
      { text: '往供桌的愿钱匣里投一枚金币，添一炷香', when: () => !S.flags.shrineOffer, req: s => s.gold >= 1, lock: '金币不足', run: async () => {
        setFlag('shrineOffer');
        fx({ gold: -1, sp: 2 });
        await say([
          '你投下一枚金币。断眉汉子把一炷香插进香灰。火光里，山风恰好在此时歇了一拍。',
          '「山神爷记下了。」他难得开口，「风顺了，脚下的路就顺。」（斗气 +2）',
        ]);
      } },
    ],
    npcs: {
      huoqi: {
        name: '断眉猎户霍七', img: null, role: '霜脊山里最后一个敢下套子的猎户',
        talk: async () => {
          if (!S.flags.huoMet) {
            setFlag('huoMet');
            await say([
              '「霍七。」汉子拍拍身边滚圆的熏肉，「行七，猎户行里排第七，前头六个都改行了。」',
              '他扯下两条熏肉，不由分说塞给你：「山里人见面分肉，不算施舍——拿着，顶饱。」',
              '「往西边隘口去的客官，夜里千万别贪路。矿那头，去年冬天就『换人住』了：白天是雪，夜里是雪底下的东西。」',
            ]);
            give('smoked_meat', 2);
            await say(['（获得：猎户熏肉 ×2）']);
            return;
          }
          if (S.flags.harkReply && !S.flags.huoHarkDone) {
            setFlag('huoHarkDone');
            finishSide('oldfriends');
            give('smoked_meat', 2);
            fx({ rep: 1 });
            await say([
              '「他真这么说？」霍七背过身去好一会儿，再转回来时嗓子有点哑，「老不死的，还咬得动弓弦就好……当年在霜脊山，他的套子比我准，酒比我狠。」',
              '「雾里的东西不认套子——这话在理。你回去告诉他：山口这头，有火塘，有热汤，套子我照下。哪天他想走动了，我这儿有他的铺位。」',
              '他扯下两条熏肉塞给你，下手很重：「替我带给他的……算了，你路上吃。替我记着这份心就行。」（声望 +1，获得：猎户熏肉 ×2）',
            ]);
            return;
          }
          if (S.flags.mineDeep && !S.flags.huoMine) {
            setFlag('huoMine');
            await say([
              '「矿里那圈坐着的，你见着了？」霍七往火塘里添了根柴，「都是好汉子。矿监逼着下井那晚，是他们把最后一盏灯挂上坑口的——说灯亮着，后来人就知道这儿塌过。」',
              '他忽然抹了把脸：「替我多看他们一眼。我进不去——一进山，腿肚子就转筋。」',
            ]);
            return;
          }
          if (S.flags.part2 && !S.flags.huoNews) {
            setFlag('huoNews');
            await say([
              '「城里那颗星星又亮起来的那晚，」霍七难得笑出声，「满山的套子都空着——好啊，野兽跟人都活着，比什么都好。」',
            ]);
            return;
          }
          if (!S.flags.huoHarkAsk) {
            setFlag('huoHarkAsk');
            sideQuest('oldfriends');
            await say([
              '「客官是从南边灰岭镇那条山口过来的？」霍七往火塘里添了根柴，忽然没头没尾地问，「镇上是不是有个背弓的老头，姓哈克？」',
              '「俺们当年一块儿在霜脊山下套。打从雾一起，音信就断了——老汉腿脚沉，我这心里，悬。」',
              '「客官要是回灰岭，替我问一声：他还打猎吗？腰还弯得动吗？问完了捎回来，算我欠你一趟山。」',
              '（支线接取：山里的旧友——回灰岭集市，替霍七问一声老猎户哈克的近况。）',
            ]);
            return;
          }
          await say([
            '「熏肉要吃就掰，别客气。」霍七眯眼望着西边的山脊，「这些日子，坡上的羊夜里都不卧坡了，全挤在祠檐底下——牲口比人先知道该挨着谁睡。」',
          ]);
        },
      },
    },
  },

  goat_slope: {
    name: '牧羊坡', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'warm',
    desc: [
      '背风的阳坡上覆着短草，几十只山羊散在坡上，铃铛声东一下西一下，像谁在雪地里撒了一把碎星。',
      '坡上支着一顶磨得发白的小帐篷，一个半大孩子在石头间跳来跳去，鞭子甩得比人还高。',
    ],
    brief: '散着羊群的阳坡。牧羊少年的鞭子甩得比人还高。',
    rest: { cost: 1, label: '在帐篷边喝碗羊奶歇脚' },
    exits: {
      w: { to: 'shrine_pass', label: '西 · 风口山神祠', flavor: '你沿石梁折回风口。祠檐下的火光在风里一明一暗。' },
      s: { to: 'ridge_watchtower', label: '南 · 荒烽哨', flavor: '你顺着坡脊南下。一座塌了半边的烽哨蹲在岭线上。' },
      n: { to: 'miner_camp', label: '北 · 牧道翻山', flavor: '你赶着让过羊群，踏上北面的牧道。翻过山坳，一片死寂的矿村摊在雪里。' },
    },
    roam: {
      en: 'wolves', chance: 0.2, fleeTo: 'shrine_pass', intro: '坡下的乱石后头，几双青灰的眼睛正借着雪光打量羊群。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '入夜后的牧羊坡静得反常——羊群挤成一团，雾从坡下漫上来，拧出一个没有脸的轮廓。' } },
    },
    onEnter: async () => {
      if (!ev('slopeVisit')) return;
      await say([
        '牧羊少年把鞭子往腰里一插，老气横秋地朝羊群喊了一嗓子。羊群听话地往帐篷那边拢了拢。',
        '「夜里的坡不能待。」他冲你们摆摆手，「不是狼——狼好歹是畜生。夜里来的那位，羊看了都往回跑。」',
      ]);
    },
    npcs: {
      shi: {
        name: '牧羊少年石头', img: null, role: '牧羊坡上最年轻的赶山人',
        talk: async () => {
          if (S.sideQuests.lamb === 'active' && S.flags.lambFound) {
            await say([
              '「灰角儿！」石头从你怀里接过瑟瑟发抖的羊羔，脸埋进那身卷毛里好一顿蹭。',
              '「它在汤泉边缩着？难怪——它最会挑地方。」他掏出一个小布包，「给你！赶山人的谢礼，我娘熏的。」',
            ]);
            fx({ gold: 3, rep: 1 });
            give('smoked_meat', 2);
            finishSide('lamb');
            await say(['（报酬：金币 +3，猎户熏肉 ×2，声望 +1）']);
            return;
          }
          if (S.sideQuests.lamb === 'active') {
            await say(['「灰角儿还没回来？」石头朝各个方向望了一圈，最后指着西北的雪谷，「汤泉！白气最旺的地方它准在——那小东西，冷了知道找暖和。」']);
            return;
          }
          if (S.sideQuests.lamb === 'done') {
            await say(['「灰角儿如今不敢跑远了。」石头得意地晃晃鞭子，「铃铛一响它头一个回——赶山人嘛，日子就是一声一声摇出来的。」']);
            return;
          }
          await say([
            '「客官见着一头羊羔没？额头一块灰，角才冒尖儿。」石头搓着通红的手，「晌午雾一起，它就跟丢了。我娘说了，找不回来，今年冬天的羊奶饼就少一张嘴的份。」',
            '「它性子暖和，天一冷准往暖和的地方钻——西北雪谷里那眼野汤泉，白气最旺。」',
          ]);
          sideQuest('lamb');
        },
      },
    },
    actions: [
      { text: '帮石头把走散的羊拢回坡顶', when: () => !S.flags.slopeHerd, run: async () => {
        setFlag('slopeHerd');
        fx({ rep: 1, hp: 2 });
        await say([
          '你学着他的样子吆喝了两声，把三只贪嘴的羊从雪窝里撵回坡顶。石头冲你竖起大拇指：「地道！赶山的活儿你也干得来。」',
          '他舀了一碗温羊奶塞给你。（声望 +1，生命 +2）',
        ]);
      } },
    ],
  },

  ridge_watchtower: {
    name: '荒烽哨', ch: '第二部 · 星辰之印', sub: '小节二 · 官道北行', bg: BG + 'mountain.svg', mood: 'dark',
    desc: [
      '岭线上的烽哨塌了半边，剩下的半边还立着，箭窗正对着北面旷野。哨台下的雪窝里，半截拴马的桩子冻在冰里。',
      '最后一任哨卒走得很体面：灶膛封了灰，水缸扣着盖，箭窗内侧的墙上留着一行炭字——「无事。风大。」',
    ],
    brief: '塌了半边的岭线烽哨。箭窗对着北面旷野，墙上有前任哨卒的炭字。',
    wild: true,
    roam: {
      en: 'thug', chance: 0.25, fleeTo: 'goat_slope', intro: '哨台的阴影里蹲着个人影——山匪把这处废哨当成了歇脚的窝。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '夜里，箭窗外浮起一个没有脸的哨兵轮廓，规规矩矩地立着岗——它已经立了很多年。' } },
    },
    exits: {
      n: { to: 'goat_slope', label: '北 · 回牧羊坡', flavor: '你沿坡脊折回北面。羊铃声远远地飘着。' },
      sw: { to: 'north_road', label: '西南 · 下山接官道', flavor: '你从烽哨西南的碎石坡下去，官道在旷野上铺开。' },
    },
    actions: [
      { text: '登上哨台，从箭窗远眺白石城', when: () => !S.flags.watchSeen, run: async () => {
        setFlag('watchSeen');
        fx({ gold: 5 });
        await say([
          '箭窗正对北面旷野。两天路程外的白石城在暮色里泛着白光，那座细高的星塔挑在城中央，塔顶的蓝白宝石一明一灭，像在喘气。',
          '艾莉娅贴着箭窗看了很久，眉头越皱越紧：「护城河的水……是黑的。城防本该映在水里，可河面上连一盏巡灯的影子都没有。」',
          '窗台上搁着一只粗陶碗，碗里冻着一层陈年的雪水——最后一任哨卒，把最后一碗水留给了下一班岗。碗底压着五枚金币。（金币 +5）',
        ]);
      } },
      { text: '翻看封好的哨灶', when: () => !S.flags.watchStove, run: async () => {
        setFlag('watchStove');
        fx({ hp: 2, gold: 3 });
        await say([
          '灶膛封着灰，灰底下压着一小袋干粮和几张油布——哨卒走得从容，东西留给了可能路过的人。干粮还能吃。（生命 +2，金币 +3）',
        ]);
      } },
    ],
  },

  snow_hot_spring: {
    name: '雪谷野汤', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'warm',
    desc: [
      '雪谷的谷底淌着一汪野汤泉，白气一团团往上升，把周围的雪烘出一圈湿黑的泥土。泉边的界石压着半朽的木牌，上面的字被热气熏得只剩「勿动」。',
      '泉眼咕嘟咕嘟地冒，几枚蛋大的卵石窝在泉边的热泥里——赶山人路过，都知道把蛋埋进去，一袋烟的工夫就熟。',
    ],
    brief: '雪谷底冒着白气的野汤泉。界石压着「勿动」的木牌。',
    rest: { cost: 0, label: '在泉边的热石上烤干衣裳' },
    exits: {
      n: { to: 'frost_pass', label: '北 · 回白霜隘口', flavor: '你烤干衣裳，踏着热气离开泉边。风雪在谷口重新罩下来。' },
    },
    onEnter: async () => {
      if (!ev('springSoak')) return;
      await say([
        '你把手脚泡进泉边的热水洼里。寒气顺着骨头缝被一点点拔出来，僵了一路的筋骨松开了。（生命 +2，斗气 +2）',
        '白气之外，雪谷静悄悄的。只有界石旁的热泥偶尔咕嘟一声——底下似乎埋着什么。',
      ]);
      fx({ hp: 2, sp: 2 });
    },
    actions: [
      { text: '把羊羔从泉边的热泥窝里抱出来', when: () => S.sideQuests.lamb === 'active' && !S.flags.lambFound, run: async () => {
        setFlag('lambFound');
        await say([
          '白气最旺的热泥窝里，一团灰白的小东西猛地弹了起来——额头一块灰，角才冒尖儿，正把四条腿轮流插进热泥里取暖。',
          '羊羔认生，却不认热水。你脱下外衣把它一裹，它立刻安生了，隔着衣裳「咩」了一声，湿乎乎的鼻尖拱了拱你的下巴。',
          '（羊羔找到了——回牧羊坡交给石头吧。）',
        ]);
      } },
      treasureAction('miner'),
    ],
  },

  miner_camp: {
    name: '空营矿村', ch: '第二部 · 星辰之印', sub: '小节一 · 霜脊山道', bg: BG + 'mountain.svg', mood: 'dark',
    desc: [
      '翻过山坳，一整片矿工的窝棚村摊在雪里。灶是冷的，晾衣绳是空的，只有村口那盏矿灯还挂在木杆上——灯罩擦得干干净净，火苗却早灭了。',
      '雪地上只有一行脚印，从村子里出来，绕了一圈，又回去了。脚印的主人，显然还在村里「上工」。',
    ],
    brief: '灶冷灯灭的矿工窝棚村。雪地上一行脚印绕着村子打转。',
    checkpoint: true,
    rest: { cost: 2, label: '在何十斤的火塘边歇脚' },
    exits: {
      s: { to: 'goat_slope', label: '南 · 牧道翻山', flavor: '你沿牧道翻下山坳，羊铃声渐渐接住了你。' },
      w: { to: 'frost_mine', label: '西 · 封冻的银矿', flavor: '你踏着矿车的旧辙向西。坑口那半扇门板还在风里磕着门框。' },
    },
    roam: {
      en: 'frosthusk', chance: 0.28, fleeTo: 'frost_mine', intro: '雪雾里立起一个叮当作响的影子——下工的「人」，还在村道上走最后一趟。',
      byTime: { night: { en: 'wraith', chance: 0.35, intro: '入夜后的矿村，那行脚印又绕了出来。雾里浮起几点冷光，挨家挨户地「查铺」。' } },
    },
    onEnter: async () => {
      if (S.flags.villageClear) return;   // 战败可重试
      await say([
        '村道中央的雪被踩得板结。一个高大的身影背对着你们，正拿把矿锤一下一下地敲着村口的灯杆——不是在毁灯，是在「上弦」，像三十年里每一个收工的傍晚一样。',
        '它转过身。矿监的皮裙还系在腰上，手里攥着一本烂掉的名册——名字念完了，它就把来的人也记上去。',
      ]);
      const r = await battle('overseer');
      if (r !== 'win') return;
      setFlag('villageClear');
      await say([
        '矿监散成砂与黑雾。名册飘落在雪里，最后一页是空白。',
        '村道上那行转圈的脚印，从雪面上一寸寸淡了下去——下工的人，终于等到了收工的锣。',
      ]);
    },
    actions: [
      { text: '把村口的矿灯重新点亮', when: () => !S.flags.campLamp, run: async () => {
        setFlag('campLamp');
        fx({ rep: 1 });
        await say([
          '你摘下灯罩，拨亮捻子。矿灯的光不大，但在雪原上，够走夜路的人看一里地。',
          '何十斤在身后看着，忽然背过身去，肩膀抖了半天：「三十年……我天天擦它，就是想着万一，万一还有人回来呢。」',
          '（声望 +1）',
        ]);
      } },
      { text: '翻看窝棚里没带走的家当', when: () => !S.flags.campLoot, run: async () => {
        setFlag('campLoot');
        fx({ gold: 6 });
        await say([
          '窝棚里的东西都码得整整齐齐——矿工们不是逃命，是「等着回来」：墙上钉着工牌，灶边码着碗，唯独一双孩子的虎头鞋挂在门边，鞋尖朝着山外。',
          '炕洞里塞着一只钱袋，是哪户人家攒下的口粮钱。（金币 +6）',
        ]);
      } },
    ],
    npcs: {
      he: {
        name: '留下的老矿工何十斤', img: null, role: '空营矿村里唯一没走的人',
        talk: async () => {
          if (!S.flags.heMet) {
            setFlag('heMet');
            await say([
              '火塘边坐着个精瘦的老头，正拿一块肉干逗火——火早灭了，他还是天天喂。「何十斤。体重，我爹取的，他希望我沉。」',
              '「都走了。就我没走——矿是老四他们一镐一镐刨出来的，人留在里头，总得有人看着灯。」',
              '「坑里那圈兄弟你见着了吧。」他声音低下去，「影蚀的秃驴们惦记矿里的星髓银。老四他们不肯带路，就……都留在了最里头。」',
            ]);
            return;
          }
          if (S.flags.mineDeep && !S.flags.heLamp) {
            setFlag('heLamp');
            give('miner_lamp');
            give('tmap_miner');
            await say([
              '「灯挂回坑口了？」何十斤的手抖了很久，从怀里摸出一样东西——一盏擦了几十年的挡风矿灯，「拿着。老四他们要是知道灯有人接着点，能乐醒过来。」',
              '（获得：老矿工的风灯 · 斗气上限+2）',
              '「还有这个。」他又撕下半张记账纸，「矿工们的卖命钱，一文一文凑的，埋在雪谷野汤泉边——老规矩，埋钱的地方，得有人看着。你去，替他们把这笔账清了。」',
              '（获得：矿工的藏宝单——行囊里翻阅可知埋宝处。）',
            ]);
            return;
          }
          if (S.flags.part2 && !S.flags.heNews) {
            setFlag('heNews');
            await say([
              '「城里的兵要回来了？！」何十斤一巴掌拍在膝盖上，「好啊！等官府把矿证批下来，我挨家挨户去信——老四家的、老七家的，都回来！这矿，还出银子！」',
            ]);
            return;
          }
          if (!S.flags.heLetters && S.flags.villageClear) {
            setFlag('heLetters');
            sideQuest('letters');
            await say([
              '「对了，还有桩心事。」何十斤从炕席底下摸出一沓皱巴巴的信，和几块擦得发亮的工牌，「好几户家属，当年逃难往南边的灰岭镇去了。老四家的、老七家的……都带着娃。」',
              '「矿上的账清了，人也走得体面——这话得有人带到。客官要是要去灰岭，替我把信捎到。工牌也带上：挂在门楣上，就算人回来了。」',
              '（支线接取：矿工的家书——把家书与工牌送到灰岭镇。）',
            ]);
            return;
          }
          if (S.flags.lettersDone && !S.flags.heLettersBack) {
            setFlag('heLettersBack');
            await say([
              '「送到了？」何十斤接过你学来的那句回话——老四家的婆娘说，工牌挂上门楣那天，孩子们在底下看了一整晚。',
              '他没说话，往那口灭了的火塘边坐下，拿肉干「喂」了很久的火。这一次，火塘里好像真的暖了一点。',
              '「这山啊，总算又跟人通着气了。」',
            ]);
            return;
          }
          await say([
            '何十斤往灭了的火塘边一坐，又开始拿肉干「喂」火。「矿灯你见着了？擦干净点儿。灯亮着，山里走夜路的，心里就有个亮。」',
          ]);
        },
      },
    },
  },

  burnt_post: {
    name: '官道荒驿', ch: '第二部 · 星辰之印', sub: '小节二 · 官道北行', bg: BG + 'road.svg', mood: 'dark',
    desc: [
      '官道旁的驿亭烧塌了大半，焦黑的梁木上还挂着半面驿旗。火不是新烧的——焦木缝里都长出了去年的枯草。',
      '驿亭后头的地窖盖板虚掩着，窖口两侧各摆了一块石头，像有人进出时，特意留下的记号。',
    ],
    brief: '烧塌了大半的官道驿亭。焦梁上挂着半面驿旗，地窖口摆着记号石。',
    wild: true,
    roam: {
      en: 'thug', chance: 0.22, fleeTo: 'road_town', intro: '驿亭的焦梁后闪出一条人影——荒驿成了劫道者眼中现成的哨卡。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '夜里，驿旗的残角无风自动。雾从地窖口漫出来，聚成一个没有脸的驿卒，朝你比了个「验关」的手势。' } },
    },
    exits: {
      s: { to: 'road_town', label: '南 · 回官道驿镇', flavor: '你沿官道折回南下，驿镇的灯火渐渐近了。' },
      n: { to: 'north_road', label: '北 · 溃兵营地方向', flavor: '你踏着焦木间的荒草北上。破茶棚的烟在旷野尽头隐约可见。' },
    },
    actions: [
      { text: '掀开地窖盖板', when: () => !S.flags.postCellar, run: async () => {
        setFlag('postCellar');
        fx({ gold: 4 });
        await say([
          '地窖不深，码着几桶没烧着的酒和半袋栗子——驿卒们跑火之前埋下的存货。桶底的泥里还陷着一把验关用的铜戳。',
          '你取走栗子和桶底捞出的几枚泡胀的铜钱，把铜戳端端正正摆回窖口——驿亭会再开张的。（金币 +4）',
        ]);
      } },
    ],
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
      n: { to: 'city_well', label: '北 · 巷尾老井', flavor: '你绕到巷子北头的井台。两层官府封条在风里掀着角。' },
      w: { to: 'curfew_post', label: '西 · 宵禁更楼', flavor: '你沿巷子向西。高脚更楼的灯火在夜色里晃出一圈暖黄。' },
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
    roam: { en: 'thug', chance: 0.3, intro: '巷子深处的黑影又立了起来——宵禁后的巷子，从来不安全。',
      byTime: { night: { en: 'corrupt_guard', chance: 0.35, intro: '宵禁后的巷子深处，一双脚跟不着地的脚步行了过来——甲叶摩擦的声响里，混着紫雾的腥气。' } } },
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
      e: { to: 'king_square', label: '东 · 铸像广场', flavor: '你穿过市集东面的牌坊。广场中央，先王的白石铸像在暮色里立着。' },
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
    roam: { en: 'thug', chance: 0.18, fleeTo: 'whitestone_street', intro: '巷口的黑影晃了晃——下城区的宵禁，比别处来得更早。',
      byTime: { night: { en: 'corrupt_guard', chance: 0.25, intro: '下城的夜雾里，一双脚跟不着地的脚步行过晾衣绳下——甲叶擦着墙皮，沙沙作响。' } } },
    exits: {
      ne: { to: 'whitestone_street', label: '回大街', flavor: '你踏上石阶回到大街。身后，粥棚的木牌在风里轻轻磕碰。' },
      sw: { to: 'orphanage', label: '西南 · 慈幼堂', flavor: '你朝西南的巷子深处走。晾衣绳的小山后面，传来稀粥的翻滚声。' },
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
      e: { to: 'granary_gate', label: '东 · 官仓', flavor: '你沿营房东墙走去。官仓的高墙下，运粮的辙印密得能织成席子。' },
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

  /* ---- 第二部扩写 · 白石城坊间 ---- */

  king_square: {
    name: '白石城 · 铸像广场', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '广场正中，先王的白石铸像立了三百年：左手按剑，右手五指并拢、轻轻合在胸前——那是「封印之手」的古礼，手合则印固。',
      '像座下的石阶上坐着避风晒太阳的老人。广场东角支着一口黄铜大锅，锅底的炭火不紧不慢，姜汤的白气混着人声，把戒严撕开了一道口子。',
      '不知是谁，把一张画着「睁开的眼睛」的纸贴在了铸像合拢的手心上。老人们看见了，谁也不去揭，只是别过脸去。',
    ],
    brief: '立着先王合掌像的广场。东角的姜汤锅冒着白气。',
    exits: {
      w: { to: 'city_market', label: '西 · 回白石市集', flavor: '你穿过广场回到市集。吆喝声重新涌进耳朵。' },
    },
    actions: [
      { text: '揭掉铸像手心上的「睁眼」纸', when: () => !S.flags.statueClean, run: async () => {
        setFlag('statueClean');
        fx({ rep: 1 });
        await say([
          '你踮脚揭下那张纸，撕碎，扬进风里。石阶上的老人们先是怔住，随后不知是谁先起的头，掌声零零落落地响成了一片。',
          '一位老者朝你深深拱手：「三百年了，那双手一直合着。有人贴脏东西，就有撕脏东西的手。」（声望 +1）',
        ]);
      } },
      { text: '细看先王铸像的合掌手印', when: () => !S.flags.statueHands, run: async () => {
        setFlag('statueHands');
        sideQuest('seventh');
        await say([
          '铸像的双手合得极缓极稳，指尖相抵，虚虚拢成一个环——像捧着一件看不见的东西。',
          '你想起藏书阁的起居注：「手合则印固，手张则印倾。」巴洛克袖口那只「睁开的眼睛」，与这双手隔着的，是三百年的人心。',
          '你忽然想起荒石料场那位老石匠——三代人不敢刻的第七位先王的脸。模样就在眼前：合着手的，就该是这个样子。',
          '（支线接取：第七张脸——回荒石料场，把先王的模样讲给莫大。）',
        ]);
      } },
    ],
    npcs: {
      kang: {
        name: '姜汤摊的康婆', img: null, role: '广场东角熬了半辈子姜汤的摊主',
        talk: async () => {
          if (!S.flags.kangMet) {
            setFlag('kangMet');
            await say([
              '「头一碗不要钱。」康婆舀起一勺滚烫的姜汤，不由分说递过来，「下城来的孩子、守夜的兵、跑单帮的——到我锅前，都算半个客。」',
              '「官府封了城西的井，说是水坏了。」她撇撇嘴，「坏的是水？坏的是有人想掐着全城的水囊米袋。我这一锅，姜是下城凑的，柴是卫戍营的兵偷偷抱来的——人心没坏透。」',
            ]);
            fx({ hp: 3 });
            await say(['你捧着粗陶碗喝了。姜味冲，后味甜，从喉咙一路暖到脚尖。（生命 +3）']);
            return;
          }
          if (S.flags.part2 && !S.flags.kangNews) {
            setFlag('kangNews');
            await say([
              '「巴洛克下了大狱那晚，」康婆把火拨得旺旺的，「我这一锅姜汤，愣是被守夜的兵和下城的爷们喝干了三回！今儿起，头一碗还是不要钱——好日子，得从锅里开始。」',
            ]);
            return;
          }
          for (;;) {
            const i = await choose([
              { text: '买一碗热姜汤（1金币）', req: s => s.gold >= 1, lock: '金币不足' },
              { text: '道谢告辞' },
            ]);
            if (i !== 0) return;
            fx({ gold: -1, item: 'hot_soup' });
            await say(['康婆麻利地灌满一只小陶壶，塞给你：「路上喝。姜味冲，忍着点——冲的才是好姜。」（获得：热姜汤 ×1）']);
          }
        },
      },
    },
  },

  city_well: {
    name: '白石城 · 城西老井', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '老井的井台上交叉贴着两张官府封条，浆糊的印迹压着更早的一层——这井封过不止一次。',
      '井绳齐根断了，井口的砖沿被磨出几十道深深的绳痕。奇怪的是封条底下的砖缝里，有人用炭条画了一道小小的门，门是开着的。',
    ],
    brief: '贴着两层封条的老井。井绳齐根断了，砖缝里画着一扇开着的小门。',
    exits: {
      s: { to: 'west_alley', label: '南 · 回城西小巷', flavor: '你离开井台。巷子深处的更声一下一下，数着宵禁的时辰。' },
    },
    onEnter: async () => {
      if (!ev('westWellVisit')) return;
      await say([
        '你趴在井沿听了听。井底深处传来极轻的、指甲挠砖的声响——一下，一下，慢得像在数着什么。',
        '艾莉娅按住你的手腕，摇了摇头。声响停了。整条巷子静得能听见封条在风里掀角的轻响。',
      ]);
    },
    actions: [
      { text: '用剑挑开封条，放下水囊打一囊井水', when: () => !S.flags.wellWater, run: async () => {
        setFlag('wellWater');
        fx({ hp: 2 });
        await say([
          '封条脆得一挑就开。水囊落底，「咚」的一声闷响过后，你绞上来半囊清凌凌的水——井水干净得很，一点异味都没有。',
          '「官府说水坏了？」巷口看热闹的孩子中的一个嘟囔，「坏的是他们不许人打水。」水很甜。（生命 +2）',
        ]);
      } },
      { text: '摸一摸井壁的砖龛', when: () => !S.flags.wellNiche, run: async () => {
        setFlag('wellNiche');
        fx({ gold: 4 });
        await say([
          '井口下三尺的砖壁上真有一个巴掌大的砖龛，是打水人搁灯的老位置。龛里塞着一只油布包：几枚铜钱，和一小卷花名册的抄页。',
          '抄页上是下城失踪者的名字，每个名字后头注着一行小字：「皆从西巷没。」不知是哪位更夫或什长，偷偷替没了的人记着账。（金币 +4）',
        ]);
      } },
      { text: '举光照进掀开封条的井口', needsLight: true, when: () => !S.flags.cityWellGleam, run: async () => {
        if (!await payLight()) return;
        setFlag('cityWellGleam');
        fx({ gold: 4 });
        await say([
          '你把光探进井口，顺着绳痕往下照。井壁上有一道挠痕——从水面下开始，一路向上，砖都被挠出了白茬。它想上来。它差点就上来了。',
          '挠痕尽头的水线处，一枚铁牌嵌在砖缝里：影蚀制式的腰牌，背面錾着「验收」二字，边缘还留着半枚「睁眼」火漆的印。',
          '「皆从西巷没。」更夫的账、井底的牌、宵禁夜的高影子，在这一口老井里对上了。（金币 +4。失踪的人不是自己走的——他们是「被收走」的。）',
        ]);
      } },
    ],
  },

  granary_gate: {
    name: '白石城 · 官仓', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '官仓的高墙下，运粮的辙印密得能织成席子——进仓的辙深，出仓的辙浅，压的全是新土。',
      '仓门前，一个抱着秤杆打盹的老仓吏惊醒过来，慌忙直腰：「官仓重地……哦，不是催粮的？那就……那就站远些看，别跨辙印。」',
    ],
    brief: '高墙深锁的官仓。进仓的辙深，出仓的辙浅。',
    exits: {
      w: { to: 'city_barracks', label: '西 · 回卫戍营房', flavor: '你离开仓场。操练场上，寥落的操练声一下一下。' },
    },
    onEnter: async () => {
      if (!ev('granaryVisit')) return;
      await say([
        '老仓吏姓娄，抱着秤杆的手背上全是冻疮。他凑近了些，声音压到几乎听不见：「客官是外乡来的？那老朽多句嘴——」',
        '「入秋到如今，进仓的粮一石没少，出仓的车队却一夜比一夜多。出仓的批条，抬头都盖着同一方印。粮去哪儿了，秤知道，老朽的嘴不敢知道。」',
      ]);
    },
    actions: [
      { text: '夜里伏上仓场对面的屋脊，数一数出仓的车队', when: () => !S.flags.granaryClue, run: async () => {
        setFlag('granaryClue');
        await say([
          '三更，你伏上屋脊。仓门开了条缝，八辆无灯的板车鱼贯而出，车辙压进雪里，一路朝城西贵族区的方向去了。押车的家丁，个个佩着巴洛克府里的腰牌。',
          '折回来时，娄伯提着灯在仓墙根下等你，手里攥着一卷抄好的仓簿：「老朽抄了三夜。客官若真有法子治他们，把这卷账，呈到能看见的地方去。」',
          '（获得线索：官仓的粮，正被夜里的车队一批批运进巴洛克的私库。当庭对质时，这卷账会说话。）',
        ]);
      } },
    ],
  },

  orphanage: {
    name: '白石城 · 慈幼堂', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'warm',
    desc: [
      '下城区最深处的一进院子，门口挂着一块褪色的木匾：慈幼堂。院里晾着小山似的衣裳，十几个孩子正围着一口大锅转，锅里的粥稀得能照见人影。',
      '掌事的白嬷嬷嗓门不大，却镇得住满院子孩子。她看见你们，先把门边的扫帚往身后拢了拢——这年头，上门的不都是好人。',
    ],
    brief: '下城深处的慈幼堂。锅里的粥稀得能照见人影。',
    exits: {
      ne: { to: 'lower_quarter', label: '东北 · 回下城区', flavor: '你离开慈幼堂。晾衣绳间的灰网在头顶晃了晃。' },
    },
    npcs: {
      bai: {
        name: '掌事的白嬷嬷', img: null, role: '慈幼堂的当家人 · 下城孩子的活菩萨',
        talk: async () => {
          if (S.sideQuests.porridge === 'active' && (S.items.smoked_meat || 0) >= 2) {
            await say([
              '两块熏肉下了锅，粥汤眼见着稠了。白嬷嬷把你的手攥在掌心里搓了搓：「好孩子。这两个月，堂里的孩子头一回闻着肉香。」',
              '她从怀里摸出一束红绳结——是孩子们一人一道编的。「拿着。下城人的谢礼不值钱，可是灵。」',
            ]);
            take('smoked_meat', 2);
            fx({ gold: 3, rep: 1, item: 'peace_knot' });
            finishSide('porridge');
            await say(['（报酬：金币 +3，声望 +1，获得：孩子们打的平安结 · 生命上限+2）']);
            return;
          }
          if (S.sideQuests.porridge === 'active') {
            await say(['「肉还差着呢。」白嬷嬷往灶里添了把柴，「猎户霍七的熏肉最好，熬汤出味。孩子们不挑，稠一点，就是过年。」']);
            return;
          }
          if (S.sideQuests.porridge === 'done') {
            await say(['「粥稠了，觉就香了。」白嬷嬷朝满院的孩子扬扬下巴，「你听——打呼的都比前些日子响。」']);
            return;
          }
          await say([
            '「粮税一分没少，兵一抽走，粮道也断了。」白嬷嬷搅着稀粥，声音又轻又稳，「堂里四十七个孩子，如今一日两顿稀的。老身的膝盖熬得住，孩子的骨头熬不住。」',
            '「你要是能弄来两块肉——熏肉、腊肉，带油的都行——这场粥就能稠三天。」',
          ]);
          sideQuest('porridge');
        },
      },
    },
    actions: [
      { text: '听孩子们念叨夜里的「高高的影子」', when: () => !S.flags.kidTales, run: async () => {
        setFlag('kidTales');
        await say([
          '孩子们围上来七嘴八舌。说到「夜里的巷子」，吵嚷声忽然矮了下去。',
          '「高高的影子，」最小的那个比划着，比到一半缩回了手，「贴着墙走，头能碰到屋檐。它走过的地方，狗不叫，也不摇尾巴，就是往后退。」',
          '白嬷嬷把孩子们拢回锅边，压低声音：「别怕，有嬷嬷呢。」转头看向你时，那双稳了半辈子的眼睛里，第一次有了晃动——「后生，夜里出门，千万结伴。」',
        ]);
      } },
    ],
  },

  curfew_post: {
    name: '白石城 · 宵禁更楼', ch: '第二部 · 星辰之印', sub: '小节三 · 白石城中', bg: BG + 'city.svg', mood: 'dark',
    desc: [
      '巷子西头的高脚更楼下，挂着一盏气死风灯。灯下的木凳上坐着个裹着旧棉袍的老更夫，梆子横在膝头，梆身被几十年的手磨出了包浆。',
      '老更夫的靴底磨穿了，垫着厚厚的毡子。他不用看天，闭着眼也数得出三更四更——这条街的夜，是从他梆子底下一年一年淌过去的。',
    ],
    brief: '巷口的高脚更楼。老更夫的梆子磨出了几十年的包浆。',
    exits: {
      e: { to: 'west_alley', label: '东 · 回城西小巷', flavor: '你沿墙根折回小巷。更声在身后不紧不慢地跟着。' },
    },
    npcs: {
      nie: {
        name: '老更夫聂伯', img: null, role: '打了一辈子更的老更夫',
        talk: async () => {
          if (!S.flags.nieMet) {
            setFlag('nieMet');
            await say([
              '「聂伯。」老更夫拍拍身边的木凳，「打更的，全城睡得最少的人。女王陛下睡几个时辰？我梆子底下数得清——比我还少。」',
              '「坐。宵禁的规矩我不敢破，可借你半盏灯的亮，还是敢的。」',
            ]);
            fx({ sp: 2 });
            await say(['灯下坐了一炷香的工夫。梆声一下一下，听着听着，连日的紧绷竟松开了些。（斗气 +2）']);
            return;
          }
          if (S.flags.alleyDone && !S.flags.nieAlley) {
            setFlag('nieAlley');
            await say([
              '「怀表的事，我听说了。」聂伯的声音低了下去，「艾德温那孩子，每夜三更都要等我的梆子响过才吹灯——他说是跟更声学的守时。」',
              '「那晚我在楼上看得真真的：巷口进了三个『走路的』，脚跟不着地。我梆子敲得山响，也没能把他们敲回头。」他攥紧了梆子，「老人家的梆子，到底只能敲给活人听。」',
            ]);
            return;
          }
          if (S.flags.part2 && !S.flags.nieNews) {
            setFlag('nieNews');
            await say([
              '「宵禁解了！」聂伯难得笑了，露出一口豁牙，「今夜起，梆子只报时辰，不催人回家——你听听，巷子里的狗叫，都欢实了！」',
            ]);
            return;
          }
          await say([
            '「夜里的巷子，脚步声我分得出几百种。」聂伯眯眼望着巷子深处，「活人的脚步有重量，落了地还要弹一下。前些日子起，有些『脚步』没有重量——遇见了，别回头，跟我的梆声走。」',
          ]);
        },
      },
    },
    actions: [
      { text: '登上更楼，借着灯火望一望全城', when: () => !S.flags.nieView, run: async () => {
        setFlag('nieView');
        await say([
          '更楼的灯火不高，但够望见两样东西：南面下城区，慈幼堂的窗纸透着一点暖黄；东面仓场的方向，雪地上压着深深浅浅的车辙，一直延向城西。',
          '聂伯在楼下念叨：「仓场的车，专拣三更出。老朽人微言轻——可梆子底下，什么都记着呢。」',
        ]);
      } },
    ],
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
        if (S.flags.granaryClue) lines.push(
          '你呈上娄伯抄了三夜的仓簿：进仓的粮一石未少，出仓的车队却夜夜不息——八车七车，尽数运进了巴洛克的私库。',
          '「兵是他调空的，粮是他搬空的。」下城赈粥棚里那锅一天稀过一天的粥，就是这本账的注脚。满朝文武，鸦雀无声。');
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
    roam: {
      en: 'deepone', chance: 0.22, intro: '路边水洼忽然荡开一圈涟漪——湿漉漉的灰绿身影从礁石阴影里立了起来。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '入夜后的海岬只剩涛声。雾从崖下漫上官道，立成一个没有脸的赶海人，与你同路了很久。' } },
    },
    exits: {
      n: { to: 'whitestone_gate', label: '回白石城', flavor: '你沿官道折返。两日后，白石城的白墙重新出现在地平线上。' },
      s: { to: 'tidesong_harbor', label: '南 · 潮歌湾', flavor: '你踏上下坡的官道。转过最后一道山梁，一片桅杆如林的渔港在暮色里亮起灯火。' },
      w: { to: 'tide_cliff', label: '西 · 望潮崖', flavor: '你踏上岬角西侧的崖径。涛声在耳边一路涨高，崖台的木栏出现在风里。' },
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
      w: { to: 'salt_sheds', label: '西 · 盐灶滩', flavor: '你沿海湾折向西北。晒盐的铸铁大锅在荒滩上一排排泛着白霜。' },
      s: { to: 'sea_mother_shrine', label: '南 · 海母祠', flavor: '你走上渔港南端的小丘。石头祠的贝串门帘在风里轻轻晃着。' },
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
              } }, ['potion', 'potion_big', 'amulet', 'tide_weave', 'torch']);
        },
      },
    },
  },

  /* ---- 第三部扩写 · 官道与渔港外围 ---- */
  tide_cliff: {
    name: '南海官道 · 望潮崖', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'sea.svg', mood: 'dark',
    wild: true,
    desc: [
      '官道在岬角西侧分出一条崖径，尽头是一方探出海面的老崖台。台边的木栏换过几茬新木——总有人特地绕上来，就为看一眼海。',
      '崖下，本该退去的潮悬在半途：浪头黑得发闷，一线一线往礁石上舔，舔完又缩回去，像在试探什么。',
      '台角立着半截风磨的旗杆，杆上没有旗，只拴着一串褪色的铜铃——渔人管这叫「听风铃」，铃不响，出海就得再等等。',
    ],
    brief: '探出海面的老崖台。崖下的潮黑得发闷，涨退之间像在试探。',
    roam: {
      en: 'brinehusk', chance: 0.2, fleeTo: 'coast_road', intro: '盐白的礁缝里立起一具窸窣作响的身影——滩上晒着的「东西」，未必都是鱼。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '入夜后的崖台只剩涛声。雾从崖底爬上来，拧出一个没有脸的望潮人，与你并肩立了很久。' } },
    },
    exits: {
      e: { to: 'coast_road', label: '回海风岬', flavor: '你沿崖径折回官道。听风铃在身后轻轻磕了两声，又哑了。' },
      s: { to: 'salt_sheds', label: '南 · 盐灶滩', flavor: '你顺着崖径下到滩头。一排排熬盐的大锅在荒滩上泛着白霜。' },
    },
    onEnter: async () => {
      if (!ev('cliffVisit')) return;
      await say([
        '你凭栏而立。黑浪退开的一瞬，崖下的深水里极快地掠过一道白影——像一袭袍角。等你想看清，浪已经合拢了。',
        '「潮信乱了……」艾莉娅望着那线悬着的黑潮，「老渔人说三天前该转向的潮，到现在还没转。这不像天时——像有什么东西，在海底下攥着潮头。」',
      ]);
    },
    actions: [
      { text: '凭栏细看崖下悬着的黑潮', when: () => !S.flags.cliffView, run: async () => {
        setFlag('cliffView');
        await say([
          '你盯着那线黑潮看了半炷香。涨，退，再涨——每次都比上一次高出一指宽，像一口被慢慢焐开的锅。',
          '索恩把巨斧往栏上一搭：「俺爹说过，海不守规矩，八成是有人在不守规矩的海底下点灯。」',
        ]);
      } },
      { text: '拾取界碑座下的平安铜钱', when: () => !S.flags.cliffCoins, run: async () => {
        setFlag('cliffCoins');
        fx({ gold: 3 });
        await say([
          '崖台的界碑座下压着几枚旧铜钱，是渔人求平安丢的，被浪磨得发亮。你只拾走三枚，其余的还给他们。（金币 +3）',
        ]);
      } },
    ],
  },

  salt_sheds: {
    name: '盐灶滩', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'sea.svg', mood: 'warm',
    wild: true, checkpoint: true,
    desc: [
      '月牙形的一弯荒滩上，几十口熬盐的铸铁大锅一排排架在石灶上，锅沿结着厚厚的盐霜，白得像落了一层不化的雪。',
      '滩上的盐工棚塌了大半，只剩最里头一间还整着：火塘是热的，锅里的卤水咕嘟着——三十年了，还有人在这儿晒盐。',
    ],
    brief: '架着几十口熬盐大锅的荒滩。最里头的盐棚里，火塘还热着。',
    rest: { cost: 1, label: '在盐棚的火塘边暖暖身子' },
    roam: {
      en: 'brinehusk', chance: 0.22, fleeTo: 'tidesong_harbor', intro: '盐堆后面挪出一具盐白的身影，一步一步走得很规矩——像还在上工。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '入夜后的盐滩泛着幽幽的白。雾贴着卤水池爬过来，立成一个没有脸的挑盐工。' } },
    },
    exits: {
      n: { to: 'tide_cliff', label: '北 · 回望潮崖', flavor: '你踏上崖径折回北面。听风铃的声音顺着风飘下来。' },
      s: { to: 'old_dockyard', label: '南 · 老船坞', flavor: '你沿滩涂南行。半沉的船台斜插进泥里，桐油的味道远远飘来。' },
      e: { to: 'tidesong_harbor', label: '东 · 回渔港', flavor: '你离开盐滩，渔港的灯火在桅杆间一盏盏亮起来。' },
    },
    actions: [
      { text: '摘下盐仓梁上的干货袋', when: () => !S.flags.saltLoft, run: async () => {
        setFlag('saltLoft');
        fx({ gold: 4 });
        await say([
          '盐仓的房梁上吊着一只防潮的油布袋——老盐工的规矩，工钱挂在梁上，人到哪天算到哪天。袋子里的钱干爽得很。（金币 +4）',
        ]);
      } },
      { text: '帮卤叔翻一帘盐', when: () => !S.flags.saltTurn, run: async () => {
        setFlag('saltTurn');
        fx({ rep: 1, item: 'clam_skewer' });
        await say([
          '你学着把盐卤耙拢、起盐、码垛。卤叔往你手里塞了一串烤得滋滋作响的贝串：「盐是百味之首。肯弯腰的人，到哪儿都饿不死。」',
          '（声望 +1，获得：烤贝串 ×1）',
        ]);
      } },
    ],
    npcs: {
      lu: {
        name: '老盐工卤叔', img: null, role: '盐灶滩最后一个晒盐人',
        talk: async () => {
          if (!S.flags.saltMet) {
            setFlag('saltMet');
            give('clam_skewer');
            await say([
              '火塘边坐着个背驼得像盐堆的老头，手里一把盐耙磨得只剩半截。「卤叔。姓什么忘了，盐卤吃多了，人都带咸味。」',
              '他往你手里塞了一串刚出锅的烤贝串：「进滩的就是客。拿着。」',
              '「盐场三十年前就散了工——灯塔一黑，海不守规矩，滩上夜里走的东西比人多。就我赖着不走：盐是百味之首，世道再乱，汤不能淡。」',
              '（获得：烤贝串 ×1）',
            ]);
            return;
          }
          if (S.flags.lampLit && !S.flags.saltLamp) {
            setFlag('saltLamp');
            await say([
              '「灯亮了！」卤叔往火塘里狠狠添了把柴，火苗蹿起老高，「你看着——今夜起，俺这几十口锅，连夜翻盐！盐滩的夜，还给人！」',
            ]);
            return;
          }
          for (;;) {
            const i = await choose([
              { text: '买一串烤贝串（1金币）', req: s => s.gold >= 1, lock: '金币不足' },
              { text: '道谢告辞' },
            ]);
            if (i !== 0) return;
            fx({ gold: -1, item: 'clam_skewer' });
            await say(['卤叔麻利地撸下一串滋滋作响的贝串，粗盐粒还挂在壳上：「趁热。咸鲜的东西，凉了就委屈了。」（获得：烤贝串 ×1）']);
          }
        },
      },
    },
  },

  old_dockyard: {
    name: '老船坞', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'harbor.svg', mood: 'warm',
    desc: [
      '一弯半沉的船台斜插进滩涂，台上还架着一条造了一半的渔船，龙骨蒙着湿帆布——桐油的味道隔着老远就闻得到。',
      '工棚门楣上钉着一块褪色的木牌：「潮记船坞」。棚里的工具按大小挂了一墙，一件不缺，像主人只是出去解了个手。',
    ],
    brief: '半沉的船台与造了一半的渔船。桐油味漫在滩涂上。',
    exits: {
      n: { to: 'salt_sheds', label: '北 · 回盐灶滩', flavor: '你离开船坞。盐滩上的大锅在暮色里白成一片。' },
      e: { to: 'sea_mother_shrine', label: '东 · 海母祠', flavor: '你踏着滩涂东行。小丘上，石头祠的贝串门帘轻轻晃着。' },
    },
    actions: [
      { text: '帮潮叔给新船的龙骨刷桐油', when: () => !S.flags.dockOil, run: async () => {
        setFlag('dockOil');
        fx({ rep: 1 });
        await say([
          '你接过油刷，沿着龙骨一路刷下去。桐油封住木纹的那一瞬，整条船像是终于喘出了一口气。',
          '「心细。」潮叔头也不抬，「这条船，带着你的手艺下水。」（声望 +1）',
        ]);
      } },
      { text: '翻看工棚墙上的旧货单', when: () => !S.flags.dockLedger, run: async () => {
        setFlag('dockLedger');
        await say([
          '货单摞了厚厚一沓，最底下的一张已经脆黄。三十年间，每一页都记着同一笔进项：「鸦羽车，货照收，人不见。」',
          '你想起渔港街角那辆漆成鸦羽色的货车——三十年，一位从不露面的老主顾。',
        ]);
      } },
      { text: '撬开船台立柱下的旧工具箱', when: () => !S.flags.dockChest, run: async () => {
        setFlag('dockChest');
        fx({ gold: 5 });
        await say([
          '船台的立柱下压着一只旧工具箱，锁早锈死了。里头是几枚工钱和一把磨得只剩半截的凿子——船匠的家当，失主怕是等不到了。（金币 +5）',
        ]);
      } },
    ],
    npcs: {
      chao: {
        name: '造船的潮叔', img: null, role: '潮记船坞的船匠 · 卡雅的舅舅',
        talk: async () => {
          if (!S.flags.dockMet) {
            setFlag('dockMet');
            await say([
              '「潮叔。船坞传到我是第四代。」他拍着那条半成的船身，「这条船，是给灯塔上的老祈修的补给船——料齐了三十年，就是没人敢出海送。」',
              '「不是船不行，是海不行。灯一黑，出海的船就得跟水里的『东西』讲道理。讲不过的，都留在海底了。」',
            ]);
            return;
          }
          if (S.flags.kaya && !S.flags.dockKaya) {
            setFlag('dockKaya');
            await say([
              '「卡雅那丫头跟你们一路？」潮叔手里的刨子顿了顿，「她阿公走了以后，她见着船坞就绕道。你们带她多走几趟海——海这东西，跟人一样，得处。」',
            ]);
            return;
          }
          if (S.flags.lampLit && !S.flags.dockLamp) {
            setFlag('dockLamp');
            await say([
              '潮叔把最后一道桐油刷上船帮，直起腰望着灯塔的方向：「船修好了。今夜就推下水——灯亮着，海就认得这条路了。」',
              '他难得地笑了。刀刻似的皱纹里，盛着三十年没盛过的东西。',
            ]);
            return;
          }
          await say([
            '「桐油要刷三道，急不得。」潮叔眯眼削着木销子，「船跟人一样——糊弄了它，它就糊弄你的命。」',
          ]);
        },
      },
    },
  },

  sea_mother_shrine: {
    name: '海母祠', ch: '第三部 · 海洋之印', sub: '小节一 · 南下潮歌湾', bg: BG + 'inn.svg', mood: 'warm',
    rest: { cost: 1, label: '在祠里的蒲团上打个盹' },
    desc: [
      '渔港南端的小丘上蹲着一间石头祠，没有门，只挂一幅贝串的门帘。祠里供的不是像，是一面砌满小灯龛的墙——几千盏祈愿灯的龛位，密密麻麻排了整面墙。',
      '亮着的灯龛不到一成。每盏灯下压着一张纸条，写的都是同一类话：「愿他回航」「愿网不空」「愿浪下的人，走得稳些」。',
    ],
    brief: '砌满祈愿灯龛的石头小祠。亮着的灯，不到一成。',
    exits: {
      n: { to: 'tidesong_harbor', label: '北 · 回渔港', flavor: '你掀帘出祠。渔港的桅杆林就在丘下，灯火次第。' },
      w: { to: 'old_dockyard', label: '西 · 老船坞', flavor: '你沿小丘西侧下到滩涂。桐油味顺着风漫过来。' },
      e: { to: 'fog_boardwalk', label: '东 · 海雾栈道', flavor: '你绕过祠后的小径。一条钉在崖腰的栈道钻进了雾里。' },
    },
    onEnter: async () => {
      if (!ev('momShrine')) return;
      await say([
        '门帘一掀，一个盘坐在灯墙前的白发老妪头也不回：「进来吧。脚步这么轻——不是来讨风的，是来还愿的。」',
      ]);
    },
    actions: [
      { text: '点一盏祈愿灯（1金币）', when: () => !S.flags.shrineLamp, req: s => s.gold >= 1, lock: '金币不足', run: async () => {
        setFlag('shrineLamp');
        fx({ gold: -1, sp: 2 });
        await say([
          '你把一盏小灯嵌进空龛，火苗颤了颤，站稳了。祝婆婆朝着灯的方向合了合掌。',
          '灯墙深处，仿佛有几千盏看不见的灯，跟着你这盏一块亮了一瞬。（斗气 +2）',
        ]);
      } },
    ],
    npcs: {
      zhu: {
        name: '庙祝祝婆婆', img: null, role: '海母祠的守灯人 · 瞎了三十年的老妪',
        talk: async () => {
          if (S.sideQuests.shipwall === 'active' && S.flags.coveWords) {
            finishSide('shipwall');
            fx({ gold: 5, rep: 1, item: 'sea_rope' });
            await say([
              '「念吧。」她朝你伸出手，像要接住每一个字。你把船壁上那行浅浅的刻痕，一个字一个字地念给她听。',
              '「『灯要是亮着，我就能看见回家的路。』」她跟着念完，安静了很久，忽然笑了：「灶生。我儿的小名。三十年了，头一回有人把他捎回家。」',
              '她从灯墙最中央的龛里取下一束红绳——那是全祠最早的一盏祈愿灯下压着的东西：「他出海那天我亲手系的。如今物归原主——系它的人说了，把它送给带他回家的人。」',
              '（报酬：金币 +5，声望 +1，获得：海母祠的红绳 · 生命上限+3）',
            ]);
            return;
          }
          if (S.sideQuests.shipwall === 'active') {
            await say([
              '「沉船湾……长顺号的船壁上，刻满了正字。」祝婆婆的手指在膝头一下一下地数着，「我儿灶生失踪的那条船。」',
              '「你若去了，替我把船壁最后一行浅浅的字念给浪听一遍——也念回来给我。我瞎了眼，可我认得他的刀法。」',
            ]);
            return;
          }
          if (S.sideQuests.shipwall === 'done') {
            await say([
              '「灯墙我虽看不见，可哪盏亮着，我心里有数。」祝婆婆朝你坐的方向偏了偏头，「你那盏，一直亮着呢。」',
            ]);
            return;
          }
          await say([
            '「婆婆这双眼，是三十年前哭坏的。」祝婆婆的声音又轻又稳，「那一年长顺号没回来——一船的男人，连同我的灶生。」',
            '「渔行的人说，沉船湾的船骸里有面刻满「正」字的船壁——有人在那条船上，活了很久很久。」',
            '「求你件事。你若去沉船湾，替我看一眼那面墙。最后一行的字，替我念回来——三十年了，总得有人替他，把话说完。」',
          ]);
          sideQuest('shipwall');
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
      sw: { to: 'fog_boardwalk', label: '西南 · 海雾栈道', flavor: '你踏上崖腰的栈道。雾从崖下漫上来，淹过栈面半寸。' },
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
          if (S.flags.perchRod && !S.flags.rodDone) {
            setFlag('rodDone');
            finishSide('grandrod');
            fx({ gold: 4, rep: 1, sp: 2 });
            await say([
              '老祈双手接过那根鲸骨节拼的旧竿，摩挲着缠柄的布条，好一会儿没说话。',
              '「老哥的竿子……」他把竿子端正挂上塔壁的挂钩，跟自己那把旧竿并排，「他总说要把竿子留给『认得的娃』——娃认得，竿也认得。」',
              '他从窗台的小铁盒里摸出四枚金币，不由分说塞过来：「钓台替他守着，竿子替他收着。这两样，他都托付对人了。」',
              '（报酬：金币 +4，声望 +1，斗气 +2）',
            ]);
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
    roam: {
      en: ['deepone', 'reefcrab'], chance: 0.3, fleeTo: 'lighthouse', intro: '水洼忽然齐齐荡开涟漪——滩涂上的东西醒了。',
      byTime: { night: { en: 'wraith', chance: 0.25, intro: '入夜后的礁滩静得反常。雾从水洼里立起来——没脸的，连潮声都替它让路。' } },
    },
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
      e: { to: 'whale_beach', label: '东 · 鲸骨滩', flavor: '你踏着礁石向东。浪声忽然变了调，像一杆收不回来的号角。' },
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
      { text: '把船壁最后一行的刻痕念给浪听，也记在心里', when: () => S.sideQuests.shipwall === 'active' && !S.flags.coveWords, run: async () => {
        setFlag('coveWords');
        await say([
          '你借着塔光，凑近那面刻满「正」字的船壁。三十七道刻痕之下，最后一行浅浅的刻痕被盐渍洇得发暗——',
          '『灯要是亮着，我就能看见回家的路。——愿见字者代我望一眼』',
          '你放轻了呼吸，把这一行字一个字一个字地念出声。浪声恰好低了下去，像整片海都在听。卡雅摘下斗笠，朝海的方向默默行了个渔家的礼。',
          '（把这句话带回去吧——海母祠的祝婆婆还等着。）',
        ]);
      } },
      { text: '翻检船板底下堆积的海藻', when: () => S.sideQuests.glowweeds === 'active' && !S.flags.weed_cove, run: async () => {
        setFlag('weed_cove');
        fx({ item: 'glowweed' });
        await say([
          '船板底下堆积的海藻间，一株荧藻幽幽发亮——大概是被哪次涨潮卷进来搁住的。',
          '你把它起出来，荧光把四周的船骸照出一圈淡淡的轮廓。（获得：荧藻）',
        ]);
      } },
      treasureAction('smuggler'),
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
      w: { to: 'sunken_hamlet', label: '西 · 淹水坳', flavor: '你绕过洞窟西侧的礁壁。退潮线以下，半个村子泡在水里。' },
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
      { text: '举光照向水线之上的洞顶', needsLight: true, when: () => !S.flags.caveGleam, run: async () => {
        if (!await payLight()) return;
        setFlag('caveGleam');
        fx({ gold: 4 });
        await say([
          '你把光抬高。洞顶倒悬的钟乳石之间，刻痕一道叠着一道——是半幅潮路图：几代人的笔迹接着刻，潮路蜿蜒，尽头是一座小小的灯塔。',
          '灯塔旁边还刻着一行小字：「潮从路来，不问昼夜。」笔锋收尾的一挑，和潮路石阶上的刻痕出自同一只手——刻图的人家，世代都守着这条海路。',
          '石缝里卡着一只被潮水顶上来的旧钱袋，绳结早朽了。（金币 +4。卡雅盯着那半幅图看了很久，什么也没说。）',
        ]);
      } },
    ],
  },

  /* ---- 第三部扩写 · 礁滩外围 ---- */
  fog_boardwalk: {
    name: '海雾栈道', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'dark',
    wild: true,
    desc: [
      '一条钉在崖腰的老栈道，从渔港南端一路探向灯塔。木板被海风啃得发白，雾从崖下漫上来，淹过栈面半寸——走一步，雾里就荡开一圈。',
      '栈道尽头的礁岩上，灯塔的白塔黑着。雾里偶尔传来木板「吱呀」的轻响，像有人在你前头十几步，不紧不慢地走着。',
    ],
    brief: '钉在崖腰的雾中栈道。雾里有木板轻响，像有人走在前头。',
    roam: {
      en: 'deepone', chance: 0.25, fleeTo: 'sea_mother_shrine', intro: '雾里那串「脚步」忽然近了——木板间立起一具滴水的灰绿身影，鳃盖开合的声音像破风箱。',
      byTime: { night: { en: 'wraith', chance: 0.3, intro: '入夜后的栈道只剩你一个人的脚步声——和身后那串没有重量的、慢半拍的脚步。' } },
    },
    exits: {
      w: { to: 'sea_mother_shrine', label: '西 · 回海母祠', flavor: '你退出栈道。祠里的灯墙隔着雾，晕出一点暖黄。' },
      ne: { to: 'lighthouse', label: '东北 · 潮歌灯塔', flavor: '你踏着雾往东北去。白塔的轮廓一点一点从雾里析出来。' },
    },
    actions: [
      { text: '低头看栈板底面的鱼汛刻痕', when: () => !S.flags.boardMark, run: async () => {
        setFlag('boardMark');
        await say([
          '你蹲身翻看几块松动的栈板。板底刻着密密的短杠——渔人记鱼汛的老法子。刻到三十年前，短杠忽然断了，最后一道刻得很深，旁边一个小字：「灯」。',
        ]);
      } },
      { text: '从雾里捞回一只挂断的皮囊', when: () => !S.flags.boardPouch, run: async () => {
        setFlag('boardPouch');
        fx({ gold: 4 });
        await say([
          '栈栏上挂着一只被风扯断绳的皮囊。里头是几枚铜钱和半块干硬的鱼饼——主人多半在雾里走散了。你把皮囊挂回最显眼的栈栏结上。（金币 +4）',
        ]);
      } },
    ],
  },

  whale_beach: {
    name: '鲸骨滩', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '滩涂尽头横着一副巨大的鲸骨，肋骨拱成一道半塌的穹门，脊柱在沙里铺出十几丈——猎鲸人的老话：鲸落海底，养活万物三十年。',
      '鲸头骨前的沙里立着一方矮矮的祭台，台面上厚厚一层凝结的鲸油，油里的灯芯还是新的。三十年了，祭火没人敢断。',
    ],
    brief: '肋骨穹门下的巨鲸骸与猎鲸人的祭台。祭油里的灯芯还是新的。',
    roam: {
      en: ['deepone', 'reefcrab'], chance: 0.25, fleeTo: 'shipwreck_cove', intro: '鲸骨的阴影里挪出湿漉漉的影子——滩上的「住户」，早把巨骸当成了家。',
      byTime: { night: { en: 'lampfish', chance: 0.3, intro: '入夜后的鲸骨滩，一点冷光贴着沙面游过来——灯眼鮟鱇提着它的「灯」，出来觅食了。' } },
    },
    exits: {
      w: { to: 'shipwreck_cove', label: '西 · 回沉船湾', flavor: '你离开鲸骨滩。沉船的龙骨在浪线间重新露出来。' },
      s: { to: 'reef_perch', label: '南 · 孤礁钓台', flavor: '你踏着退潮的沙脊南行。孤礁上，半间遮棚伏在浪线外。' },
    },
    onEnter: async () => {
      if (!ev('whaleVisit')) return;
      await say([
        '鲸肋穹门下，风声呜呜地转，像一杆收不回来的号角。卡雅放轻了脚步：「阿公说，过鲸骨滩不许吹口哨——会把它当成同类的呼唤。」',
      ]);
    },
    actions: [
      { text: '往祭台上添一勺鲸油，续上祭火', when: () => !S.flags.whaleRite, run: async () => {
        setFlag('whaleRite');
        fx({ sp: 2 });
        await say([
          '你舀起一勺鲸油，把灯芯拨亮。火苗窜起来的一瞬，穿堂的海风恰好停了。',
          '老猎鲸人说，祭火亮着，鲸王的魂就还认得这片海。（斗气 +2）',
        ]);
      } },
      { text: '在鲸骨缝隙间拾捡旧币', when: () => !S.flags.whaleCoins, run: async () => {
        setFlag('whaleCoins');
        fx({ gold: 5 });
        await say([
          '鲸肋的缝隙里卡着几十年里渔人许愿投的旧币，被盐和油裹得发亮。你拾走五枚，其余的还给海。（金币 +5）',
        ]);
      } },
      treasureAction('crab'),
    ],
  },

  reef_perch: {
    name: '孤礁钓台', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'warm',
    rest: { cost: 0, label: '在钓台的遮棚下打个小盹' },
    desc: [
      '一块退潮才露出脊背的孤礁上，搭着半间拿破船板拼的遮棚，棚柱上拴竿的铁环磨出了深槽——有人在这里，钓了一辈子的鱼。',
      '棚下的石面上刻着一副棋盘，棋子是两种贝壳，一盘棋下到一半，再没人来下完它。',
    ],
    brief: '孤礁上的旧钓台。石面的棋局下到一半，再没人来下完。',
    exits: {
      n: { to: 'whale_beach', label: '北 · 回鲸骨滩', flavor: '你踏上沙脊折回。鲸肋穹门的影子横在滩上。' },
    },
    onEnter: async () => {
      if (!ev('perchVisit')) return;
      await say([
        '遮棚的柱子上，拿刀一道一道刻着水深和潮时，字迹从工整到潦草，最后几年只剩下记号。',
        '刻痕的末尾是一行小字：「潮路我记下了，交给认得的娃。」',
      ]);
    },
    actions: [
      { text: '收拾钓台上阿公留下的旧竿', when: () => !S.flags.perchRod, run: async () => {
        setFlag('perchRod');
        sideQuest('grandrod');
        await say([
          '遮棚深处立着一根用鲸骨节拼的老钓竿，缠柄的布条磨得发亮。卡雅接过竿子的手顿了顿：「这竿子……是阿公的。他最后出海前说过，要把竿子留给『认得的娃』。」',
          '她把竿子仔细捆好，背在身后，声音低低的：「替我背回去吧——灯塔上的老祈阿公，跟他钓了一辈子鱼。」',
          '（支线接取：阿公的旧竿——把钓竿带回潮歌灯塔，交给守塔人老祈。）',
        ]);
      } },
      { text: '撬开棚柱下的浮桶', when: () => !S.flags.perchBarrel, run: async () => {
        setFlag('perchBarrel');
        fx({ gold: 4 });
        await say([
          '浮桶的盖板钉死了，撬开来是半桶盐渍的鱼饵和一只油纸包——包里是几枚被线穿好的铜钱，鱼咬钩的日子，钓主就往包里添一枚。（金币 +4）',
        ]);
      } },
    ],
  },

  sunken_hamlet: {
    name: '淹水坳', ch: '第三部 · 海洋之印', sub: '小节二 · 灯塔与礁滩', bg: BG + 'sea.svg', mood: 'dark',
    wild: true,
    desc: [
      '退潮线以下，泡着半个村子：屋脊东倒西歪地露出水面，门楣上齐齐一道深色的水线，往上是一圈一圈的旧痕——三十年，海一寸一寸地往门里进。',
      '最高的那户人家屋顶上还晾着一件衣裳，被风雨洗得只剩布筋。烟囱却是热的——这村子里，还住着人。',
    ],
    brief: '泡在退潮线以下的半个村子。烟囱里，还冒着最后一缕热烟。',
    roam: {
      en: 'deepone', chance: 0.28, fleeTo: 'sea_cave', intro: '水巷深处荡开一圈涟漪——「村道」上巡游的住户，并不欢迎访客。',
      byTime: { night: { en: 'lampfish', chance: 0.35, intro: '入夜后的淹水坳，好几盏冷光在水巷里游弋——它们提着灯，挨家挨户地「查户」。' } },
    },
    exits: {
      e: { to: 'sea_cave', label: '东 · 回潮汐洞窟', flavor: '你蹚出水巷。洞窟的潮声在礁壁那头接住了你。' },
    },
    actions: [
      { text: '对照门楣上的水位刻痕', when: () => !S.flags.hamletMarks, run: async () => {
        setFlag('hamletMarks');
        await say([
          '你挨家数过去：门楣上的水线一年高过一年，头十年涨得慢，近十年涨得急——跟灯塔熄灭的年头，对得严丝合缝。',
          '索恩把斧头往水里一杵：「不是海在涨。是水里的东西，在往岸上拱。」',
        ]);
      } },
      { text: '捞取水巷拐角的浮箱', when: () => !S.flags.hamletBox, run: async () => {
        setFlag('hamletBox');
        fx({ gold: 6 });
        await say([
          '水巷拐角卡着一只半沉的浮箱，掀开来是逃水患的人家来不及带走的家当：几枚铜钱，一把铜钥匙，还有一张浸烂的合家画像。（金币 +6）',
        ]);
      } },
    ],
    npcs: {
      hai: {
        name: '守屋的海爷', img: null, role: '淹水坳最后一家不搬的住户',
        talk: async () => {
          if (!S.flags.hamletMet) {
            setFlag('hamletMet');
            give('fish_soup');
            await say([
              '「海爷。姓什么？海抬走他家谱那年就忘了。」老头坐在屋顶改成的门槛上，脚底下就是水，「村里人嫌海进门槛，都搬了。我不搬——我儿子海生打白石城捎信回来说『攒够钱就回来修屋』。屋塌了，他回来住哪儿？」',
              '他掀开屋里的小锅，舀出一碗滚烫的鱼骨汤塞给你：「进门的都是客。汤是潮歌湾的规矩——鲜字当头。」',
              '（获得：鱼骨汤 ×1）',
            ]);
            return;
          }
          if (S.flags.lampLit && !S.flags.hamletLamp) {
            setFlag('hamletLamp');
            await say([
              '「灯亮了。」海爷望着灯塔的方向，忽然用脚尖磕了磕门楣的水线，「你看着——灯亮着，海就不敢再进这门一寸。」',
            ]);
            return;
          }
          if (S.flags.part3 && !S.flags.hamletSea) {
            setFlag('hamletSea');
            await say([
              '「大印重燃那夜，」海爷眯眼听着潮，「潮声顺了。老伙计们都这么说——海把三十年的账，认了。」',
            ]);
            return;
          }
          for (;;) {
            const i = await choose([
              { text: '再来一碗鱼骨汤（1金币）', req: s => s.gold >= 1, lock: '金币不足' },
              { text: '道谢告辞' },
            ]);
            if (i !== 0) return;
            fx({ gold: -1, item: 'fish_soup' });
            await say(['海爷从小锅里又舀出一碗，汤面上的油花映着灯塔方向的天光：「慢点喝，烫——鲜东西都烫。」（获得：鱼骨汤 ×1）']);
          }
        },
      },
    },
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
      w: { to: 'spring_gallery', label: '西 · 咏泉回廊', flavor: '你踏着浅水走向西侧回廊。泉水的暖意顺着水波漫过来。' },
      e: { to: 'tide_stairs', label: '东 · 潮路石阶', flavor: '你绕到殿东侧。一道石阶没入浅水，阶面上刻痕密布。' },
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

  /* ---- 第三部扩写 · 神殿两翼 ---- */
  spring_gallery: {
    name: '海底神殿 · 咏泉回廊', ch: '第三部 · 海洋之印', sub: '小节三 · 大退潮之夜', bg: BG + 'sunken.svg', mood: 'holy',
    desc: [
      '前殿西侧的回廊塌了一半，另一半还架在水上。廊柱的波纹刻饰间嵌着一圈圈贝饰，三百年了，光底下还泛着虹。',
      '回廊尽头，咏泉的源头从一尊倒立的石像掌心里涌出来，落地成潭。潭底的沙年年翻新——先王的活水，不肯让任何东西在这座殿里烂掉。',
    ],
    brief: '架在水上的半塌回廊。咏泉的源头从石像掌心里涌出来。',
    exits: {
      e: { to: 'sea_temple_hall', label: '回前殿', flavor: '你沿回廊折回前殿。深蓝的光从殿门深处漫出来。' },
    },
    actions: [
      { text: '在泉眼里掬一捧活水', when: () => !S.flags.galleryWater, run: async () => {
        setFlag('galleryWater');
        fx({ sp: 3 });
        await say([
          '活水离了泉眼还是温的，捧到唇边，一股暖流顺着喉咙一路熨到四肢百骸——三百年的朝圣者说的「洗尘」，原来是这个意思。（斗气 +3）',
        ]);
      } },
      { text: '探一探石像基座的壁龛', when: () => !S.flags.galleryNiche, run: async () => {
        setFlag('galleryNiche');
        fx({ gold: 8, item: 'potion' });
        await say([
          '石像基座上有朝圣者砌的小龛，龛里是历代人留下的「过路钱」：钱币摞着钱币，最上头端端正正压着一瓶封蜡完好的药——留给「走得最远的那个人」。',
          '（金币 +8，获得：生命药水 ×1）',
        ]);
      } },
      { text: '读廊柱上的朝圣刻名', when: () => !S.flags.galleryNames, run: async () => {
        setFlag('galleryNames');
        await say([
          '廊柱上刻满了名字，笔画深深浅浅，从三百年前排到三十年前。最近的一个名字旁边，有人用小字补了一句：「灯熄那年，止。」',
          '艾莉娅指尖停在那一行上，轻声说：「朝圣的路，也是跟着灯塔断的。」',
        ]);
      } },
    ],
  },

  tide_stairs: {
    name: '海底神殿 · 潮路石阶', ch: '第三部 · 海洋之印', sub: '小节三 · 大退潮之夜', bg: BG + 'sunken.svg', mood: 'dark',
    desc: [
      '前殿东侧，一道石阶没进浅水里，一级一级沉向殿下的深水。阶面上刻着细密的纹路：水路的走向、暗礁的位置、潮头转向的日子——是一幅刻进石头里的潮路图。',
      '刻痕的岔口上，有人用不同刀法补刻过几笔，深的深浅的浅，像一家人几代人接着刻同一张图。',
    ],
    brief: '没入浅水的石阶。阶面刻着一幅几代人接着刻的潮路图。',
    exits: {
      w: { to: 'sea_temple_hall', label: '回前殿', flavor: '你踏上回前殿的石阶。深蓝的光在前殿门洞里静静淌着。' },
    },
    onEnter: async () => {
      if (!ev('stairsVisit')) return;
      await say([
        '卡雅在石阶前猛地站住了。她伸手抚过阶面的刻痕，声音有点发紧：「这刀法……跟我家那张半张的潮路图，是一路的。」',
        '「阿公说，图传自先王守殿的人。」她的指尖顺着一条水路慢慢划下去，「原来『守』的，从来不只是殿——是路。」',
      ]);
    },
    actions: [
      { text: '拓下阶面的潮路刻痕', when: () => !S.flags.tidePath, run: async () => {
        setFlag('tidePath');
        fx({ sp: 2 });
        await say([
          '你用炭条把阶面的潮路仔细拓下来。深水里，隐约有大鱼贴着阶侧游过，不攻，也不躲——像在验看你拓的手法。（斗气 +2）',
          '卡雅把拓片仔细收好：「等回了港，跟我家那张对一对。」',
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
      n: {
        to: 'war_road', label: '北 · 战痕古道', flavor: '你跨过麦浪原的北缘。风换了方向——腐甜味淡了，取而代之的是一股极淡的铁锈味。',
        req: s => s.flags.part4, lock: '北风里还没有钟声——先顾眼前的麦浪',
      },
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
              } }, ['potion', 'potion_big', 'amulet', 'harvest_charm', 'torch']);
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
        quest('q_war');
        await say([
          '启程前夜，蓉婆婆在界石上多刻了一行小字，念给你们听——',
          '『五印在途，六印在望。唯第七印，不在途中，在底下。』',
          '她合起木镰：「孩子们，往北走的时候，替老朽听听北边的风。风里要是有钟声，就说明时间还够。」',
          '【第四部 · 丰收之印 · 完】——从麦浪原北缘跨出去，便是战痕古道的界碑。',
        ]);
        checkpoint();
      } },
    ],
  },

  /* ==================== 第五部 · 战争之印 ==================== */

  war_road: {
    name: '战痕古道 · 界碑', ch: '第五部 · 战争之印', sub: '小节一 · 北望古战场', bg: BG + 'road.svg', mood: 'dark',
    wild: true, checkpoint: true,
    desc: [
      '北行的路在一道倾斜的界碑前矮了下去。碑上刻着两个被风磨平大半的字，勉强认得出是「止兵」。',
      '界碑以北，大地像被一头巨兽犁过：塌陷的壕沟、半埋的轮辐、成片立着又倒下的矛杆，一直铺到天边铁灰色的雾里。',
      '风从北面来，带着铁锈味。艾莉娅拢紧斗篷：「一千年前，七位先王就是在这里把影裔军团挡下的。第五印『战争之印』，就沉眠在这片战场的最深处。」',
    ],
    brief: '「止兵」界碑旁的古道。北面的荒原上，壕沟与断矛一直铺进雾里。',
    rest: { cost: 4, label: '在驿棚歇一晚' },
    exits: {
      s: { to: 'golden_road', label: '回金穗平原', flavor: '你沿古道折返南下。两日后，铁锈味重新换成麦浪与腐甜的气息。' },
      w: {
        to: 'dusk_path', label: '西 · 暮色山道', flavor: '你踏上西面的山道。风里的钟声隐约可辨，像谁在很远的地方数着长夜。',
        req: s => s.flags.part5, lock: '古战场的事没有了结——北风里还没有钟声',
      },
      n: { to: 'rust_field', label: '北 · 铁锈荒原', flavor: '你跨过界碑。脚下的土忽然变得很松——下面埋着一千年的东西。' },
    },
    roam: { en: 'warshades', chance: 0.3, intro: '壕沟里的雾凝成了几条人影——披着锈甲的亡卒从土里直起身来。' },
    onEnter: async () => {
      if (!ev('warArrive')) return;
      await say([
        '道旁的驿棚塌了半边，棚柱上还拴着半面褪色的军旗。卡雅伸手碰了碰旗面，布屑簌簌地落。',
        '「一千年了，」她轻声说，「还没人把这面旗收走。」',
        '索恩摘下头盔，朝界碑郑重其事地躬了一躬：「铁须氏的老规矩：路过战场，先敬亡者。他们把整片天扛下来，才轮得到咱们走路。」',
        '艾莉娅展开地图：「碑林在荒原西面，影蚀的营地扎在东北。多看、多问——这一片的亡者，比活人知情的多。」',
      ]);
    },
    npcs: {
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          await shopLoop(
            '「古战场的客人，」渡鸦把货箱摊开在界碑背风处，「亡者的地界，活人得把自己照顾好。」',
            { text: '「这片荒原上，影蚀在找什么？」', when: () => !S.flags.warHint,
              run: async () => {
                setFlag('warHint');
                await say([
                  '「找的东西嘛……」渡鸦用杖尖拨了拨火堆，「一印沉眠晨光里，二印悬在星塔尖——可你听过第五印怎么唱的吗？」',
                  '『四印压阵军旗下，五印在旗杆心里。』旗杆心里，懂吗？谁把战旗升起来，谁就要先答亡者的问题——答错了，旗杆比刀还硬。」',
                  '「还有件事白送你：东北边那座营地的影蚀，不抢粮、不抓人，天天往地底下挖。你猜，他们想挖通到哪儿？」',
                  '你与艾莉娅对视一眼。等你回过神，界碑旁只剩下一小堆烧尽的篝火。',
                ]);
              } }, ['potion', 'potion_big', 'amulet', 'torch']);
        },
      },
    },
    actions: [
      { text: '拂去界碑上的尘土', when: () => !S.flags.warStone, run: async () => {
        setFlag('warStone');
        await say([
          '你伸手拂开界碑上的积尘。碑座上还有一行小得几乎磨平的铭文——',
          '『此地止兵。非胜者止，乃埋甲者止——凡我旗下，亡者为兵，生者为约。』',
          '艾莉娅指尖抚过刻痕：「先王的口气……这不是一块界碑，是一份军令。记住它——待会儿在战旗台下，用得上。」',
        ]);
      } },
    ],
  },

  rust_field: {
    name: '铁锈荒原', ch: '第五部 · 战争之印', sub: '小节二 · 荒原与碑林', bg: BG + 'mountain.svg', mood: 'dark',
    wild: true, checkpoint: true,
    desc: [
      '荒原上的风声很低，像有一千个人贴着地面齐声呼吸。',
      '塌陷的壕沟纵横交错，沟底积着经年的锈水。成片的断矛插在土里，斜度整齐得可怕——那不是溃败的姿态，是军阵到死都没有散。',
      '西面立着一片灰白的石影，是碑林；东北方向，几缕紫色的烟直直地升上天际。',
    ],
    brief: '风声低鸣的荒原。壕沟与断矛保持着一千年前的阵形，西面是碑林，东北有紫烟。',
    roam: { en: 'warshades', chance: 0.3, intro: '锈水洼里冒起一串泡——比战影更沉默的东西，从壕沟深处站了起来。' },
    exits: {
      s: { to: 'war_road', label: '回界碑古道', flavor: '你退回界碑旁的古道，驿棚的破檐在风里吱呀作响。' },
      w: { to: 'memorial_grove', label: '西 · 亡者碑林', flavor: '你踏进西面的石影之间。风声忽然低了下去，像进了灵堂的人自觉收声。' },
      e: { to: 'broken_ridge', label: '东 · 折戟丘', flavor: '你向东面的土丘走去。丘上的断矛密得像庄稼，一根挨着一根。' },
      ne: { to: 'shadow_camp', label: '东北 · 影蚀辎重营', flavor: '你压低身形，借着壕沟向东北的紫烟摸过去。' },
      n: { to: 'banner_hill', label: '北 · 战旗高台', flavor: '你向北面的高台走去。台上五面残旗的剪影，像五根竖着的手指。' },
    },
  },

  memorial_grove: {
    name: '亡者碑林', ch: '第五部 · 战争之印', sub: '小节二 · 荒原与碑林', bg: BG + 'grove.svg', mood: 'holy',
    checkpoint: true,
    desc: [
      '千百块石碑沿着坡地层层而立，碑身上刻满了名字——密得像另一种年轮。风穿过碑林的缝隙，呜咽声自动放轻。',
      '坡顶立着一块无名的将军碑，碑前长明着一点豆大的火。碑影里拄着一个人形的影子，见了你们，缓缓抬起手，行了一个一千年前军中的礼。',
    ],
    brief: '刻满名字的碑林。坡顶无名将军碑前燃着长明火，碑影里立着一个亡魂。',
    exits: {
      e: { to: 'rust_field', label: '回荒原', flavor: '你退出碑林。风声在背后重新高了起来。' },
    },
    npcs: {
      veteran: {
        name: '守碑的老兵', img: null, role: '碑林间不散的亡魂',
        talk: async () => {
          if (S.sideQuests.warname === 'active' && (S.items.dogtag || 0) >= 3) {
            await say([
              '你把三块军牌一一递过去。老兵亡魂双手接过——碰不到，却把腰弯到了底。',
              '他把军牌挨个嵌进三座空碑的碑座。每嵌进一块，碑身上的名字便亮一线暗金的光，像迟到了一千年的点名。',
              '「名字回来了，」老兵直起身，「队伍就齐了。」',
              '他从碑座下的石匣里取出一杆擦得发亮的长戈：「老将军的佩戈，替俺们再走一程吧。还有这袋军饷——亡者的钱，只付给记得亡者的人。」',
              '（支线报酬：折戟长戈 · 攻击+4，金币 +12，声望 +1）',
            ]);
            take('dogtag', 3);
            fx({ gold: 12, rep: 1, item: 'war_glaive' });
            finishSide('warname');
            return;
          }
          if (S.sideQuests.warname === 'active') {
            await say(['「军牌……一块在折戟丘的土里，一块在白骨哨塔上，还有一块，叫东边影蚀的营里拿去了。」老兵的指节穿过碑影，「找回来，碑林就认他们。」']);
            return;
          }
          await say([
            '亡魂的眉眼模糊，敬礼的手势却一丝不苟：「客人。俺守了这片碑一千年——守的不是碑，是名字。」',
            '「荒原上翻出来的军牌，都叫风沙埋了名字。名字一散，人就真死了。」他朝坡下三座空着的碑座望了一眼，「俺们的牌，一块在折戟丘，一块在哨塔上……还有一块，落在影蚀手里。」',
            '「找回来。碑林欠你们一份亡者的情分。」',
          ]);
          sideQuest('warname');
        },
      },
    },
    actions: [
      { text: '细读无名将军的碑文', when: () => !S.flags.warRhyme, run: async () => {
        setFlag('warRhyme');
        await say([
          '将军碑的碑文深而稳，一笔一划都像下过令：',
          '『开阵有五：盾为墙，枪为林，骑为锋，弓为雨，医为心。五旗次第升，缺一者，阵不认。』',
          '艾莉娅把这行字拓进册子：「军阵的次序。战旗台上的五面残旗——答案应该就在这里。」',
          '（碑文记下：五旗的升起次序——盾、枪、骑、弓、医。）',
        ]);
      } },
      { text: '向石龛里的长明火致意', when: () => !S.flags.groveBox, run: async () => {
        setFlag('groveBox');
        fx({ gold: 7 });
        await say([
          '你照军中的规矩，向长明火抱了抱拳。火苗轻轻跳了跳。',
          '石龛后头，一只锈蚀的饷匣不知被谁推开了缝——里面码着七枚磨得发亮的金币，像等了很久的军饷。（金币 +7）',
        ]);
      } },
    ],
  },

  broken_ridge: {
    name: '折戟丘', ch: '第五部 · 战争之印', sub: '小节二 · 荒原与碑林', bg: BG + 'mountain.svg', mood: 'dark',
    wild: true,
    desc: [
      '土丘上的断矛密得像收割前的麦子。传令兵的号角、辎重车的轮辐、半面撕烂的旗，全都陷在齐踝的锈土里。',
      '丘顶插着一杆最长的矛，矛尖折断的地方，挂着一面只剩一个角的军旗，风一过，猎猎地响。',
    ],
    brief: '断矛密布的土丘。丘顶折断的长矛上挂着半面残旗。',
    roam: { en: 'warshades', chance: 0.28, intro: '锈土忽然塌了一块——从土里坐起来的东西，还保持着握矛的姿势。' },
    exits: {
      w: { to: 'rust_field', label: '回荒原', flavor: '你退出折戟丘。身后，残旗还在一下一下地拍打着风。' },
    },
    actions: [
      { text: '在断矛堆里翻找', when: () => !S.flags.ridgeDug, run: async () => {
        setFlag('ridgeDug');
        fx({ gold: 6 });
        give('dogtag');
        await say([
          '你沿着矛杆的行列细看。最密的那片断矛下，锈土里露出一截折断的皮带——皮带上拴着一块黄铜军牌，牌面的名字被血锈咬掉了半边。',
          '旁边还散落着几枚生前没来得及花出去的饷钱。（金币 +6，获得：沙场军牌）',
        ]);
      } },
    ],
  },

  bone_tower: {
    name: '白骨哨塔', ch: '第五部 · 战争之印', sub: '小节二 · 荒原与碑林', bg: BG + 'lighthouse.svg', mood: 'dark',
    desc: [
      '一座用矛杆和盾片架起来的哨塔立在丘顶，一千年来被风沙磨得发白。塔身的缝隙里，还卡着当年哨兵的遗骨。',
      '塔顶的瞭望口朝着四面八方——当年站在这里的人，看得比谁都远。',
    ],
    brief: '矛杆与盾片架成的哨塔。塔顶的瞭望口还朝着四面八方。',
    exits: {
      w: { to: 'rust_field', label: '回荒原', flavor: '你从塔下退开。塔影在锈土上拉得很长，像一杆立着的矛。' },
    },
    actions: [
      { text: '登上白骨哨塔远眺', when: () => !S.flags.towerClimb, run: async () => {
        setFlag('towerClimb');
        fx({ gold: 8 });
        give('dogtag');
        await say([
          '你踩着盾片搭的蹬脚登上塔顶。风在这里陡然大了。',
          '西北，是碑林灰白的石影；东北，影蚀的辎重营扎在两道壕沟的夹角里，紫焰灯围出一圈刺眼的光——营里的影蚀不操练，只轮班往地底下挖。',
          '极北的天际，雾海之上浮着一道黑曜石的棱线，像大地上一道结了痂的伤口。血色的光在棱线上方一跳一跳。',
          '「影渊……」艾莉娅的声音很轻，「比图上画的，还要近。」',
          '瞭望口的砖缝里，前任哨兵的遗骨还靠着墙——他的军牌落在砖缝里，你替他收好。（金币 +8，获得：沙场军牌）',
        ]);
      } },
    ],
  },

  shadow_camp: {
    name: '影蚀辎重营', ch: '第五部 · 战争之印', sub: '小节二 · 荒原与碑林', bg: BG + 'cave.svg', mood: 'dark',
    desc: [
      '营盘扎在两道壕沟的夹角里，黑曜石凿的帐篷一座挨一座，紫焰灯把每一道帐缝都照得雪亮。',
      '营地中央挖着一口深不见底的竖井，辘轳吱呀作响——吊上来的不是土，是一段一段锈死的古渠石条。',
      '营里没有喊杀声。影蚀们沉默地干活，沉默地换岗，像一支在替谁赶工的工兵队。',
    ],
    brief: '扎在壕沟夹角里的营盘。中央的竖井吊着锈死的古渠石条。',
    exits: {
      sw: { to: 'rust_field', label: '回荒原', flavor: '你退出营盘。身后，辘轳还在一下一下地吊着石条。' },
    },
    onEnter: async () => {
      if (S.flags.campClear) return;   // 战败可重试
      await say([
        '你们刚摸到辕门下，巡营的影蚀营卫忽然收住了脚——紫焰灯下，它的兜帽正对着你们藏身的壕沟。',
        '「上座的工令在此，」它的声音像石头磨石头，「闲杂人等——填沟。」',
      ]);
      const r = await battle('campguard');
      if (r !== 'win') return;
      setFlag('campClear');
      fx({ item: ['war_order', 'dogtag'] });
      await say([
        '营卫溃成黑水。你们从辕门的火盆里抢出那卷烧剩一半的军令，又在哨位上搜出一块被扒下来的军牌。',
        '（获得：影蚀工令——「上座亲谕：掘通古渠，静待月晦。——影」。他们在古战场挖的不是印，是路。沙场军牌 +1）',
        '卡雅捏着军令的手紧了紧：「挖古渠……通往影渊的地底暗道。他们要给那位，修一条不用走正门的路。」',
      ]);
    },
    actions: [
      { text: '搜查辎重帐', when: () => !S.flags.campLoot, run: async () => {
        setFlag('campLoot');
        give('war_map');
        await say([
          '辎重帐里码着成捆的工具和干粮。图架上摊着一张军阵图——画到一半被人撕走了，只剩三面战旗的画样，和一句批注：',
          '『五旗不齐，阵眼不开。上座要的「路」，在阵眼底下。』',
          '（获得：布阵图残页——五面战旗中的三面。缺的两面，得去碑林问亡者。）',
        ]);
      } },
    ],
  },

  banner_hill: {
    name: '战旗高台', ch: '第五部 · 战争之印', sub: '小节三 · 战旗高台', bg: BG + 'dawn.svg', mood: 'holy',
    desc: [
      '高台由整块黑曜石凿成，五根旗杆环台而立，五面残旗垂得笔直——一千年的风，都没能把它们吹展开。',
      '台心插着一杆最高的主旗，旗杆心里透出一点暗金的光，一明，一灭，像压在旗布下的心跳。',
      '台上，一名拄着断矛的锈甲巨影背对你们而立，像已经站成了高台的一部分。',
    ],
    brief: '黑曜石高台。五面残旗垂得笔直，主旗杆心里透着暗金的光。',
    exits: {
      s: { to: 'rust_field', label: '回荒原', flavor: '你退下高台。身后，五面残旗仍旧垂得笔直。' },
    },
    actions: [
      { text: '按碑文的军阵竖起五面残旗', when: () => !S.flags.bannerOrder && !S.flags.part5, run: async () => {
        await say([
          '你握住第一面残旗的旗绳。旗布沉得像灌了铅——亡者的军阵，只认正确的次序。',
          '艾莉娅展开拓下的碑文：『盾为墙，枪为林，骑为锋，弓为雨，医为心。』',
          S.flags.warRhyme ? '（碑文里的次序，在你心里过了一遍。）' : '（没有读过碑文。五面旗，只能凭军阵的常识碰了。）',
        ]);
        const ranks = ['盾', '枪', '骑', '弓', '医'];
        const picked = [];
        for (;;) {
          const pool = ranks.filter(g => !picked.includes(g));
          if (!pool.length) break;
          const i = await choose(pool.map(g => ({ text: `把「${g}」字旗升在这一位` })));
          picked.push(pool[i]);
        }
        if (picked.join('') === '盾枪骑弓医') {
          setFlag('bannerOrder');
          await say([
            '五面残旗次第升顶——「盾」字旗张开的一瞬，整片荒原的风都停了半拍；「枪」「骑」「弓」依次猎猎展平，「医」字旗最后升定，像一颗心落回了阵中。',
            '轰——主旗杆心的暗金光陡然涨起，顺着旗杆淌下高台。荒原上，所有断矛的影子齐齐转了一个方向，朝台心聚拢。',
            '碑林的方向，隐隐传来一声悠长的、如释重负的号角。',
            '（阵眼开了。可旗影深处，那名拄矛的巨影缓缓转过身来——）',
          ]);
        } else {
          fx({ hp: -2 });
          await say([
            '旗绳勒进掌心，五面残旗轰然垂落，反震顺着手臂撞进胸口。（生命 -2）',
            '台心的暗金光黯了一瞬。风里隐约有亡者低声的哄笑——次序。想想开阵的时候，谁站在最前面。',
          ]);
        }
      } },
      { text: '直面影蚀战将断矛，重燃战争之印', when: () => S.flags.bannerOrder && !S.flags.rune5, run: async () => {
        await say([
          '锈甲的巨影拄矛而立，兜帽深处两点暗金的光死死锁住你——它守着这面主旗，守了一千年。',
          '「旗升了。」它的声音像磨刀，「那么开阵。老规矩——旗下的印，只交给打得赢军阵的人。」',
          '「一千年前俺倒在这里，」断矛顿地，锈甲哗啦作响，「一千年里，影蚀天天来教俺『换个主子』。今天正好——让俺看看，先王的兵法，还有没有人接得住！」',
        ]);
        const r = await battle('wargeneral');
        if (r !== 'win') return;
        await say([
          '断矛当啷落地。锈甲一片片剥落，战争之印从旗杆心里缓缓升起——暗金的光落进你的掌心，像一面终于交还的军旗。',
          '「好……」锈甲散尽的地方，亡魂抱拳，退进旗影，「军阵不认生死的，只认这一口气。拿去——底下那条路，替俺们堵上。」',
          '五枚符文在行囊里遥遥辉映。荒原尽头，碑林的所有石碑同时亮了一遍，像一场迟到一千年的授勋。',
        ]);
        fx({ item: 'rune5', maxHp: 6, rep: 2, flag: ['rune5', 'part5'] });
        give('war_mail');
        checkpoint();
        if (S.corruption >= 1) {
          await chapterEnd('ending_war_whisper', '锈色低语', 'RUST-COLORED WHISPERS', [
            '当夜扎营，索恩的鼾声照旧，艾莉娅的星图照旧。你却翻来覆去睡不着。',
            '荒原的风贴着帐缝钻进来，在你耳边一遍遍低声排练着同一句话——旗升了，就该有个旗主。五印齐了四印，谁替亡者扛旗？',
            '行囊深处，那几样来自深渊的东西轻轻搏动着。你数着它们的节拍入睡——今夜，你梦见的不是战场，是王座。',
          ]);
        } else {
          await chapterEnd('ending_war_warden', '战旗不倒', 'THE STANDARD STILL FLIES', [
            '翌日拔营，你们绕路经过碑林。千百块石碑亮了整整一夜，此刻正一层层暗下去，像一场散了的军礼。',
            '老兵亡魂立在坡顶，朝你们行的最后一个军礼，一丝不苟。',
            '「军阵不认生死，只认这一口气。」索恩低声把这句话重复了一遍，把斧头背得更正了些。',
          ]);
        }
        quest('q_bell');
        await say([
          '收拾行装时，卡雅忽然侧过耳朵：「西边——山里有钟声。」',
          '艾莉娅翻开星图，在西面的群山里圈出一座修道院的标记：「第六印『暮钟之印』，悬在暮色修道院的钟楼顶层。一千年来，那口钟替整片大陆数着长夜。」',
          '「影蚀的工令写着『静待月晦』，」她抬起头，「月亮圆缺只剩十几天——钟，不能再哑了。」',
          '【第五部 · 战争之印 · 完】——从界碑古道向西，便是暮色山道。',
        ]);
        checkpoint();
      } },
    ],
  },

  /* ==================== 第六部 · 暮钟之印 ==================== */

  dusk_path: {
    name: '暮色山道', ch: '第六部 · 暮钟之印', sub: '小节一 · 暮色山道', bg: BG + 'forest.svg', mood: 'dark',
    wild: true, checkpoint: true,
    desc: [
      '山道贴着崖壁向西盘升。暮色在这里浓得反常——明明是晌午，林梢却浸在一片化不开的昏黄里。',
      '风里的钟声越来越清晰：很慢，很沉，一声与一声之间隔得极长，像有人在数着什么。',
      '「暮钟，」艾莉娅侧耳听着，「传说它一响，影渊那位就要多睡一百年。可最近这几声……间隔越来越长了。」',
    ],
    brief: '浸在昏黄暮色里的山道。钟声很慢，很沉，一声与一声隔得极长。',
    roam: { en: 'mutes', chance: 0.3, intro: '林间的雾里走出两名黑袍人影——走的姿势是修士的，身上却缠着紫雾。' },
    exits: {
      e: { to: 'war_road', label: '回界碑古道', flavor: '你沿山道折返东行。钟声在背后一声一声，送出很远。' },
      n: { to: 'abbey_gate', label: '北 · 暮色修道院', flavor: '你转过最后一道崖壁。灰白的修道院钟楼立在山坳里，像一位垂首祈祷的老僧。' },
    },
    onEnter: async () => {
      if (!ev('duskArrive')) return;
      await say([
        '道旁立着一座小小的神龛，龛里的灯芯早就干了。奇怪的是——灯芯上凝着一滴新的烛泪。',
        '「有人最近来添过灯，」卡雅擦着鱼叉，「这条路上，还有活人在走。」',
      ]);
    },
  },

  abbey_gate: {
    name: '暮色修道院 · 山门', ch: '第六部 · 暮钟之印', sub: '小节一 · 暮色山道', bg: BG + 'temple.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '修道院的山门是两扇包铁的橡木门，门环上缠着褪色的祈绳。门前的石阶扫得干干净净——有人还在这里修行。',
      '可门楼两侧的阴影里，几道黑袍身影正贴着墙根游走，紫雾顺着他们的袍角淌下来。',
    ],
    brief: '包铁橡木门的山门。石阶干净，门楼两侧的阴影里却缠着紫雾。',
    exits: {
      s: { to: 'dusk_path', label: '回暮色山道', flavor: '你退下山门石阶。钟声在头顶一声一声，不紧不慢。' },
      n: {
        to: 'abyss_mouth', label: '北 · 影渊谷口', flavor: '你穿过修道院后墙的小门，踏上北面的黑崖栈道。脚下的雾海深处，隐隐透着血色的光。',
        req: s => s.flags.part6, lock: '钟楼的事没有了结——影渊还轮不到你',
      },
    },
    onEnter: async () => {
      if (S.flags.abbeyOpen) return;   // 战败可重试
      if (S.flags.gameClear) return;
      await say([
        '山门虚掩着，门缝里透出一线烛光。你们刚要叩门，门楼阴影里蓦地立起一名黑袍辅祭——袖口上，绣着一只睁开的眼睛。',
        '「上座有谕：钟楼清场。」辅祭的掌心托着一只小香炉，紫烟袅袅，「修士迁走，钟——哑掉。挡路的……一并哑掉。」',
        '门内传来老人们压低的诵经声。辅祭朝门缝里瞥了一眼，笑了一声，把香炉高高举起——',
      ]);
      const r = await battle('acolyte');
      if (r !== 'win') return;
      setFlag('abbeyOpen');
      await say([
        '辅祭的黑袍散作烟尘，香炉哐当滚下石阶。门内安静了几息——随后，门闩响动，橡木门缓缓开了。',
        '一位灰衣老修士提着灯立在门内，身后是数十名屏息的修士。他浑浊的眼睛在你们掌心的符文光上停了很久。',
        '「一千三百年了，」他嘶哑地说，「先王的光，又一次走到了暮色山道。进来吧——晚课的钟，还替你们留着座。」',
      ]);
      checkpoint();
    },
  },

  vespers_hall: {
    name: '修道院 · 晚课堂', ch: '第六部 · 暮钟之印', sub: '小节二 · 晚课与静室', bg: BG + 'temple.svg', mood: 'holy',
    desc: [
      '晚课堂里烛火成排，木凳上跪坐着数十名修士，诵经声压得极低、极稳，像退潮时的海。',
      '讲经台边立着一座一人高的木架，架上摊着一部厚得像门板的圣咏书。墙角的蒲团上，坐着那位灰衣老修士。',
      '西墙上开着一道小门，门楣上刻着两个字：静室。北面的祭坛后，是通往钟楼的旋梯。',
    ],
    brief: '烛火成排的晚课堂。修士们低声诵经，老修士坐在墙角蒲团上。',
    exits: {
      s: { to: 'abbey_gate', label: '出山门', flavor: '你穿过前院，山门在身后合拢，诵经声隔在门内。' },
      w: { to: 'quiet_cell', label: '西 · 静室', flavor: '你推开静室的小门。烛光暖暖的，蒲团与薄毯都干净。' },
      n: { to: 'bell_lower', label: '北 · 钟楼', flavor: '你从祭坛后踏上旋梯。石阶上刻着一圈圈磨出来的浅坑——那是守钟人一千年的脚印。' },
    },
    npcs: {
      anselm: {
        name: '老修士安瑟姆', img: null, role: '暮色修道院最后一位听钟人',
        talk: async () => {
          if (ev('anselmMet')) {
            await say([
              '老修士朝你们合十，浑浊的眼睛却亮得惊人：「山门那一战，老朽在门后听得清楚。客人们——坐。晚课不长，故事很长。」',
              '「影蚀要这口钟哑掉，不是恨它。是怕它。」安瑟姆咳嗽了两声，「暮钟一响，影渊那位就要多睡一百年——钟声替大地数着长夜。数满了，才轮得到日出。」',
              '「可如今钟楼里蹲着个『圣咏者』，钟舌又叫辅祭偷了去。老朽这双腿，上不去旋梯了。」',
            ]);
            const i = await choose([
              { text: '「我该怎么做？」' },
              { text: '「七印到底是什么？——请如实告诉我。」' },
              { text: '先去四处看看' },
            ]);
            if (i === 0) {
              await say([
                '「钟舌在辅祭手里，就在钟楼的石阶上。」安瑟姆指向北面旋梯，「取回来，老朽替你们敲开顶层的门——三口钟的次序，圣咏书里写着。」',
                '「至于顶上那位……」他浑浊的眼睛暗了暗，「她原本是老朽的师妹。别让她把最后一课，讲完。」',
              ]);
              sideQuest('belltongue');
            } else if (i === 1) {
              setFlag('lore');
              await say([
                '安瑟姆沉默了很久，久到烛火跳了三次。',
                '「七印不是七把锁。」他终于开口，「孩子们，你们一路听来的传说，都错在开头——先王们从来没想过把莫格拉斯锁一辈子。」',
                '『晨曦教你如何开始，星辰教你如何看清，海洋教你如何退让，丰收教你如何积蓄，战争教你如何止损，暮钟教你如何收梢。』——六印，是六份遗嘱，是六堂先王们留给后来人的课。」',
                '「他们真正想教会的，是最后那一课：怎样『结束』这一切。可三百年前走进影渊的那批人，只想学会怎么赢。」安瑟姆摇摇头，「于是封印越锁越死，遗嘱没人读完，而那位——一直等一个读完的人。」',
                '「客人。你们若真走到了王座跟前，替老朽把这句话带到：先王的正文，写到你们这一页了。」',
                '（安瑟姆的课记下了——七印的真相。在影渊的王座前，也许用得上。）',
              ]);
            } else {
              await say(['安瑟姆合十：「去吧。静室可以歇脚，圣咏书随便翻——只是别惊了晚课的孩子们。」']);
            }
            return;
          }
          if (S.sideQuests.belltongue === 'active' && (S.items.bell_tongue || 0) > 0) {
            await say([
              '你把铜舌递过去。安瑟姆双手捧住，像捧回一颗心：「轻些……它睡了三个月了。」',
              '他把钟舌贴在耳边听了听，浑浊的眼睛一下子涌出水光：「没伤着。一个磕痕都没有。」',
              '「老朽没什么谢的——这枚玉磬跟着老朽六十年，压噩梦、提精神，比药管用。拿去。往后你的路比老朽的陡，得有个响亮的东西陪着。」',
              '「还有这些散碎的香火钱，别推——亡人的庙不缺这个，活人的剑才缺。」',
              '（支线报酬：玉磬坠 · 斗气上限+6，金币 +10，声望 +1）',
            ]);
            take('bell_tongue');
            fx({ gold: 10, rep: 1, item: 'jade_chime' });
            finishSide('belltongue');
            await say([
              '当夜，暮钟百年来自鸣了第一次。钟声滚过山谷，滚过荒原——影渊的方向，有什么东西不满地翻了个身。',
              '（钟声涤荡：斗气 +10）',
            ]);
            fx({ sp: 10 });
            return;
          }
          if (S.sideQuests.belltongue === 'active') {
            await say(['「铜舌在辅祭手里——就在钟楼的石阶上。」安瑟姆咳嗽着，「老朽这双腿，上不去了。」']);
            return;
          }
          if (!S.flags.lore) {
            const i = await choose([
              { text: '「七印到底是什么？——请如实告诉我。」' },
              { text: '「告辞。」' },
            ]);
            if (i === 0) {
              setFlag('lore');
              await say([
                '安瑟姆沉默了很久，久到烛火跳了三次。',
                '「七印不是七把锁。」他终于开口，「先王们从来没想过把莫格拉斯锁一辈子。晨曦教你如何开始，星辰教你如何看清，海洋教你如何退让，丰收教你如何积蓄，战争教你如何止损，暮钟教你如何收梢——六印，是六份遗嘱，是六堂留给后来人的课。」',
                '「他们真正想教的，是最后一课：怎样『结束』这一切。可三百年前走进影渊的那批人，只想学会怎么赢。」',
                '「客人。你们若真走到了王座跟前，替老朽把这句话带到：先王的正文，写到你们这一页了。」',
              ]);
            }
            return;
          }
          await say(['安瑟姆合十：「记住那句话，孩子——七印不是七把锁，是七份遗嘱。走得再远，也别忘了问自己：这一课，教的是什么。」']);
        },
      },
    },
    actions: [
      { text: '研读晚课圣咏书', when: () => !S.flags.vesperRhyme, run: async () => {
        setFlag('vesperRhyme');
        await say([
          '圣咏书厚得像门板，翻开的页脚被一千年的手指磨出了凹槽。当页经文旁，有一行朱笔小注——',
          '『摇钟次序：先鸣者送亡者，次鸣者唤生者，末鸣者，为归人。次序颠倒，魂惊而钟哑。』',
          '（钟序记下：钟楼的钟——亡者钟、生者钟、归人钟，依次而鸣。）',
        ]);
      } },
    ],
  },

  quiet_cell: {
    name: '修道院 · 静室', ch: '第六部 · 暮钟之印', sub: '小节二 · 晚课与静室', bg: BG + 'inn.svg', mood: 'warm',
    desc: [
      '一间狭小的静室，一床、一凳、一盏灯。窗台上摆着修士们匀出来的干粮和一壶温水，还带着体温。',
      '墙上挂着一幅褪色的字：『为一切人，成一切声。』',
    ],
    brief: '一床一凳一盏灯的静室。窗台上有修士们匀出来的干粮。',
    rest: { cost: 3, label: '在静室歇一晚' },
    exits: {
      e: { to: 'vespers_hall', label: '回晚课堂', flavor: '你合上静室的门。诵经声从大殿那头隐隐传来，稳得像退潮的海。' },
    },
  },

  bell_lower: {
    name: '钟楼 · 下层', ch: '第六部 · 暮钟之印', sub: '小节三 · 钟楼之夜', bg: BG + 'temple.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '旋梯的尽头是一座圆形的钟室。三口钟从横梁上垂下：最大的那口绿锈斑驳，钟身刻着「归人」；一口刻着「亡者」，一口刻着「生者」。',
      '通往顶层的木门闩着三道闩——门楣上写着：钟鸣三巡，闩落门开。',
      '石阶旁的暗格里塞着守钟人的杂物，一根不知第几任守钟人留下的麻绳还垂在钟绳旁。',
    ],
    brief: '三口巨钟垂在横梁上。顶层的木门闩着三道闩：钟鸣三巡，闩落门开。',
    exits: {
      s: { to: 'vespers_hall', label: '下旋梯 · 回晚课堂', flavor: '你踩着磨出浅坑的石阶退回晚课堂。烛光把你的影子拉得很长。' },
      up: {
        to: 'bell_top', label: '上 · 钟楼顶层', flavor: '三道木闩次第弹开。你攀上最后一段梯子，风声与钟声一齐灌进耳朵。',
        req: s => s.flags.bellReady, lock: '三道闩纹丝不动——钟鸣三巡，闩落门开',
      },
    },
    onEnter: async () => {
      if (S.flags.stairsClear) return;   // 战败可重试
      await say([
        '旋梯中段，一道黑袍身影从阴影里转出来——是那名辅祭。他怀里死死抱着什么，铜舌在袍子里磕出一声闷响。',
        '「上座要的，是一口哑钟。」辅祭退到旋梯高处，掌心的香炉腾起紫烟，「你们，连钟声都别想听见。」',
      ]);
      const r = await battle('acolyte');
      if (r !== 'win') return;
      setFlag('stairsClear');
      give('bell_tongue');
      await say([
        '辅祭的黑袍散作烟尘，铜舌从他怀里滚落，沿着石阶叮叮当当弹到底——一路上，三口钟像感应到什么，各自轻轻嗡了一声。',
        '（获得：暮钟的钟舌。钟室的石阶暗格里，还塞着前任守钟人攒下的几枚香火钱。）',
      ]);
    },
    actions: [
      { text: '搜查石阶暗格', when: () => !S.flags.bellBox, run: async () => {
        setFlag('bellBox');
        fx({ gold: 8 });
        await say(['暗格里有半袋干豆、一本记满了钟点的簿子，和八枚磨得发亮的铜钱——每一枚都用朱砂点过。（金币 +8）']);
      } },
      { text: '摇响三口钟', when: () => !S.flags.bellReady, run: async () => {
        await say([
          '三根钟绳垂在手边。绳结上系着小小的木牌：亡者、生者、归人。',
          '安瑟姆在山下仰着头。圣咏书上的朱批，你记得多少？',
          S.flags.vesperRhyme ? '（朱批在你心里过了一遍：先鸣者送亡者……）' : '（没有读过圣咏书。三口钟……凭感觉了。）',
        ]);
        const bells = ['亡者钟', '生者钟', '归人钟'];
        const picked = [];
        for (;;) {
          const pool = bells.filter(g => !picked.includes(g));
          if (!pool.length) break;
          const i = await choose(pool.map(g => ({ text: `先拉「${g}」的钟绳（第 ${picked.length + 1} 声）` })));
          picked.push(pool[i]);
        }
        if (picked.join('') === '亡者钟生者钟归人钟') {
          setFlag('bellReady');
          await say([
            '第一声送给亡者——钟声沉得像整座山在低眉。第二声唤生者——山下晚课堂里，诵经声齐齐扬起了一个调。第三声迎归人——',
            '「当——」',
            '一声悠长的、活过来的钟鸣滚过山谷。三道木闩次第弹开，震落的百年积尘在月光里像一场小雪。',
            '「响了……」山下隐隐传来修士们的呜咽与欢呼。可你听得出，这声钟鸣的尾音里，还缠着一缕不属于自己的圣歌。',
            '（顶层的门开了。那缕圣歌的主人，在上面等你。）',
          ]);
        } else {
          fx({ hp: -2 });
          await say([
            '钟声乱了。三口钟发出刺耳的不谐和音，一股钝痛顺着耳骨撞进颅腔。（生命 -2）',
            '钟绳上的木牌轻轻摇晃。次序——谁第一个走？谁最后归来？',
          ]);
        }
      } },
    ],
  },

  bell_top: {
    name: '钟楼 · 顶层', ch: '第六部 · 暮钟之印', sub: '小节三 · 钟楼之夜', bg: BG + 'lighthouse.svg', mood: 'dark',
    desc: [
      '顶层的钟室四面漏风，暮钟之印就悬在大钟的钟梁上，幽蓝的光随着一声不存在的钟鸣缓缓荡漾。',
      '一道黑袍的身影悬在钟舌旁，像停驻在琴弦上的一只蛾。她没有脸——只有一道唱着圣歌的、缓缓开合的缝。',
    ],
    brief: '四面漏风的钟室顶层。暮钟之印悬在钟梁上，黑袍的圣咏者悬在钟舌旁。',
    exits: { down: { to: 'bell_lower', label: '退回钟室下层', flavor: '你退下梯子。身后的圣歌断了一瞬，又续上了。' } },
    actions: [
      { text: '直面圣咏者夜祷，重燃暮钟之印', when: () => !S.flags.rune6, run: async () => {
        await say([
          '圣咏者缓缓转过身来。她原本该有一副怎样的面孔，已经没人记得——如今那道开合的缝里，只流出一层又一层的圣歌。',
          '「小师弟。」她的声音像许多口钟同时开口，「安瑟姆教过你吗？钟是大地的心跳。心跳，只需要一个节拍器——我。」',
          '「影主答应过我：从此以后，全大陆只剩下我的节拍。一声，一声，永远……不用数到头。」',
          '「她原本是守钟人里最好的嗓子。」山下，安瑟姆的声音混着晚课的诵经声传上来，「可惜她等不及钟声自己停——想替大地按下休止符。」',
          '「师妹，」老修士的声音哽了一下，「把最后一课，讲完。」',
        ]);
        const r = await battle('chantress');
        if (r !== 'win') return;
        await say([
          '咏叹声碎在半空。黑袍一层层垂落，暮钟之印从钟梁上缓缓升起，幽蓝的光落进你的掌心——它认的不是嗓音，是「替长夜计时的人」。',
          '六枚符文在行囊里遥遥辉映。当夜，暮钟百年来自鸣了第一次：一声，一声，稳得像大地重新找回了心跳。',
          '远处的天际线上，血月旁边悄悄洇开了一点鱼肚白。',
        ]);
        fx({ item: 'rune6', maxHp: 7, rep: 2, flag: ['rune6', 'part6'] });
        checkpoint();
        if (S.corruption >= 1) {
          await chapterEnd('ending_bell_back', '钟声的背面', 'THE OTHER SIDE OF THE BELL', [
            '修士们的晚课重新开嗓，钟声稳稳地荡着。所有人都说，这是修道院百年来最亮的一夜。',
            '只有你知道，钟声对你有一层听不懂的低音。你数着钟声入睡——而梦里有什么东西，正耐心地、一声一声，替你数着下一声。',
            '行囊深处，来自深渊的东西们轻轻应和着钟鸣。它们在学这个节拍。它们记性很好。',
          ]);
        } else {
          await chapterEnd('ending_bell_warden', '晚祷的回声', 'ECHO OF VESPERS', [
            '修士们的晚课重新开嗓。安瑟姆把你们的名字一笔一划写进《守钟人名录》，写完，合十，长揖到地。',
            '「一千三百年，钟没白哑。」老人笑着说，「它这一觉，又稳了。」',
            '卡雅倚着门框听了很久，忽然说：「这个调子……跟退潮的海一个样。」',
          ]);
        }
        quest('q_abyss');
        await say([
          '次日清晨，安瑟姆领你们登上钟楼最高的一层。极北的天际，黑曜石的棱线浮在雾海之上，血色的光一跳一跳。',
          '「影渊。」艾莉娅轻声说，「七印之末。蓉婆婆念过的——『唯第七印，不在途中，在底下。』」',
          '「深渊之印不是锁，」安瑟姆望向北方，浑浊的眼睛里第一次露出近乎敬畏的神色，「它是根。想把它拿回来的人，三百年里排到了天边。」',
          '「钟声替你们送行。」老人合十，「去吧。把正文念完。」',
          '【第六部 · 暮钟之印 · 完】——从修道院山门向北，便是影渊谷口。',
        ]);
        checkpoint();
      } },
    ],
  },

  /* ==================== 终部 · 深渊之印 ==================== */

  abyss_mouth: {
    name: '影渊 · 谷口', ch: '终部 · 深渊之印', sub: '终章前夜 · 影渊谷口', bg: BG + 'fortress.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '山道在暮色尽头断了——大地在这里裂开一道深不见底的伤口。',
      '黑曜石铸成的要塞攀附在裂谷边缘，像一只趴在伤口上饮血的蛛。血月悬在尖塔之上，鸦群绕塔三匝。',
      '要塞唯一的正路，是一座悬在雾海之上的独石桥。桥头立在暮色里，像世界尽头的界碑。',
    ],
    brief: '裂谷边缘。血月下的黑曜石要塞，雾海之上横着唯一的独石桥。',
    rest: { cost: 0, label: '在岩檐下背风处休整' },
    exits: {
      s: { to: 'abbey_gate', label: '回暮色修道院', flavor: '你退回南面的黑崖栈道。钟声在身后一声一声，稳稳地送行。' },
      n: { to: 'stone_bridge', label: '北 · 独石桥', flavor: '你踏上独石桥。桥板之下的雾海深处，隐约有巨大的东西游弋。' },
      w: { to: 'cliff_channel', label: '西 · 崖壁暗渠', flavor: '你拨开崖壁上的枯藤——渠口黑黢黢的，渠水声从很深的地方传上来。' },
    },
    onEnter: async () => {
      if (!ev('abyssArrive')) return;
      await say([
        '谷口的风是黑的。你们贴着岩檐站定，谁都没有先开口。',
        '血月把三个人的影子拉得很长。良久，索恩把斧头从背上取下来，往掌心啐了口唾沫：「三百年前，俺们氏族的人没能走到这儿。今天，俺替他们走完。」',
        '艾莉娅展开地形记忆：「入口有三：强攻独石桥；绕行西侧，走当年工匠排水的暗渠——影蚀工令里挖的那条『路』，应该已经通了；或者……请援军。」',
      ]);
    },
    npcs: {
      raven: {
        name: '渡鸦', img: CH + 'raven.svg', role: '来历不明的行商',
        talk: async () => {
          if (ev('ravenAbyss')) {
            await say([
              '岩檐的阴影里，一点火柴似的光亮了一下——渡鸦靠在石壁上，就着血月擦他的短杖。',
              '「别紧张，」他头也不抬，「影渊脚下不做买卖。做买卖的都活不到结账。」',
              '他抬起兜帽，朝要塞的方向偏了偏：「白石城离这儿七百里，女王陛下的亲卫昼夜不解甲——她登基那天就等着这一天。差一封信。」',
            ]);
            const i = await choose([
              { text: '托他送信去白石城——请莉安娜女王发兵' },
              { text: '婉拒——这一战，不必劳师动众' },
            ]);
            if (i === 0) {
              setFlag('alliance');
              fx({ rep: 1 });
              await say([
                '你把信塞进他手里。渡鸦掂了掂，忽然笑了——你第一次听见他笑。',
                '「这一趟，不算买卖。」他把信贴身收好，短杖往地上一顿，「算俺入伙。三天后，让影渊听听白石城的号角。」',
              ]);
            } else {
              await say([
                '「随你。」渡鸦把短杖收进斗篷，「买卖人只管把货送到——这一单，算俺送你们的。」',
                '他朝要塞努努嘴：「里头那位三百年没输过。想好了再进去。」',
              ]);
            }
          }
          await shopLoop('「影渊脚下的最后一单，」渡鸦把货箱摊开，「护符和药水，比后悔便宜。」', null, ['potion', 'potion_big', 'amulet', 'torch']);
        },
      },
    },
    actions: [
      { text: '远眺要塞的布防', when: () => !S.flags.abyssScout, run: async () => {
        setFlag('abyssScout');
        await say([
          '你们轮流伏在岩檐后观察。桥头立着一名按剑的守将；要塞正门的巨门上没有锁，只有一只睁开的眼睛浮雕；内庭的紫焰灯柱围出一圈空场——主堡的甬道，就从灯柱尽头上去。',
          '「守备比传说里薄，」艾莉娅皱眉，「影蚀的精锐都抽去了各印的战场。他不怕——或者说，他希望我们来。」',
        ]);
      } },
    ],
  },

  stone_bridge: {
    name: '影渊 · 独石桥', ch: '终部 · 深渊之印', sub: '终章前夜 · 影渊谷口', bg: BG + 'fortress.svg', mood: 'dark',
    desc: [
      '独石桥悬在雾海之上，桥面窄得只容两人并行。桥板之下，雾海深处有巨大的东西缓缓游弋，每一次摆尾，桥身都轻轻一颤。',
      '桥头，要塞的号角一声接一声，像在替谁数着进门的步子。',
    ],
    brief: '悬在雾海上的独石桥。桥下的巨影缓缓游弋，桥头守将按剑而立。',
    exits: {
      s: { to: 'abyss_mouth', label: '退回谷口', flavor: '你退回谷口的岩檐下。桥身的轻颤隔着雾海传过来，一下，又一下。' },
      n: {
        to: 'fortress_court', label: '北 · 要塞内庭', flavor: '你踏过桥心。要塞的大门在头顶洞开，甬道两侧的紫焰灯一盏接一盏地熄灭，像是在为谁让路。',
        req: s => s.flags.bridgeClear, lock: '桥头守将的黑剑还横在桥心',
      },
    },
    onEnter: async () => {
      if (S.flags.bridgeClear) {
        await say(['断成两截的黑剑还插在桥板缝里。雾海深处，那道巨影绕开了你们走过的桥面。']);
        return;
      }
      if (S.flags.gameClear) return;
      await say([
        '你们踏上独石桥。桥板之下的雾海深处，隐约有巨大的东西游弋。',
        '桥头，一名影蚀武士自阴影中立起，黑剑出鞘的声音像骨头折断。它背后，要塞的号角已经吹响。',
        '「也就是说，」索恩活动着脖子，咔咔作响，「得在援军来之前先砸开这扇门。爽利！」',
      ]);
      const r = await battle('bridgeguard');
      if (r !== 'win') return;
      setFlag('bridgeClear');
      fx({ rep: 1 });
      await say([
        '守将的黑剑断成两截，它的躯体像退潮的黑水一样从铠甲里泻出。要塞大门在你们面前轰然洞开——里面所有的号角同时哑了。',
        '「哈哈！」索恩一脚踹在门板上，「听见没？里面那位怕了！」',
      ]);
      checkpoint();
    },
  },

  cliff_channel: {
    name: '影渊 · 崖壁暗渠', ch: '终部 · 深渊之印', sub: '终章前夜 · 影渊谷口', bg: BG + 'cave.svg', mood: 'dark',
    desc: [
      '暗渠的入口藏在崖壁的枯藤后，渠水冰得刺骨。头顶的石缝间漏下紫色的微光，把水面染成一节一节的暗紫。',
      '渠壁上留着崭新的凿痕——影蚀工兵的手艺。这条「路」，是他们替谁挖的，如今倒方便了你们。',
    ],
    brief: '崖壁枯藤后的暗渠。冰冷的渠水里，凿痕崭新，紫光一节一节。',
    exits: {
      e: { to: 'abyss_mouth', label: '退回谷口', flavor: '你从枯藤后退出暗渠。谷口的风把渠水声吹散了。' },
      n: {
        to: 'fortress_court', label: '北 · 要塞内庭', flavor: '你涉过最后一段冰水，从废弃水车房的井口攀出——正好落进要塞内庭的阴影里。',
        req: s => s.flags.channelClear, lock: '暗渠还没走通',
      },
    },
    onEnter: async () => {
      if (S.flags.channelClear) return;
      if (S.flags.gameClear) return;
      await say([
        '你们涉水而行，冰水没过腰际。行至半程，暗渠分出两条支洞：主洞更宽，但水声轰鸣，易被察觉；侧洞狭窄低矮，隐约有人工开凿的痕迹——也许通往库房。',
      ]);
      const i = await choose([
        { text: '走主洞，摸黑快速通过' },
        { text: '钻侧洞，一探究竟' },
      ]);
      if (i === 1) {
        fx({ item: ['potion', 'potion'], gold: 15 });
        await say([
          '侧洞的人工痕迹越来越明显——凿痕、车轮辙印、散落的矿镐。这正是影蚀工兵挖了半年的支线。',
          '洞室尽头堆着几口没来得及运走的货箱。艾莉娅用杖尖挑开一口：补给！琥珀色的药水瓶在紫光下闪着光，钱袋上还系着未拆的封条。',
          '（获得：生命药水 ×2，金币 +15）',
          '就在合上箱盖的一瞬，头顶传来铁栅滑动的声音——有人把井口盖上了。',
          '「绕过去。」艾莉娅低声说，「别管是谁。」',
        ]);
      } else {
        await say([
          '你们贴着渠壁在黑暗中疾行。每一声水响都被轰鸣的瀑布声吞没。',
          '唯一的意外是一只受惊的盲眼鱼撞在你脸上，惊出你一身冷汗——除此之外，顺利得不像话。',
        ]);
      }
      setFlag('channelClear');
      await say([
        '暗渠的尽头，你们从一间废弃水车房的井口攀出，正好落在要塞内庭。紫焰灯柱的光在头顶摇晃——你们已经站在影渊的肚子里了。',
      ]);
      checkpoint();
    },
  },

  fortress_court: {
    name: '影渊要塞 · 内庭', ch: '终部 · 深渊之印', sub: '终章前夜 · 影渊谷口', bg: BG + 'fortress.svg', mood: 'dark',
    checkpoint: true,
    desc: [
      '要塞内庭。紫焰灯柱围出一圈空场，尽头是通往主堡的巨门——门上没有锁，只有一只睁开的眼睛浮雕。',
      '灯柱的影子安安静静。整座要塞的守军像是被谁撤空了——只剩巨门之后，某种缓慢的、黏稠的声音，像心跳，又像很多年前的哭声。',
    ],
    brief: '紫焰灯柱围出的内庭。尽头主堡巨门上的眼睛浮雕，静静地「看」着来人。',
    rest: { cost: 0, label: '在紫焰灯下扎营' },
    exits: {
      s: {
        to: 'stone_bridge', label: '南 · 独石桥', flavor: '你沿来路退回独石桥。雾海的风从桥面下灌上来，凉得像一句劝。',
        req: s => s.flags.bridgeClear, lock: '得先从正门杀进来，才谈得上退路',
      },
      w: {
        to: 'cliff_channel', label: '西 · 崖壁暗渠', flavor: '你从内庭西侧的水车房钻进暗渠。冰水的声音在黑暗里格外清楚。',
        req: s => s.flags.channelClear, lock: '这一侧没有门——除非你从暗渠来',
      },
      up: { to: 'throne_hall', label: '上 · 主堡王座厅', flavor: '你推开通往主堡的巨门。那只眼睛浮雕忽然转动，正对着你——' },
    },
    onEnter: async () => {
      if (!ev('courtArrive')) return;
      await say([
        '你们在灯柱的阴影里稍作休整。艾莉娅把最后一瓶药水塞进你手里：「待会儿不管发生什么——活着回来喝掉它。」',
        '索恩往斧刃上啐了口唾沫，用袖子把斧面擦得雪亮：「小子，俺们氏族的规矩：见王座之前，先把斧头擦亮。」',
        '他看了你一眼，「不是给你擦的。是给里头那位看的——告诉他，来的是正主。」',
        '卡雅把鱼叉横在膝头，仰头望着主堡：「俺阿公说过，海底最深的地方，浪反而平。上头那位，现在就平得很。」',
      ]);
    },
    actions: [
      { text: '巨门前的最后一议', when: () => !S.flags.courtTalk, run: async () => {
        setFlag('courtTalk');
        if (S.flags.lore) {
          await say([
            '巨门近在咫尺。艾莉娅忽然按住你的手：「安瑟姆的话，还记得吗？七印是七份遗嘱——先王们没想锁他一辈子，他们想教后来的人怎么『结束』这一切。」',
            '「到了王座前，把这句话，替老修士带到。」她看着你，「他等这句正文，等了三百年。」',
            '索恩把斧头扛正：「俺不懂遗嘱。俺只知道——斧头擦亮了，正主就该进门了。」',
          ]);
        } else {
          await say([
            '巨门近在咫尺。艾莉娅望着那只眼睛浮雕，轻声说：「不管里面那位说什么——记住，我们为什么走到这里。为塞德里克，为守殿人，为所有在影渊下睡着的名字。」',
            '索恩把斧头扛正：「俺不懂大道理。斧头擦亮了，正主就该进门了。」',
            '（你隐约觉得，关于七印，还差一门课没上完——暮色修道院里，也许有人能补上这一课。）',
          ]);
        }
      } },
    ],
  },

  throne_hall: {
    name: '影渊 · 王座大厅', ch: '终部 · 深渊之印', sub: '终章 · 王座与黎明', bg: BG + 'throne.svg', mood: 'dark',
    desc: [
      '王座大厅比想象中更高，高到烛台只是星点。黑曜王座盘踞在大厅尽头，紫焰在盆中静静燃烧。',
      '他坐在那里。像已经坐了三百年，也像刚刚落座。黑甲上流转着极淡的紫光，双角如断折的王冠。',
    ],
    brief: '高得望不见顶的王座大厅。黑曜王座上，那道身影静静看着你。',
    exits: { down: { to: 'fortress_court', label: '退回内庭', flavor: '你退出王座大厅。紫焰在你身后一盏盏重新亮起，像目送。' } },
    onEnter: async () => {
      if (S.flags.gameClear) {
        await say(['王座空着。紫焰盆里的火安安静静地烧着——像在等一个不再回来的人。']);
        return;
      }
      if (ev('throneReached')) {
        // —— 门上的眼睛 ——
        await say([
          '你把手放上巨门。门后没有锁孔，那只眼睛浮雕忽然转动，正对着你——',
          '「凡人……」',
          '声音直接在你的颅骨里响起，绕过耳朵，温润得像一位旧识：「你走了一路，杀了一路，痛了一路。可曾想过——是谁把这些『命运』放在你路上的？」',
          '「王座空悬三百年。汝之剑、汝之痛、汝之怒……皆为它而生。汝亦渴望王座否？」',
          '索恩的呼吸粗重起来。艾莉娅的指尖抵在你后背，微凉。那只眼睛在等你回答。',
        ]);
        const a = await choose([
          { text: '「王座底下埋的都是尸骨。——滚出我的脑子！」拔剑抵住眉心，斩断声音' },
          { text: '……那个声音说的，好像有几分道理。再听一句' },
        ]);
        if (a === 0) {
          fx({ rep: 1 });
          await say(['剑锋贴上眉心，金光炸开——那只眼睛「嘶」地眯起。声音退回了门后。你推门而入。']);
        } else {
          fx({ corruption: 1, flag: 'darkTouched' });
          await say([
            '你听了下去。那声音像一双温热的手，把你一路的疼都轻轻捧了起来。',
            '……你回过神时，手已经搭上了门环。掌心里残留着一点不属于你的暖。',
            '（黑暗侵蚀 +1。有些声音，听过一次，就会一直听下去。）',
          ]);
        }
        // —— 莫格拉斯 ——
        await say([
          '巨门无声洞开。',
          '王座大厅比想象中更高，高到烛台只是星点。黑曜王座盘踞在大厅尽头——他坐在那里，双角如断折的王冠，那双眼睛抬起来的瞬间，你听见自己的心跳漏了一拍。',
          '「晨曦的碎渣，和一个矮人。」他的声音是很多种声音的叠影，「一千年前，也有七个人带着这样的光走进来。他们管自己叫英雄。」',
          '「——他们烧了我半座江山，又把自己的命灌进七枚石头里，把这片大陆锁进漫长的黄昏。后来者奉他们为王，管我叫暗影。」',
          '他缓缓前倾：「孩子，你以为来的路上，那些死去的人、流掉的血、被夺走的灯火，是谁的『功绩』？锁住我的锁链，一头拴着大陆——另一头，拴着所有凡人的命。」',
          '「我叫莫格拉斯。我只有一个要求：王座之下，唯力为真。把这句话，嚼碎了再反驳我。」',
        ]);
        const b = await choose([
          { text: '「不需要反驳——你的时代在三千年前就结束了。」拔剑！' },
          { text: '「……唯力为真。若我帮你坐上那个位置，你给我什么？」' },
          { text: '「你怕的不是我们。你怕晨曦之约——七印不是锁，是遗嘱。先王们留了后手，我知道那是什么。」', req: s => s.flags.lore, lock: '需要真正听懂七印的传说（暮色修道院的课）' },
        ]);
        if (b === 1) {
          // —— 交易 ——
          await say([
            '王座上的黑影笑了。那笑声不响，却让整座大厅的紫焰矮了三寸。',
            '「聪明的孩子。」他抬起手——黑甲之下，掌心向上，与水池中那个戴王冠的你，一模一样的姿势。',
            '「你给我开锁，我给你世界。晨曦也好深渊也好，不过是旧人们的牌位。坐上来，{name}。名字会被遗忘，力量永世长存。」',
            '索恩的斧头横过来一半，被你抬手拦下。艾莉娅在唤你的名字，声音很远。',
            '那只手在你面前摊开。掌心里，映着你自己的倒影——头戴王冠。',
          ]);
          const c = await choose([
            { text: '后退，拔剑：「梦里什么都有。——可我醒着。」' },
            { text: '握住那只手' },
          ]);
          if (c === 1) {
            await ending('ending_corrupt', '暗影新王', 'THE NEW SHADOW THRONE', [
              '你握住了那只手。',
              '黑甲合拢的声音像潮水漫过头顶。冷，然后不再冷——因为温度这种东西，也是活人的计量。',
              '莫格拉斯从王座上站起，退开一步，朝你躬身——不是臣服，是让座。三百年了，他等这个动作等了三百年。',
              '「晨曦符文？」他随手从你怀里拈出那枚符文，掂了掂，「拿去堵影渊的门，正好。」',
              '你坐上王座。黑曜石出乎意料地温热，像终于回家。',
              '「第一道王令？」他问。',
              '你想了很久。想起塞德里克的炉火，艾莉娅的星辉，索恩的斧刃，卡雅的潮路，想起白石城的鸽子和黑鸦旅店的酒。',
              '「把那三个还活着的脚夫放了。」你说，「黑鸦旅店的酒钱，挂我账上。」',
              '莫格拉斯大笑，笑声让整座影渊的紫焰涨了三寸。',
              '大陆的历史书上，这一页被后世反复涂改：有人说那一天暗影陨落了；有人说暗影只是换了王座。',
              '只有黑鸦旅店的独眼店主知道真相——每年同一夜，会有一枚金币从门缝里滚进来，准时得像涨潮。',
              '他把金币串成串，挂在乌鸦木牌旁边，从不花掉。',
              '——暗影新王，终。（有些王座，坐上去才看清它是什么。）',
            ]);
            return;
          }
          fx({ rep: 1 });
          await say(['你后退半步，剑尖抬起。那只手慢慢收了回去，叠影般的声音里听出一丝赞许：「醒着的人……三百年没来过了。那就——拿剑来说。」']);
        } else if (b === 2) {
          // —— 遗嘱 ——
          setFlag('righteous');
          await say([
            '他第一次真正地停住了。叠影般的声音沉了半拍：「……那本书，早就烧了。」',
            '「烧了目录，」你向前一步，「烧不了正文。七印不是七把锁——是七份遗嘱，莫格拉斯。晨曦教人开始，星辰教人看清，海洋教人退让，丰收教人积蓄，战争教人止损，暮钟教人收梢。」',
            '「先王们没想锁住你一辈子，他们想教会后来的人怎么『结束』这一切。你怕的是这个：有人真的读懂了，然后走进来——不为封印，为了终结。」',
            '艾莉娅在你身后扬起法杖，星辉如瀑。索恩的斧刃映着紫焰。卡雅的鱼叉斜指王座，稳得像退潮时的海。',
            '莫格拉斯缓缓站起。黑甲相撞的声音像遥远的雷。「很好。」他说，「那就让正文，来见一见遗嘱。」',
            '（安瑟姆的课在这一刻抵达了王座——你听见了大厅深处，锁链松动的第一声轻响。战斗开始时，莫格拉斯会有一瞬的失神。）',
          ]);
        }
        await startFinalBattle(b === 2);
      } else {
        await say(['莫格拉斯坐在王座上，像从未动过。叠影般的声音铺满大厅：「回来得比俺想的快。」索恩在旁边小声纠正：「比『俺们』想的快。」']);
        await startFinalBattle(!!S.flags.righteous || !!S.flags.alliance);
      }
    },
    actions: [
      { text: '拔剑，直面暗影君主莫格拉斯', when: () => !S.flags.gameClear, run: async () => {
        await startFinalBattle(!!S.flags.righteous || !!S.flags.alliance);
      } },
    ],
  },

};

/* ---------------- 终部决战：王座之战与结局裁定 ----------------
 * bonus=先手（安瑟姆的「遗嘱」课让莫格拉斯失神 / 白石城援军佯攻牵制）。 */
async function startFinalBattle(bonus) {
  const r = await battle('mograth', { bonus: bonus ? 1 : 0 });
  if (r === 'sacrifice') {
    await say([
      '晨光漫过大厅时，你在王座阶前醒来——像被谁轻轻放回来的。',
      '（晨曦之痕认得祭品，但没有收下你。全队回复。）',
    ]);
    S.hp = S.maxHp;
    ensureTeam();
    for (const id of Object.keys(S.team)) { S.team[id].hp = allyMaxHp(id); S.team[id].sp = allySpMax(id); }
    await ending('ending_sacrifice', '晨曦之殉', 'MARTYR OF THE FIRST LIGHT', [
      '你的血顺着剑脊流上符文。金光陡然明亮——它认出了这不是武器，是祭品。',
      '「住手——！」艾莉娅的呼喊很远。索恩伸手来抓你，抓到一片光。卡雅的鱼叉脱手飞来，插在你脚边，叉尾还在颤。',
      '你笑着朝他们摇头。有些账要有人来平：塞德里克的一杯酒，矮人氏族的三百年，半精灵被围困的黄昏，和所有在影渊下睡着的名字。',
      '「晨曦之痕本来就不是兵器。」你想，「它是黎明。而黎明——从来都是有人熬过长夜换来的。」',
      '光吞没了一切。',
      '——多年以后，圣殿的第七座祭坛前立着一座无名的石像：一个把剑插进大地、迎着朝阳摊开手心的旅人。',
      '石像的手心里，每年夏至的清晨，会准时落进第一缕阳光。',
      '艾莉娅成为新的守殿贤者。她在典籍里为你写下的谥号只有四个字：',
      '「晨曦本人」。',
      '——晨曦之殉，终。',
    ]);
    return;
  }
  if (r !== 'win') return;
  await say([
    '黑甲崩解。莫格拉斯的身影在紫焰中一层层变淡，退回王座深处，只剩那双眼睛，静静看着你走近。',
    '「……好。」叠影般的声音散了，「正文，念完了。」',
    '黑曜王座之上，三百年来的第一缕晨光，落了下来。',
  ]);
  if (S.corruption >= 1) {
    await ending('ending_dusk', '灰烬之约', 'THE ASHEN COVENANT', [
      '符文的光劈开莫格拉斯的黑甲——却在触及他的一瞬，被你自己身体里的那缕黑暗轻轻「扶」住了。',
      '你愣住。莫格拉斯没有。他望着你，像望着镜子，然后笑了。',
      '「原来如此。」他说，「原来它选择了你，像我当年。」',
      '黑甲崩解。莫格拉斯的身影在紫焰中变淡、后退，最终化作一缕黑烟渗入影渊最深处——临走前，他向你微微颔首，像国王致意对手，更像先辈致意继承者。',
      '「王座等你。不急。」',
      '封印重合。紫焰熄灭。所有人都说，影渊之战大获全胜。',
      '只是你再也没有睡过一个完整的觉。左手袖子里，那缕黑暗偶尔醒来，轻轻搏动，像第二颗心脏。',
      '而影渊最深处，有什么东西在耐心地、一个字一个字地，教会你听懂它的低语。',
      '索恩为你擦亮斧头。艾莉娅为你斟满酒。卡雅替你守着夜。他们都说，英雄不负众望。',
      '你在笑。你也在听。',
      '——灰烬之约，终。（带着「侵蚀」战胜影主，会有这个故事——未完的故事。）',
    ]);
  } else if ((S.items.runeWeak || 0) > 0) {
    await ending('ending_watcher', '守夜人之誓', 'THE OATH OF THE WATCHER', [
      '黯淡的符文在你剑上烧出一道残缺的黎明——但它终究，烧起来了。',
      '莫格拉斯在光中崩解、重凝、再崩解，最终化作一道黑烟遁入影渊最深处。封印没有修复，只是重新锁上了大半。',
      '「还会再见，孩子。」黑烟里传出他最后的低语，听不出威胁，倒像一句约定，「把符文修完整。到那天，我们再分高下。」',
      '影渊重归寂静。你带着残缺的符文回到圣殿，索恩把它嵌进第一祭坛——火苗摇曳，但没有熄。',
      '「残缺就残缺，」矮人拍拍你的肩，「俺们守着它，直到有人补全那一角。」',
      '从此艾尔多兰有了一支新的誓言团：守夜人。宣誓者不问出身，只带一样东西上山——一颗记着那场战斗的心。',
      '卡雅把家传的潮路图捐给了誓言团——影渊的每一条暗渠，图上都画着。',
      '第一任守夜人团长的名字，刻在圣殿门口：{name}。',
      '影渊深处，某种巨大的东西在沉睡中翻了个身。——但那是后话了。',
      '——守夜人之誓，终。',
    ]);
  } else {
    await ending('ending_dawn', '破晓之光', 'THE LIGHT OF DAWN', [
      '晨曦符文在你的剑上炸开成黎明。',
      '紫焰熄灭时没有轰鸣，只有一声悠长的、如释重负的叹息。莫格拉斯的黑甲一片片剥落，像退潮。最后一刻，那双眼睛里没有恨——他望着晨光，像望着一个迟到三百年的黎明。',
      '「先王的正文……」他的声音散在风里，「原来写到这一页了。」',
      '七印的光柱自影渊升起，照亮半个大陆的清晨。井水清了，乌鸦散了，孩子们第一次听说「影渊」，只是当作山那边的一个地名。',
      '索恩回到圣殿重燃了七坛火，铁须氏的钟声三百年后再次响起；艾莉娅把你的名字写进了《符文新典》的第一页——不是封印的记录，而是『结束』的方法；卡雅把家传的潮路图捐给了新的守夜人。',
      '至于你，{name}——',
      '清晨的酒馆里，有流浪剑客听说你的故事后追问：那个早晨，符文之王坐在哪里？',
      '「他没坐在哪儿，」酒保擦着杯子笑，「他坐在门槛上，把靴子倒在晨光里晒着。王座么——听说他顺手把王座搬去堵了影渊的门。」',
      '——破晓之光，终。',
    ]);
  }
  checkpoint();
}

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
    id: 'cairn',
    when: () => !S.flags.part1,
    intro: '前方岔口垒着一座半人高的石堆，路过的人各添一块石头，垒了几十年——每一块都被人摩挲得发亮。',
    run: async () => {
      await say([
        '你弯腰捡了块石头，学着前人的样子放上去。石堆微微一晃，稳住了。',
        '不知道为什么，心里那点赶路的慌，像是也被这一块石头压住了。（斗气 +1）',
      ]);
      fx({ sp: 1 });
    },
  },
  {
    id: 'mare',
    when: () => !S.flags.part1,
    intro: '路边的灌木里忽然窜出一匹驮马，鞍具还全，见了人又惊又喜地打起响鼻——它主人怕是凶多吉少。',
    run: async () => {
      const i = await choose([
        { text: '上前安抚它，翻看鞍袋' },
        { text: '怕它受惊踢人，远远绕开' },
      ]);
      if (i === 0) {
        await say([
          '你摊开手掌慢慢凑近。老马嗅了嗅，忽然把脑袋抵进你怀里蹭——它认得人的温度。',
          '鞍袋里是几包染料和一小袋金币。染料泡了水，金币还响。你取走金币，把染料原样捆好，牵着它走到岔路口，朝有人烟的方向拍了拍它的脖子。',
          '它小跑几步，又回头望了你一眼，才消失在路尽头。（金币 +4）',
        ]);
        fx({ gold: 4 });
      } else {
        await say([
          '你贴着路基另一侧绕开。走出很远，身后还传来一声长长的、像哭的马嘶。',
          '你加快了脚步——这世道，先顾好自己的人，才有余力顾别的。',
        ]);
      }
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
    id: 'tideglass',
    when: () => S.flags.part3,
    intro: '退潮的滩线上，一段浮木旁卧着一只封着蜡的细颈瓶，瓶里卷着一张油纸笺。',
    run: async () => {
      const i = await choose([
        { text: '拾起瓶子，读一读油纸笺' },
        { text: '把它放回滩线原处' },
      ]);
      if (i === 0) {
        fx({ gold: 2, sp: 1 });
        await say([
          '蜡封一挑就开。油纸笺上是一笔稚拙的字：「阿爹出海第七天，平安。妹替他还愿。」——是一封没能寄出的报平安的信。',
          '你把纸笺照原样卷好塞回瓶里，往海的深处轻轻送了一程，又在浮木边拾了两枚被浪磨圆的旧钱。（金币 +2，斗气 +1）',
        ]);
      } else {
        await say(['你把瓶子扶正，让蜡封朝着海。有些信，该由海自己送达。']);
      }
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
  {
    id: 'standard',
    when: () => S.flags.part4,
    intro: '路边立着一杆折断的军旗，旗面下的木杆被人削平了，像一座小小的碑。',
    run: async () => {
      await say([
        '木杆削平的截面上，密密麻麻刻满了名字——是过路人一个一个添上去的。',
        '索恩把军旗扶正，摘下头盔，敬了一个不知哪学来的军礼。艾莉娅轻声念出最近的一个名字，像是替谁记住了。（斗气 +2）',
      ]);
      fx({ sp: 2 });
    },
  },
];

/* ---------------- 队伍资料 ---------------- */
const PARTY = {
  aria:   { name: '艾莉娅·星语', img: CH + 'aria.svg', role: '半精灵符文学者' },
  thorne: { name: '索恩·铁须', img: CH + 'thorne.svg', role: '矮人守殿战士' },
  kaya:   { name: '卡雅', img: CH + 'kaya.svg', role: '潮歌湾渔家猎手' },
};
