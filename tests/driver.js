/* ============================================================
 * 冒烟测试驱动（与游戏代码同一 eval 作用域执行，直接访问 S/WORLD 等）
 * ============================================================ */

/* ---------- 选择桩：按谓词队列挑选，默认选 0 ----------
 * 队列项：数字=固定下标；字符串=文本包含匹配；函数=自定义谓词
 * （函数未命中时放回队首，本菜单走默认选 0——用于「只在特定菜单出手」的场景） */
let choiceQueue = [];
globalThis.setChoices = (...q) => { choiceQueue = q; };
choose = async opts => {
  const usable = opts.map((o, i) => ({ o, i })).filter(({ o }) => (!o.when || o.when()) && (!o.req || o.req(S)));
  const want = choiceQueue.shift();
  if (want !== undefined) {
    if (typeof want === 'number') {
      const hit = usable.find(u => u.i === want);
      if (!hit) throw new Error('选择桩：固定下标不可用 want=' + want + ' opts=' + opts.map(o => o.text).join(' | '));
      return hit.i;
    }
    if (typeof want === 'function') {
      const hit = usable.find(u => want(u.o, u.i));
      if (hit) return hit.i;
      choiceQueue.unshift(want);
      return usable.length ? usable[0].i : -1;
    }
    const hit = usable.find(u => String(u.o.text).includes(want));
    if (!hit) throw new Error('选择桩：谓词未命中 [' + want + '] opts=' + opts.map(o => o.text).join(' | '));
    return hit.i;
  }
  return usable.length ? usable[0].i : -1;
};

/* ---------- 断言工具 ---------- */
let passed = 0;
globalThis.assert = function (cond, msg) {
  if (!cond) throw new Error('断言失败：' + msg);
  passed++;
  console.log('  ✓ ' + msg);
};

/* 测试用回满：新章节开局全队满状态（聚焦流程，不测数值磨损） */
globalThis.topUp = function () {
  S.hp = S.maxHp; S.sp = S.spMax;
  ensureTeam();
  for (const id of Object.keys(S.team)) { S.team[id].hp = allyMaxHp(id); S.team[id].sp = allySpMax(id); }
};

/* ---------- 冒烟主线 ---------- */
(async () => {
  try {
    console.log('—— 序章 · 风雨之夜 ——');
    startNewGame('测试者');
    S.maxHp = 500; S.hp = 500; S.spMax = 60; S.sp = 60;   // 测试用高血量，聚焦流程而非数值
    S.exp = -1000000;                                      // 屏蔽升级弹窗，避免占用选择桩队列（升级另测）
    assert(S.gold === 20, '初始金币 20');
    assert(S.time && timeDay() === 1 && timeSlot() === 2, '时间系统：开局「第1天 · 黄昏」（8刻=1天，每移动+1刻）');

    // 小节「暮雨投宿」：集市（货郎 / 老猎户）+ 镇南古井 + 旅店地窖
    await move('grayridge_street');
    assert(!!WORLD.grayridge_street && WORLD.grayridge_street.sub === '暮雨投宿', '小节「暮雨投宿」：灰岭集市已接入');
    await WORLD.grayridge_street.npcs.hunter.talk();
    await WORLD.grayridge_street.actions.find(a => a.text.includes('怪事')).run();
    assert(S.flags.townRumor, '集市「打听镇上的怪事」：获得古井与地窖的线索');
    // 生活系统①：火把（探暗处的消耗性光源，货郎有售）
    const gPed = S.gold;
    setChoices('火把', '火把', '告辞');
    await WORLD.grayridge_street.npcs.peddler.talk();
    assert((S.items.torch || 0) === 2 && S.gold === gPed - 6, '生活道具：货郎处购入火把×2（-6金币，摸黑探暗处要用光）');
    const gWell = S.gold;
    setChoices('挑上来');
    await move('grayridge_well');
    assert(S.events.wellVisit && S.gold === gWell + 4, '新地点「灰岭古井」：打捞失落的钱袋（+4金币）');
    // 黑暗探索①：古井——光才照得出的隐藏线索
    const gWell2 = S.gold, spWell = S.sp;
    await WORLD.grayridge_well.actions.find(a => a.text.includes('井口深处')).run();
    assert(S.flags.wellGleam && (S.items.torch || 0) === 1 && S.gold === gWell2 + 3 && S.sp === spWell, '黑暗探索·古井：火把照见井底的铁箍石门（-1火把，+3金币，井底下有路）');
    await move('grayridge_street');
    await move('inn_hall');
    setChoices('愿闻其详');
    await WORLD.inn_hall.npcs.cedric.talk();
    assert(S.flags.heardLegend, '序章：听取七印传说');

    const gCellar = S.gold;
    setChoices('松砖');
    await move('inn_cellar');
    assert(S.events.cellarVisit && (S.items.potion || 0) >= 1 && S.gold === gCellar + 4, '新地点「旅店地窖」：撬开松砖得店主私藏（+4金币，药水×1）');
    // 黑暗探索②：地窖——钻进墙角的地洞
    const gCellar2 = S.gold;
    await WORLD.inn_cellar.actions.find(a => a.text.includes('地洞')).run();
    assert(S.flags.cellarHole && (S.items.torch || 0) === 0 && S.gold === gCellar2 + 3, '黑暗探索·地窖：钻进比灰岭镇还老的地道，摸出「过路的」盘缠（-1火把，+3金币）');
    await move('inn_hall');

    // 小节「子夜惊变」：夜袭（选项默认0：挥剑，必胜）
    await move('inn_room');
    assert(WORLD.inn_room.sub === '子夜惊变' && S.flags.cedricDead && S.items.shard, '小节「子夜惊变」：夜袭战胜，获得晨曦之痕');

    // 店主告别节拍
    await move('inn_hall');
    await WORLD.inn_hall.npcs.keeper.talk();
    assert((S.items.potion || 0) >= 2 && S.gold === 20 - 6 + 4 + 3 + 4 + 3 + 5 + 5, '店主告别节拍：药水×2 + 金币账（火把-6，古井/地窖明暗各+4+3，夜袭+5，店主+5）');
    // 时间与夜袭的呼应：子夜惊变把时辰拨到了深夜，次日清晨启程
    assert(timeSlot() === 3 || timeSlot() === 0, '时间系统：夜袭过后时辰在深夜/黎明（剧情拨动时间）');
    // 酒馆系统①：常客老歪与传闻（随天数/剧情刷新，讲过不再重复）
    setChoices('新鲜传闻', '新鲜传闻', '改日再聊');
    await WORLD.inn_hall.npcs.regular.talk();
    assert(S.flags.laowaiCondolence, '老歪：塞德里克常坐的椅子没人敢搬');
    const gRumor = S.gold;
    await WORLD.inn_hall.npcs.regular.talk();
    const rumorsHeard = TAVERN_RUMORS.filter(r => S.events['rum_' + r.id]).length;
    assert(rumorsHeard >= 2 && S.gold === gRumor - 4, '酒馆传闻：请老歪喝两碗听到两条新鲜事（-4金币，传闻池随天数解锁）');
    // 酒馆系统②：委托木板（每日轮换的随机委托，讨伐/采办两式）
    const poolExp = BOUNTIES.filter(b => timeDay() >= b.minDay && !(S.doneBounties || []).includes(b.id));
    const expB = poolExp[timeDay() % poolExp.length];
    await WORLD.inn_hall.actions.find(a => a.text.includes('委托木板')).run();
    assert(S.bounty && S.bounty.id === expB.id, '委托木板：揭下今日告示「' + expB.title + '」（按天轮换，已记入侧栏）');

    console.log('—— 第一部 · 晨曦之印 ——');
    // 小节一「南下古道」：荒废烽燧 + 白花泉
    await move('grayridge_gate');
    await move('south_road');
    assert(WORLD.south_road && WORLD.south_road.sub === '小节一 · 南下古道' && WORLD.south_road.wild, '新小节「南下古道」：荒废烽燧已接入（荒野路途）');
    const gBeacon = S.gold;
    await WORLD.south_road.actions.find(a => a.text.includes('烽燧残台')).run();
    assert(S.flags.beaconClimb && S.gold >= gBeacon + 6, '烽燧远眺：拾获金币，望见圣殿金顶');
    await move('white_spring');
    assert(!!WORLD.white_spring && S.events.springVisit, '新地点「白花泉」：逃难农户口中的安全泉眼（泉水养气）');
    const gSpring = S.gold;
    await WORLD.white_spring.actions.find(a => a.text.includes('卵石')).run();
    assert(S.flags.springFind && S.gold === gSpring + 4, '白花泉：泉底捞出戍卒的锈盔（+4金币）');
    // 新地点：荒石料场（白花泉南侧）——老石匠莫大
    await move('old_quarry');
    assert(!!WORLD.old_quarry, '新地点「荒石料场」：圣殿石料的出处，半座没有脸的先王像');
    await WORLD.old_quarry.npcs.mason.talk();
    assert(S.flags.masonLore, '老石匠莫大：三代没敢刻的第七王脸，托带石屑给守殿人');
    await move('white_spring');
    await move('south_road');
    await WORLD.south_road.npcs.zhao.talk();
    assert(S.flags.zhaoMet, '烽燧下赵老汉：白花泉与石桥渡的指引');
    // 新地点：石桥渡——守渡老兵吴钩
    await move('stone_ford');
    assert(!!WORLD.stone_ford, '新地点「石桥渡」：断桥、湍溪与守渡的老兵');
    await WORLD.stone_ford.npcs.wugou.talk();
    assert(S.flags.wugouMet, '吴钩：十二年行伍，渡人不收钱的营生');
    await WORLD.stone_ford.npcs.wugou.talk();
    assert(S.sideQuests.creek === 'active', '跨部任务【溪水的账】接取：上游矿坑捂浑了一整条溪（第二部兑现）');
    await WORLD.stone_ford.actions.find(a => a.text.includes('条石')).run();
    assert(S.flags.fordHelped, '石桥渡：帮忙搬条石修桥（声望+1）');
    // 林间环路（自由移动）：石桥渡 → 蕨语谷 → 隐秘小径 → 岔路口
    await move('fern_gully');
    assert(!!WORLD.fern_gully, '新地点「蕨语谷」：满谷悄悄话的溪谷');
    await WORLD.fern_gully.actions.find(a => a.text.includes('低语')).run();
    assert(S.flags.fernListen, '蕨语谷：听见最底下那句「锅还温着」（斗气+2）');
    await move('forest_deep');
    await move('forest_cross');
    await WORLD.forest_cross.actions.find(a => a.text.includes('老橡树')).run();
    await WORLD.forest_cross.actions.find(a => a.text.includes('路牌')).run();
    assert(S.flags.oakMarks && S.flags.signClean, '林中岔路：老橡树的旅人刻痕（+3金币）与路牌苔衣下的旧话');

    // 小节二「迷雾森林」：采药支线
    await move('hermit_hut');
    await WORLD.hermit_hut.npcs.margo.talk();
    assert(S.sideQuests.herb === 'active', '支线【月下香草】接取');
    await WORLD.hermit_hut.actions.find(a => a.text.includes('翻晒药草')).run();
    assert(S.flags.margoTip, '采药人小屋：帮玛戈翻晒药草（白花泉的指引，斗气+2）');
    // 新地点：林间蜂场 + 苔藓谷（支线【走失的蜂群】）
    await move('bee_clearing');
    assert(!!WORLD.bee_clearing, '新地点「林间蜂场」：大半空了的蜂箱');
    await WORLD.bee_clearing.npcs.ji.talk();
    assert(S.sideQuests.bees === 'active', '支线【走失的蜂群】接取');
    await move('mossy_dell');
    assert(!!WORLD.mossy_dell && S.events.dellVisit, '新地点「苔藓谷」：软苔洼地与「扫地白鹇」');
    await WORLD.mossy_dell.actions.find(a => a.text.includes('蜂群')).run();
    assert(S.flags.beeSwarm, '苔藓谷：收拢老栎树洞的蜂团（蜂群跟在头顶）');
    await WORLD.mossy_dell.actions.find(a => a.text.includes('白鹇')).run();
    assert((S.items.honey || 0) === 2, '白鹇引路：苔下陈年林蜜（蜂蜜×2）');
    await move('bee_clearing');
    await WORLD.bee_clearing.npcs.ji.talk();
    assert(S.sideQuests.bees === 'done' && (S.items.honey || 0) === 5, '支线【走失的蜂群】完成（+4金币，蜂蜜×3，声望+1）');
    await WORLD.bee_clearing.actions.find(a => a.text.includes('蜂箱')).run();
    assert(S.flags.hiveSeen, '蜂箱疑云：守卫蜂腿上挂着的雾苔花粉');
    await move('hermit_hut');
    await move('forest_cross');
    await move('forest_road');
    const gShop = S.gold;
    setChoices('铁剑', '告辞');
    await WORLD.forest_road.npcs.raven.talk();
    assert(S.items.iron_sword === 1 && S.gold === gShop - 15, '商店：铁剑降价至15金币并成功购入');
    const herbAct = WORLD.forest_road.actions.find(a => a.text.includes('月光草'));
    assert(herbAct && herbAct.when(), '月光草采集点（林道）出现');
    await herbAct.run();
    setChoices('传闻', '告辞');
    await WORLD.forest_road.npcs.raven.talk();
    assert(S.flags.templeHint, '渡鸦情报：圣殿古谚提示');
    // 坐骑系统①：老骡「短鬃」（赶路每三程省一刻）
    const gMule = S.gold;
    setChoices('短鬃', '告辞');
    await WORLD.forest_road.npcs.raven.talk();
    assert((S.items.mule || 0) === 1 && S.gold === gMule - 25, '坐骑入手：渡鸦处购入老骡「短鬃」（驮上行囊即乘骑，-25金币）');
    const tMule = timeTicks();
    await move('forest_cross'); await move('forest_road'); await move('forest_cross');
    await move('forest_road'); await move('forest_cross'); await move('forest_road');
    assert(timeTicks() === tMule + 4, '坐骑系统：驮骡赶路6程只耗时4刻（每三程省一刻，时辰听步幅）');

    // 新地点：鸦眠坡（林道北侧）
    await move('crow_ridge');
    assert(!!WORLD.crow_ridge && S.events.crowRidgeVisit, '新地点「鸦眠坡」：乌鸦群昼夜望着圣殿金顶');
    await WORLD.crow_ridge.actions.find(a => a.text.includes('枯桦')).run();
    await WORLD.crow_ridge.actions.find(a => a.text.includes('鸦巢')).run();
    assert(S.flags.crowClimb && S.flags.crowNest && (S.items.glassbead || 0) === 1, '鸦眠坡：枯桦瞭望 + 鸦巢亮物（+5金币，雾蓝玻璃珠）');
    await move('forest_road');

    // 新地点：雾泽湖畔（渡湖 → 湖心洲）
    await move('mist_lake');
    assert(!!WORLD.mist_lake && S.events.lakeVisit, '新地点「雾泽湖畔」：无影的老船夫讨要船钱');
    await WORLD.mist_lake.actions.find(a => a.text.includes('旧事')).run();
    assert(S.flags.lakeLore, '湖畔旧事：沉船与「欠了很久的船钱」');
    const gLake = S.gold;
    await WORLD.mist_lake.actions.find(a => a.text.includes('船钱')).run();
    assert(S.flags.lakeFare && S.gold === gLake - 5, '付讫船钱（-5金币），湖心渡口开放');
    const gIslet = S.gold;
    await move('lake_islet');
    assert(S.items.mist_pearl === 1 && S.gold === gIslet + 10, '新地点「雾泽湖心洲」：沉船遗箱（+10金币，雾泽明珠·生命上限+3）');
    assert(S.sideQuests.fare === 'active', '支线【湖底的船钱】：浅水里的七枚古铜币');
    await WORLD.lake_islet.actions.find(a => a.text.includes('古铜币')).run();
    assert((S.items.oldcoins || 0) === 1, '湖心洲：涉水拾起七枚古铜币');
    await move('mist_lake');
    await WORLD.mist_lake.actions.find(a => a.text.includes('送回湖底')).run();
    assert(S.sideQuests.fare === 'done' && S.items.reed_charm === 1, '支线【湖底的船钱】完成：苇编哨（斗气上限+3），声望+1');
    // 新地点：湖畔沼泽——渔童阿满
    await move('lakeside_marsh');
    assert(!!WORLD.lakeside_marsh, '新地点「湖畔沼泽」：芦苇私语与朽栈道');
    await WORLD.lakeside_marsh.npcs.aman.talk();
    assert(S.flags.amanTrade && (S.items.roast_fish || 0) === 2, '渔童阿满：雾蓝珠子换烤鱼×2');
    await WORLD.lakeside_marsh.npcs.aman.talk();
    assert(S.flags.amanFish && (S.items.roast_fish || 0) === 3, '湖底账清，鱼肯上钩：阿满添一条烤鱼');
    await WORLD.lakeside_marsh.actions.find(a => a.text.includes('鸭蛋')).run();
    assert(S.flags.reedEggs, '苇丛鸭蛋（生命+2，留两枚的老规矩）');
    await move('mist_lake');
    await move('forest_road');
    await move('forest_cross');
    await move('forest_deep');
    const gBefore = S.gold;
    await move('hunter_lodge');
    assert(S.gold >= gBefore + 12, '废弃猎屋：拾获金币');
    await WORLD.hunter_lodge.actions.find(a => a.text.includes('兽皮')).run();
    assert(S.flags.lodgeHide, '废弃猎屋：兽皮上的猎人记号与盐渍肉干（生命+4）');
    // 新地点：高脚瞭望塔（猎屋北侧）
    await move('watchtower_stand');
    assert(!!WORLD.watchtower_stand, '新地点「高脚瞭望塔」：猎户的独柱木塔');
    const gTower = S.gold;
    await WORLD.watchtower_stand.actions.find(a => a.text.includes('瞭望塔')).run();
    assert(S.flags.towerView && S.gold === gTower + 4, '瞭望塔顶：雾海、金顶与白石城方向的烟色（+4金币）');
    await move('hunter_lodge');
    await move('forest_deep');

    // 新地点：林中古祠
    await move('old_shrine');
    assert(!!WORLD.old_shrine, '新地点「林中古祠」：被看不见的手日日打扫的荒祠');
    await WORLD.old_shrine.actions.find(a => a.text.includes('碑文')).run();
    assert(S.flags.shrineLore, '古祠碑文：历代朝圣者划掉的答案');
    const gShrine = S.gold, hpShrine = S.maxHp;
    await WORLD.old_shrine.actions.find(a => a.text.includes('祈福')).run();
    assert(S.flags.shrineBless && S.gold === gShrine - 5 && S.maxHp === hpShrine + 2, '古祠供箱：银币祈福（-5金币，生命上限+2）');
    await move('forest_deep');
    await WORLD.forest_deep.actions.find(a => a.text.includes('月光草')).run();
    await move('dusk_camp');
    await WORLD.dusk_camp.actions.find(a => a.text.includes('月光草')).run();
    assert(S.flags.aria, '艾莉娅入队');
    assert(timeSlot() === 0 && S.kills.goblin === 1, '时间与击杀计数：夜战救人事毕睡到天明（清晨），哥布林击杀 +1（讨伐委托依赖此计数）');
    // 生活魔法：照明术「星火引灯」（探暗处的斗气光源）
    await WORLD.dusk_camp.actions.find(a => a.text.includes('照明')).run();
    assert(S.flags.lightSpell, '照明术：营火边向艾莉娅学会「星火引灯」（此后探暗处可耗2斗气照亮）');
    // 寻宝系统①：哥布林的藏宝图（战斗特殊掉落）→ 隐秘小径掘出私藏
    assert(S.items.tmap_goblin === 1, '藏宝图·其一：夜战哥布林身上搜出油布藏宝图（特殊掉落）');
    await move('forest_deep');
    const gT1 = S.gold;
    await WORLD.forest_deep.actions.find(a => a.text.includes('青石')).run();
    assert(S.flags.dug_goblin && S.items.jade_charm === 1 && S.gold === gT1 + 6 + 15, '寻宝·其一：隐秘小径叠青石下掘出哥布林私藏（守穴狼群+6金币，宝藏+15金币，合掌玉佩·生命上限+3）');
    await move('hermit_hut');
    await WORLD.hermit_hut.npcs.margo.talk();
    assert(S.sideQuests.herb === 'done', '支线【月下香草】完成（+8金币，2药水）');

    // 新地点：湮没的伐木场（黄昏营地东侧）
    await move('logger_camp');
    assert(WORLD.logger_camp && S.flags.loggerClear && S.items.logger_axe === 1, '新地点「湮没的伐木场」：荆棘蔓灵散去，取得伐木斧（攻+2）');
    await WORLD.logger_camp.actions.find(a => a.text.includes('记工板')).run();
    assert(S.flags.loggerLog, '伐木场记工板：管工留给逃难者的最后一行');
    // 新地点：浆果坡（伐木场东北，东线环路收口）
    await move('berry_thicket');
    assert(!!WORLD.berry_thicket, '新地点「浆果坡」：猎户「只摘三成」的老规矩');
    await WORLD.berry_thicket.actions.find(a => a.text.includes('浆果')).run();
    assert(S.flags.berryPick, '浆果坡：三成浆果（生命+3）');
    await move('logger_camp');
    await move('dusk_camp');

    // 小节三「符文圣殿」：朝圣古道 + 灯庭 + 大门 + 回廊 + 三试炼
    await move('pilgrim_path');
    assert(!!WORLD.pilgrim_path && WORLD.pilgrim_path.wild, '新地点「朝圣古道」：被草鞋磨温的石板路（荒野路途）');
    setChoices('递给他一瓶生命药水');
    await WORLD.pilgrim_path.npcs.tangjiu.talk();
    assert(S.flags.tangjiuHelped && !S.flags.tangjiuSplint, '唐九：药水相赠，得「晶屑不灭」的灯柱线索（声望+1）');
    await WORLD.pilgrim_path.actions.find(a => a.text.includes('长明灯')).run();
    assert(S.flags.shrineLamp, '朝圣古道：续上三百年没人点的长明灯（斗气+2）');
    await move('temple_foot');
    await WORLD.temple_foot.actions.find(a => a.text.includes('回望雾海')).run();
    assert(S.flags.stepsLook, '圣殿石阶：石阶中段回望雾海（来路与霜脊山）');
    // 新地点：荒废的果园梯田（石阶西侧）
    await move('orchard_terrace');
    assert(!!WORLD.orchard_terrace, '新地点「荒废的果园梯田」：会换方向的稻草人');
    await WORLD.orchard_terrace.actions.find(a => a.text.includes('摘些果子')).run();
    await WORLD.orchard_terrace.actions.find(a => a.text.includes('稻草人')).run();
    assert(S.flags.orchardPick && S.flags.scarecrowSeen, '果园：三百年循环的果子（生命+3）与老僧木牌');
    await move('temple_foot');
    await move('lamp_court');
    assert(!!WORLD.lamp_court && S.sideQuests.lamps === 'active', '新地点「石兽灯庭」：三对灯柱熄着，支线【复明的灯柱】接取');
    await WORLD.lamp_court.actions.find(a => a.text.includes('睁眼')).run();
    assert(S.flags.sentDown && (S.items.lamp_crystal || 0) === 1, '灯庭：被蚀石兽散作碎金（引火晶屑其一，+8金币）');
    // 新地点：香客寮遗址——老香客素娥
    await move('guest_hall');
    assert(!!WORLD.guest_hall, '新地点「香客寮遗址」：擦了半辈子的门槛');
    setChoices('婆婆，这殿');
    await WORLD.guest_hall.npcs.sue.talk();
    assert(S.flags.sueLore, '素娥：香客寮的门槛断不得');
    setChoices('熄掉的那三对灯柱');
    await WORLD.guest_hall.npcs.sue.talk();
    assert(S.flags.sueHint, '素娥点破三枚晶屑的藏处（石兽/钟腹/烛泪）');
    setChoices('讨口水喝');
    await WORLD.guest_hall.npcs.sue.talk();
    assert(S.flags.sueWater, '讨水：山泉一碗（斗气+1）');
    await WORLD.guest_hall.actions.find(a => a.text.includes('登记簿')).run();
    assert(S.flags.guestLedger, '香客登记簿：三百年空白后的「素娥，携香三炷，长住」');
    await move('lamp_court');
    await move('temple_gate');
    await WORLD.temple_gate.actions.find(a => a.text === '按下「晨曦」符文').run();
    assert(S.flags.gateOpen, '圣殿大门开启');
    await move('temple_hall');
    await WORLD.temple_hall.npcs.thorne.talk();
    assert(S.flags.stoneDelivered, '索恩：料场石屑到了——莫家的錾子与铁须家的斧子（声望+1）');
    await WORLD.temple_hall.actions.find(a => a.text.includes('经卷架')).run();
    await move('temple_cloister');
    assert(WORLD.temple_cloister && S.items.shadow_note, '新地点「圣殿回廊」：影蚀斥候战胜利，获得影蚀手记');
    await WORLD.temple_cloister.actions.find(a => a.text.includes('搜查坍塌的僧舍')).run();
    assert(S.items.old_seal === 1, '僧舍搜查：获得守殿人印戒（生命上限+4）');
    await WORLD.temple_cloister.actions.find(a => a.text.includes('壁画')).run();

    // 新地点：钟塔残基（回廊北侧）——守殿人的古钟与备用晶屑
    await move('bell_stump');
    assert(!!WORLD.bell_stump && S.events.bellStumpVisit, '新地点「钟塔残基」：哑了三百年的守殿人古钟');
    await WORLD.bell_stump.actions.find(a => a.text.includes('敲一敲')).run();
    await WORLD.bell_stump.actions.find(a => a.text.includes('钟腹')).run();
    assert(S.flags.bellStruck && S.flags.bellBelly && (S.items.lamp_crystal || 0) === 2, '钟塔残基：古钟余音（斗气+2）与钟腹私藏（引火晶屑其二，+6金币）');
    // 新地点：不冻泉石窟（钟塔残基西侧）
    await move('temple_spring');
    assert(!!WORLD.temple_spring, '新地点「不冻泉石窟」：三百年不冻的山泉');
    await WORLD.temple_spring.actions.find(a => a.text.includes('掬一捧')).run();
    await WORLD.temple_spring.actions.find(a => a.text.includes('刻字')).run();
    assert(S.flags.springDrink && S.flags.springInscribe, '不冻泉：泉养斗气（+3）与三代目铭文');
    await move('bell_stump');
    await move('temple_cloister');

    // 新地点：圣殿地宫（回廊下行）
    await move('temple_crypt');
    assert(!!WORLD.temple_crypt && S.items.rite_blade === 1, '新地点「圣殿地宫」：守墓的怨念散去，取得咏祭礼剑');
    await WORLD.temple_crypt.actions.find(a => a.text.includes('烛泪塔')).run();
    assert((S.items.lamp_crystal || 0) === 3, '地宫烛泪塔：泪壳里封存的晶屑（引火晶屑其三）');
    await move('temple_cloister');
    await move('temple_hall');
    await WORLD.temple_hall.actions.find(a => a.text.includes('勇气之门')).run();
    assert(S.flags.courageDone, '试炼一：勇气');
    setChoices('「火', '「人');
    await WORLD.temple_hall.actions.find(a => a.text.includes('智慧之门')).run();
    assert(S.flags.wisdomDone, '试炼二：智慧');
    setChoices('举杯');
    await WORLD.temple_hall.actions.find(a => a.text.includes('心灵水池')).run();
    assert(S.flags.heartDone && !S.flags.darkTouched, '试炼三：心灵（未侵蚀）');

    // 支线【复明的灯柱】：折回灯庭，嵌回三枚晶屑
    await move('temple_gate');
    await move('lamp_court');
    await WORLD.lamp_court.actions.find(a => a.text.includes('嵌回')).run();
    assert(S.sideQuests.lamps === 'done' && S.flags.lampsLit, '支线【复明的灯柱】完成：灯庭复明（生命上限+3，声望+1）');
    await move('temple_gate');
    await move('temple_hall');

    // 小节四「晨曦重燃」
    await move('temple_altar');
    await WORLD.temple_altar.actions.find(a => a.text.includes('晨曦之痕')).run();
    assert(S.flags.part1 && S.flags.thorne && WORLD.temple_altar.sub === '小节四 · 晨曦重燃', '小节「晨曦重燃」：符文重燃，索恩入队');

    // 返程销差：回黑鸦旅店交割委托（时间系统的日常闭环）
    const gBounty = S.gold, rBounty = S.rep;
    if (expB.type === 'kill') S.kills[expB.en] = (S.kills[expB.en] || 0) + expB.n;   // 模拟讨伐完成（计数机制已由哥布林战验证）
    await move('temple_foot');
    await move('pilgrim_path');
    await move('dusk_camp');
    await move('forest_cross');
    await move('south_road');
    await move('grayridge_gate');
    await move('inn_hall');
    await WORLD.inn_hall.actions.find(a => a.text.includes('委托木板')).run();
    assert(!S.bounty && S.doneBounties.includes(expB.id) && S.gold === gBounty + expB.gold && S.rep === rBounty + 1, '委托交付：「' + expB.title + '」办妥领赏（+' + expB.gold + '金币，声望+1），木板明日换新');

    // —— 系统 · 副本与地牢：井底之门（序章夜照见 → 序章后开放）——
    console.log('—— 系统 · 副本与地牢 ——');
    const dgnWell = WORLD.grayridge_well.actions.find(a => a.text.includes('铁箍石门'));
    assert(!!dgnWell && dgnWell.when(), '副本入口：灰岭古井的「井底之门」开放，下探/委托/兑换三件套已注入');
    assert(!WORLD.frost_mine.actions.some(a => a.text.includes('星髓深巷') && a.when && a.when()), '副本门槛：星髓深巷在第二部开启前不显形');
    await move('grayridge_street');
    await move('grayridge_well');
    // 支线进副本：入口掘客甃叔承接私事【井下的行灯】（目标在副本第 2 层掘客营地）
    const digger = WORLD.grayridge_well.npcs.digger;
    assert(!!digger, '副本入口有掘客驻守（未解锁时指路，解锁后承接秘窟支线）');
    await digger.talk();
    assert(S.sideQuests.duglamp === 'active', '支线【井下的行灯】在井口掘客甃叔处接取');
    const gDgn0 = S.gold, repDgn0 = S.rep;
    await dgnWell.run();   // 一路默认选 0：迎战/撬开/歇脚 + 下行，三层到底（第 2 层含掘客营地）
    assert(S.lastRun && S.lastRun.dn === 'well_depths' && S.lastRun.deepest === 3 && S.lastRun.boss && S.lastRun.cleared >= 4, '副本下探：「井底·无回廊」三层打穿、镇守者已讨（布局同日同次确定）');
    assert(S.flags.dgn_well_depths && S.gold > gDgn0, '首通结算：掘客板刻下「到底」并获重赏（金币入账）');
    assert(S.flags.dgnw_camp && S.items.old_lantern === 1, '支线兑现：第 2 层掘客营地起获甃老三的行灯（营地首访另有赏格）');
    assert((S.items.relic_shard || 0) >= 5 && S.kills.well_devourer === 1, '副本产出：渊纹残片 ≥5 枚（战斗/宝箱/据点/镇守），击杀计数入册');
    // 行灯交还甃叔，支线完结
    const pbLamp = S.items.potion_big || 0, gLamp = S.gold, rLamp = S.rep;
    await digger.talk();
    assert(S.sideQuests.duglamp === 'done' && S.gold === gLamp + 12 && S.rep === rLamp + 2 && S.items.potion_big === pbLamp + 1, '支线【井下的行灯】完成：行灯交还甃叔（+12金币，大药水×1，声望+2）');
    // 副本委托：板上只留讨伐单可接 → 复刷一趟再讨镇守 → 回板交割
    S.doneDTasks = DUNGEON_TASKS.filter(t => t.dn === 'well_depths' && t.type !== 'boss').map(t => t.id);
    await WORLD.grayridge_well.actions.find(a => a.text.includes('委托板')).run();
    assert(S.dTask && S.dTask.id === 'dgnw_boss', '副本委托：掘客板上揭下「磨牙声的源头」（讨伐单记入侧栏）');
    await dgnWell.run();
    await WORLD.grayridge_well.actions.find(a => a.text.includes('委托板')).run();
    assert(!S.dTask && S.doneDTasks.includes('dgnw_boss') && S.kills.well_devourer === 2 && S.rep === repDgn0 + 5, '副本委托交割：复刷讨镇守达成，声望入账（首通2+支线2+交割1）');
    // 残片兑换：掘客旧物
    S.items.relic_shard = (S.items.relic_shard || 0) + 6;
    const shardEx = S.items.relic_shard;
    await WORLD.grayridge_well.actions.find(a => a.text.includes('残片换')).run();
    assert(S.items.well_bell === 1 && S.items.relic_shard === shardEx - 4, '残片兑换：4 枚渊纹残片换「守井人的铜铃」（斗气上限+3）');
    // 中途撤离：石阶处带收获回撤，不判首通、不重复发赏
    setChoices(o => String(o.text).includes('▲'));
    await dgnWell.run();
    assert(S.lastRun && S.lastRun.dn === 'well_depths' && S.lastRun.deepest === 1 && !S.lastRun.boss, '中途撤离：第一层石阶处带收获回撤（最深处记第 1 层，无镇守战绩）');
    setChoices();
    await move('grayridge_street');

    await move('grayridge_gate');
    await move('south_road');
    await move('forest_cross');
    await move('dusk_camp');
    await move('pilgrim_path');
    await move('temple_foot');
    S.level = 7;   // 模拟真实周目进度（同伴属性随等级成长），后续战斗与 BOSS 均按此校验

    console.log('—— 第二部 · 星辰之印 ——');
    // 小节一「霜脊山道」：驿镇（悬赏+赌局+商店）
    await move('spur_fork');
    await move('road_town');
    await WORLD.road_town.actions.find(a => a.text.includes('悬赏告示板')).run();
    assert(S.sideQuests.bounty === 'active', '支线【隘口的匪首】接取');
    setChoices('押 5', '不赌了');
    await WORLD.road_town.npcs.dice.talk();
    const pb0 = S.items.potion_big || 0;   // 副本首通奖励可能已送过大药水，按增量断言
    setChoices('大生命', '告辞');
    const g0 = S.gold;
    await WORLD.road_town.npcs.raven.talk();
    assert(S.items.potion_big === pb0 + 1 && S.gold === g0 - 20, '商店：新增大生命药水（20金币）购入');
    setChoices('新鲜传闻', '改日再聊');
    await WORLD.road_town.npcs.boozehound.talk();
    assert(TAVERN_RUMORS.filter(r => S.events['rum_' + r.id]).length >= 3, '驿镇酒客：换一座酒馆，传闻接着讲（同池不同人）');
    doPotion('potion_big');
    assert(S.hp > 1, '新消耗品：大生命药水可回复25');
    assert(WORLD.road_town.rest.cost === 5, '驿镇客栈降价为 5 金币');
    // 隘口：战胜山匪 → 完成悬赏（默认选项0=拔剑）
    await move('spur_fork');
    await move('frost_pass');
    assert(S.flags.banditBeaten && S.items.bandit_blade, '隘口：战胜红巾匪首（战斗掉落12金币）');
    // 寻宝系统②：红巾的藏宝图（特殊掉落）→ 隘口岩缝掘出「体己」
    assert(S.items.tmap_bandit === 1, '藏宝图·其二：红巾头子皮甲夹层里搜出火漆藏宝图（特殊掉落）');
    const gT2 = S.gold;
    await WORLD.frost_pass.actions.find(a => a.text.includes('斧凿记号')).run();
    assert(S.flags.dug_bandit && S.items.guard_brace === 1 && S.gold === gT2 + 20, '寻宝·其二：白霜隘口岩缝掘出红巾体己（+20金币，戍卒的铜护腕·受伤-1）');
    await move('spur_fork');
    await move('road_town');
    await WORLD.road_town.actions.find(a => a.text.includes('悬赏告示板')).run();
    assert(S.sideQuests.bounty === 'done', '支线【隘口的匪首】完成（+18金币）');

    // 扩写：驿镇客栈也有委托木板（每日轮换，可在办/可撕）
    await WORLD.road_town.actions.find(a => a.text.includes('委托木板')).run();
    assert(!!S.bounty, '扩写：驿镇客栈委托木板——揭下今日告示（第二部亦有差事）');
    setChoices('撕掉委托');
    await WORLD.road_town.actions.find(a => a.text.includes('委托木板')).run();
    assert(!S.bounty, '扩写：委托撕掉不做，木板恢复空明');

    // 新地点：封冻的银矿（隘口西侧）
    await move('spur_fork');
    await move('frost_pass');
    await move('frost_mine');
    assert(!!WORLD.frost_mine && S.events.mineEnter, '新地点「封冻的银矿」：坑木上的影蚀「睁眼」刻痕');
    await WORLD.frost_mine.actions.find(a => a.text.includes('工具棚')).run();
    assert(S.flags.mineShed, '银矿工具棚：记账先生没发完的工钱（+3金币）');
    const gMine = S.gold;
    await WORLD.frost_mine.actions.find(a => a.text.includes('矿道深处')).run();
    assert(S.flags.mineDeep && S.gold === gMine + 7 + 15, '矿道深处：怨念散去（战斗+7金币，银砂+15）');
    // 黑暗探索③：矿坑——照明术路径（斗气光源）
    const gGleam = S.gold, spGleam = S.sp;
    await WORLD.frost_mine.actions.find(a => a.text.includes('冻壁')).run();
    assert(S.flags.mineGleam && S.gold === gGleam + 4 && S.sp === spGleam - 2, '黑暗探索·矿坑：星火引灯照见影蚀新凿的星髓凹坑（斗气-2，+4金币）');
    assert(WORLD.spur_fork.roam.byTime && WORLD.frost_mine.roam.byTime && WORLD.west_alley.roam.byTime && WORLD.lower_quarter.roam.byTime && WORLD.north_road.roam.byTime, '扩写：第二部全域夜行规则补全（岔路/矿坑/小巷/下城/官道）');
    await WORLD.frost_mine.actions.find(a => a.text.includes('水闸')).run();
    assert(S.flags.sluiceBroken && S.sideQuests.creek === 'done', '跨部任务【溪水的账】：矿坑水闸砸开，下游溪水重新流清');
    await move('frost_pass');

    // 扩写·山道：雪谷野汤 → 空营矿村（蚀变矿监）→ 何十斤（风灯+藏宝单）
    await move('snow_hot_spring');
    assert(S.events.springSoak, '扩写「雪谷野汤」：热泉拔寒（生命+2，斗气+2），界石旁热泥可疑');
    await move('frost_pass');
    await move('frost_mine');
    await move('miner_camp');
    assert(S.flags.villageClear, '扩写「空营矿村」：蚀变的矿监倒下，空村等到了收工的锣');
    await WORLD.miner_camp.npcs.he.talk();
    assert(S.flags.heMet, '扩写：老矿工何十斤——留下来看灯的人');
    await WORLD.miner_camp.npcs.he.talk();
    assert(S.items.miner_lamp === 1 && S.items.tmap_miner === 1, '扩写：何十斤交托风灯（斗气上限+2）与矿工的藏宝单');
    await WORLD.miner_camp.actions.find(a => a.text.includes('矿灯重新点亮')).run();
    assert(S.flags.campLamp, '扩写：村口矿灯重新点亮（声望+1）');
    await WORLD.miner_camp.npcs.he.talk();
    assert(S.flags.heLetters && S.sideQuests.letters === 'active', '跨部任务【矿工的家书】接取：家书与工牌捎往灰岭镇');
    // 黑暗探索装备：老矿工的风灯（戴上即亮的永久光源，暗处探索优先用它）
    equipItem('miner_lamp');
    assert(S.equip.accessory === 'miner_lamp', '黑暗探索装备：老矿工的风灯戴上即亮（永久光源，暗处优先）');
    // 支线【走失的羊羔】：牧羊坡石头 → 雪谷野汤
    await move('goat_slope');
    assert(!!WORLD.goat_slope && S.events.slopeVisit, '扩写「牧羊坡」：羊铃声与牧羊少年');
    await WORLD.goat_slope.npcs.shi.talk();
    assert(S.sideQuests.lamb === 'active', '支线【走失的羊羔】接取');
    // 寻宝·其四：藏宝单 → 汤泉界石旁热泥（守穴的霜僵）
    await move('miner_camp');
    await move('frost_mine');
    await move('frost_pass');
    await move('snow_hot_spring');
    const gT4 = S.gold;
    await WORLD.snow_hot_spring.actions.find(a => a.text.includes('热泥里挖挖看')).run();
    assert(S.flags.dug_miner && S.items.star_silver_charm === 1 && S.gold === gT4 + 6 + 15, '寻宝·其四：汤泉热泥起获矿工凑账（霜僵+6金币，宝藏+15金币，星髓银坠·会心+8%）');
    await WORLD.snow_hot_spring.actions.find(a => a.text.includes('羊羔')).run();
    assert(S.flags.lambFound, '扩写：羊羔缩在热泥窝里取暖，裹衣带回');
    // 送还羊羔（矿村→矿坑→隘口→岔路→驿镇→山神祠→牧羊坡）
    await move('frost_pass');
    await move('spur_fork');
    await move('road_town');
    await move('shrine_pass');
    assert(!!WORLD.shrine_pass, '扩写「风口山神祠」：火塘与断眉猎户');
    await WORLD.shrine_pass.npcs.huoqi.talk();
    assert((S.items.smoked_meat || 0) >= 2, '扩写：霍七见面分肉（猎户熏肉×2）');
    await WORLD.shrine_pass.npcs.huoqi.talk();
    await WORLD.shrine_pass.npcs.huoqi.talk();
    assert(S.flags.huoMine && S.sideQuests.oldfriends === 'active', '跨部任务【山里的旧友】接取：霍七惦记灰岭镇的老哈克（矿村旧事也一并道来）');
    await move('goat_slope');
    await WORLD.goat_slope.npcs.shi.talk();
    assert(S.sideQuests.lamb === 'done' && (S.items.smoked_meat || 0) >= 4, '支线【走失的羊羔】完成（+3金币，熏肉×2）');
    // 扩写：荒烽哨远眺
    await move('ridge_watchtower');
    await WORLD.ridge_watchtower.actions.find(a => a.text.includes('箭窗远眺')).run();
    assert(S.flags.watchSeen, '扩写「荒烽哨」：箭窗望见黑水护城河与喘息的星塔');

    // 小节二「官道北行」：溃兵营地（onEnter 默认选0=留银钱稳军心，得线索）
    await move('north_road');
    assert(WORLD.north_road && WORLD.north_road.sub === '小节二 · 官道北行', '新小节「官道北行」：溃兵营地已接入');
    await WORLD.north_road.actions.find(a => a.text.includes('茶棚')).run();
    assert(S.flags.teaHouseChat, '茶棚情报：白石城近况');
    assert(S.flags.deserterClue, '溃兵营地：获得「北境换防」线索');

    // 扩写：官道荒驿（野路上的焦黑驿亭）
    await move('burnt_post');
    assert(!!WORLD.burnt_post && WORLD.burnt_post.wild, '扩写「官道荒驿」：焦梁驿旗与记号石（荒野路途）');
    await WORLD.burnt_post.actions.find(a => a.text.includes('地窖')).run();
    assert(S.flags.postCellar, '扩写：荒驿地窖——驿卒的窖藏（+4金币）');
    await move('north_road');

    // 小节三「白石城中」：入城 + 失踪案 + 藏书阁
    setChoices('出示');
    await move('whitestone_gate');
    assert(S.flags.inCity, '白石城：出示符文入城');
    await move('whitestone_street');
    await move('west_alley');
    assert(S.items.watch === 1, '支线【宵禁下的失踪】：小巷战胜利获得怀表');
    // 扩写：城西老井 + 宵禁更楼（更夫与巷子的账）
    await move('city_well');
    assert(!!WORLD.city_well && S.events.westWellVisit, '扩写「城西老井」：两层封条与井底挠砖声');
    await WORLD.city_well.actions.find(a => a.text.includes('挑开封条')).run();
    await WORLD.city_well.actions.find(a => a.text.includes('砖龛')).run();
    assert(S.flags.wellWater && S.flags.wellNiche, '扩写：老井水是甜的，砖龛里有更夫记的失踪名册（+4金币）');
    // 黑暗探索④：城西老井——风灯路径（不耗斗气）
    const gCW = S.gold, spCW = S.sp;
    await WORLD.city_well.actions.find(a => a.text.includes('照进')).run();
    assert(S.flags.cityWellGleam && S.gold === gCW + 4 && S.sp === spCW, '黑暗探索·城西老井：风灯照见上爬的挠痕与「验收」腰牌（失踪案对上账，+4金币，不耗斗气）');
    await move('west_alley');
    await move('curfew_post');
    assert(!!WORLD.curfew_post, '扩写「宵禁更楼」：磨出包浆的梆子');
    await WORLD.curfew_post.npcs.nie.talk();
    assert(S.flags.nieMet, '扩写：老更夫聂伯——全城睡得最少的人');
    await WORLD.curfew_post.npcs.nie.talk();
    assert(S.flags.nieAlley, '扩写：聂伯忆艾德温——「梆子只能敲给活人听」（巷战线索呼应）');
    await WORLD.curfew_post.actions.find(a => a.text.includes('登上更楼')).run();
    assert(S.flags.nieView, '扩写：更楼远望——慈幼堂的暖黄与官仓的车辙');
    await move('west_alley');
    await move('whitestone_street');
    const oldAct = WORLD.whitestone_street.actions.find(a => a.text.includes('老妇'));
    await oldAct.run();
    await oldAct.run();
    assert(S.sideQuests.lost === 'done', '支线【宵禁下的失踪】完成（+12金币，声望+2）');
    await move('city_market');
    assert(!!WORLD.city_market, '新地点：白石市集已接入');
    // 坐骑系统②：青骢马「踏雾」（赶路每两程省一刻，旅途更少遇袭）
    const gHorse = S.gold;
    setChoices('踏雾', '告辞');
    await WORLD.city_market.npcs.raven.talk();
    assert((S.items.horse || 0) === 1 && (S.items.mule || 0) === 1 && S.gold === gHorse - 70, '坐骑进阶：白石市集购入青骢马「踏雾」（-70金币，骡马同厩、骏马优先）');
    const tHorse = timeTicks();
    await move('king_square'); await move('city_market');
    assert(timeTicks() === tHorse + 1, '青骢马赶路：2程只耗时1刻（每两程省一刻，途中遇袭概率减半以上）');

    // 扩写：铸像广场（合掌像 + 康婆姜汤）
    await move('king_square');
    assert(!!WORLD.king_square, '扩写「铸像广场」：先王合掌像与姜汤锅');
    await WORLD.king_square.actions.find(a => a.text.includes('揭掉')).run();
    await WORLD.king_square.actions.find(a => a.text.includes('合掌手印')).run();
    assert(S.flags.statueClean && S.flags.statueHands, '扩写：揭掉「睁眼」纸（声望+1），合掌手印证家徽线索');
    await WORLD.king_square.npcs.kang.talk();
    assert(S.flags.kangMet, '扩写：康婆头一碗姜汤不要钱');
    setChoices('买一碗', '告辞');
    await WORLD.king_square.npcs.kang.talk();
    assert((S.items.hot_soup || 0) >= 1, '扩写：康婆摊上买到热姜汤（新消耗品·回复7）');
    await move('city_market');

    // 新增：卫戍营房（城防情报 + 切磋赌彩头）
    await move('city_barracks');
    assert(!!WORLD.city_barracks, '新地点「卫戍营房」：空了一半的操练场');
    setChoices('过两招', '抱拳');
    await WORLD.city_barracks.npcs.captain.talk();
    assert(S.events.barrackIntel, '贝伦队长：城防情报（调令抽空城防）');

    // 扩写：官仓夜车（新增对质线索链）
    await move('granary_gate');
    assert(!!WORLD.granary_gate && S.events.granaryVisit, '扩写「官仓」：进仓的辙深，出仓的辙浅');
    await WORLD.granary_gate.actions.find(a => a.text.includes('屋脊')).run();
    assert(S.flags.granaryClue, '扩写：官仓夜车——娄伯的仓簿抄本入手（对质新线索）');
    await move('city_barracks');
    await move('city_market');
    await move('whitestone_street');

    // 新增：下城区（寻人墨牌 + 赈粥棚）
    await move('lower_quarter');
    assert(!!WORLD.lower_quarter, '新地点「下城区」：宵禁前最沉的人烟');
    await WORLD.lower_quarter.actions.find(a => a.text.includes('墨牌')).run();
    assert(S.flags.missingBoard, '寻人墨牌：艾德温的名字挂在墙上');
    const gAlms = S.gold;
    setChoices('钱匣');
    await WORLD.lower_quarter.npcs.crone.talk();
    assert(S.flags.quarterAlms && S.gold === gAlms - 5, '赈粥棚：施舍五枚（声望+1，获得宵禁传闻）');

    // 扩写：慈幼堂（白嬷嬷的口粮支线 + 孩子们的目击）
    await move('orphanage');
    assert(!!WORLD.orphanage, '扩写「慈幼堂」：稀得能照见人影的粥');
    await WORLD.orphanage.actions.find(a => a.text.includes('高高的影子')).run();
    assert(S.flags.kidTales, '扩写：孩子们目击「高高的影子」（失踪案呼应）');
    await WORLD.orphanage.npcs.bai.talk();
    assert(S.sideQuests.porridge === 'active', '支线【慈幼堂的口粮】接取');
    await WORLD.orphanage.npcs.bai.talk();
    assert(S.sideQuests.porridge === 'done' && S.items.peace_knot === 1, '支线【慈幼堂的口粮】完成（+3金币，平安结·生命上限+2）');
    await move('lower_quarter');
    await move('whitestone_street');
    await move('palace_hall');
    await move('palace_library');
    assert(WORLD.palace_library && WORLD.palace_library.sub === '小节三 · 白石城中', '新地点「王宫藏书阁」已接入');
    await WORLD.palace_library.actions.find(a => a.text.includes('机关图志')).run();
    await WORLD.palace_library.actions.find(a => a.text.includes('起居注')).run();
    assert(S.items.tower_page === 1 && S.flags.libClue, '藏书阁：获得机关图志残页 + 先王家徽线索');
    await move('palace_hall');
    await WORLD.palace_hall.actions.find(a => a.text.includes('赴宴')).run();
    assert(S.flags.clueLetter, '宴会线索');
    setChoices('静音', '盖上');
    await WORLD.palace_hall.actions.find(a => a.text.includes('后花园')).run();
    assert(S.flags.evidence && !S.flags.darkTouched, '花园夜探：拿到证据（未收黑石）');
    await move('palace_hall');
    await WORLD.palace_hall.actions.find(a => a.text.includes('当庭揭发')).run();
    assert(S.flags.exposed && S.gold >= 30, '当庭揭发：线索加成 + 女王赏赐（含30金币）');

    // 小节四「星塔之夜」：塔底 → 中层星厅（谜题）→ 观星台 BOSS
    await WORLD.palace_hall.actions.find(a => a.text.includes('登星塔')).run();
    assert(WORLD.star_tower_base && S.events.towerBaseRush, '新小节「星塔之夜」：塔底已接入');
    await WORLD.star_tower_base.actions.find(a => a.text.includes('强攻旋梯')).run();
    assert(S.flags.towerBaseClear, '塔底：影蚀武士被击退，旋梯打通');
    await move('star_tower_mid');
    await WORLD.star_tower_mid.actions.find(a => a.text.includes('校准星盘')).run();
    assert(S.flags.starMid, '中层星厅：机关图志残页破解星盘（+8金币）');
    topUp();   // 消除游荡遭遇磨损对流程断言的随机影响
    await move('star_tower');
    assert(S.flags.part2 && S.items.rune2 && !S.flags.gameClear, '观星台：BOSS战胜利，第二部收尾「星辰守护者」录入，旅程接续');
    assert(getEndings().includes('ending_star_guardian'), '章节收尾系统：第二部收尾已记入结局收集');
    assert(WORLD.frost_mine.actions.some(a => a.text.includes('星髓深巷') && a.when && a.when()), '副本门槛解锁：第二部开启后，星髓矿脉「深巷」入口开放（覆阵窟/无光地牢同理随第五部与终部解锁）');

    console.log('—— 第三部 · 海洋之印 ——');
    // 返程：星塔 → 王宫 → 城门，转上南海官道
    await move('star_tower_mid');
    await move('star_tower_base');
    await move('palace_hall');
    await move('whitestone_street');
    await move('whitestone_gate');

    // 跨部回访：第二部的发现，回到第一部兑现
    await move('road_town');
    await move('shrine_pass');
    await move('grayridge_gate');
    assert(WORLD.grayridge_gate.exits.e && WORLD.shrine_pass.exits.w, '跨部地图：灰岭镇口 ↔ 风口山神祠，山口小径贯通两部');
    await move('grayridge_street');
    await WORLD.grayridge_street.actions.find(a => a.text.includes('家书')).run();
    assert(S.flags.lettersDone && S.sideQuests.letters === 'done', '跨部任务【矿工的家书】：家书与工牌送到灰岭镇（声望+2）');
    await WORLD.grayridge_street.npcs.hunter.talk();
    assert(S.flags.harkReply, '跨部任务【山里的旧友】：老哈克托话——「老哈克还咬得动弓弦」');
    await move('grayridge_gate');
    await move('south_road');
    await move('stone_ford');
    await WORLD.stone_ford.npcs.wugou.talk();
    assert(S.flags.wugouThanks, '跨部任务【溪水的账】：下游溪水重新流清，吴钩道谢（+3金币）');
    await move('south_road');
    await move('white_spring');
    await move('old_quarry');
    await WORLD.old_quarry.npcs.mason.talk();
    assert(S.flags.masonFace && S.sideQuests.seventh === 'done', '跨部任务【第七张脸】：合掌先王的模样捎回料场，莫大敢刻了（+8金币）');
    await move('white_spring');
    await move('south_road');
    await move('grayridge_gate');
    await move('shrine_pass');
    await WORLD.shrine_pass.npcs.huoqi.talk();
    assert(S.flags.huoHarkDone && (S.items.smoked_meat || 0) >= 2, '跨部任务【山里的旧友】完成：口信带回山口，霍七分肉（熏肉×2）');
    await move('road_town');
    await move('north_road');
    await move('whitestone_gate');

    await move('coast_road');
    assert(WORLD.coast_road && WORLD.coast_road.sub === '小节一 · 南下潮歌湾' && WORLD.coast_road.wild, '新小节「南下潮歌湾」：海风岬已接入');
    // 扩写·官道与渔港外围：望潮崖 → 盐灶滩 → 老船坞 → 海母祠 → 海雾栈道
    await move('tide_cliff');
    assert(!!WORLD.tide_cliff && S.events.cliffVisit && WORLD.tide_cliff.wild, '扩写「望潮崖」：悬而未退的黑潮与听风铃（荒野路途）');
    await WORLD.tide_cliff.actions.find(a => a.text.includes('黑潮')).run();
    await WORLD.tide_cliff.actions.find(a => a.text.includes('铜钱')).run();
    assert(S.flags.cliffView && S.flags.cliffCoins, '扩写：崖下黑潮掠过一袭白影（影蚀伏笔）+ 界碑平安铜钱（+3金币）');
    await move('salt_sheds');
    assert(!!WORLD.salt_sheds && WORLD.salt_sheds.checkpoint, '扩写「盐灶滩」：几十口熬盐大锅与最后一间热着的盐棚');
    await WORLD.salt_sheds.npcs.lu.talk();
    assert(S.flags.saltMet && (S.items.clam_skewer || 0) >= 1, '扩写：老盐工卤叔——见面分贝串（新消耗品·烤贝串·回复8）');
    setChoices('买一串', '道谢告辞');
    await WORLD.salt_sheds.npcs.lu.talk();
    assert((S.items.clam_skewer || 0) >= 2, '扩写：卤叔的盐灶小摊——烤贝串 1 金币一串');
    await WORLD.salt_sheds.actions.find(a => a.text.includes('干货袋')).run();
    await WORLD.salt_sheds.actions.find(a => a.text.includes('翻一帘盐')).run();
    assert(S.flags.saltLoft && S.flags.saltTurn, '扩写：盐仓梁上的工钱（+4金币）与帮翻一帘盐（声望+1）');
    await move('old_dockyard');
    assert(!!WORLD.old_dockyard, '扩写「老船坞」：造了一半的补给船与「潮记船坞」木牌');
    await WORLD.old_dockyard.npcs.chao.talk();
    assert(S.flags.dockMet, '扩写：造船的潮叔——修了三十年没人敢出海送和的补给船');
    await WORLD.old_dockyard.actions.find(a => a.text.includes('桐油')).run();
    await WORLD.old_dockyard.actions.find(a => a.text.includes('货单')).run();
    await WORLD.old_dockyard.actions.find(a => a.text.includes('工具箱')).run();
    assert(S.flags.dockOil && S.flags.dockLedger && S.flags.dockChest, '扩写：龙骨刷桐油（声望+1）· 三十年「鸦羽车」货单（渡鸦暗线）· 旧工具箱（+5金币）');
    await move('sea_mother_shrine');
    assert(!!WORLD.sea_mother_shrine && S.events.momShrine, '扩写「海母祠」：几千盏祈愿灯的灯墙，亮着的不到一成');
    await WORLD.sea_mother_shrine.npcs.zhu.talk();
    assert(S.sideQuests.shipwall === 'active', '支线【船壁的名字】接取：替祝婆婆把船壁的最后一行念回来');
    await WORLD.sea_mother_shrine.actions.find(a => a.text.includes('祈愿灯')).run();
    assert(S.flags.shrineLamp, '扩写：点一盏祈愿灯（-1金币，斗气+2）');
    await move('fog_boardwalk');
    assert(!!WORLD.fog_boardwalk && WORLD.fog_boardwalk.wild, '扩写「海雾栈道」：钉在崖腰的雾中栈道（荒野路途）');
    await WORLD.fog_boardwalk.actions.find(a => a.text.includes('鱼汛')).run();
    await WORLD.fog_boardwalk.actions.find(a => a.text.includes('皮囊')).run();
    assert(S.flags.boardMark && S.flags.boardPouch, '扩写：栈板下的鱼汛刻痕止于「灯」字 · 雾中皮囊（+4金币）');
    await move('sea_mother_shrine');
    await move('tidesong_harbor');
    assert(WORLD.tidesong_harbor.rest.cost === 6, '渔家客栈休整点（6金币）');
    await WORLD.tidesong_harbor.actions.find(a => a.text.includes('潮汐木牌')).run();
    assert(S.flags.tideLore, '码头潮汐木牌：大退潮口诀入手');
    setChoices('传闻', '告辞');
    await WORLD.tidesong_harbor.npcs.raven.talk();
    assert(S.flags.tideHint, '渡鸦传闻：海底神殿的告诫');

    // 灯塔：卡雅遇袭（默认选0=冲进战团）→ 入队；接取荧藻支线
    await move('lighthouse');
    assert(WORLD.lighthouse && S.flags.kaya, '灯塔遭遇战：救下渔家猎手卡雅（同伴入队）');
    assert(S.team && S.team.kaya, '卡雅拥有独立生命与斗气（三同伴体系）');
    // 寻宝系统③：走私客的防水图（特殊掉落）→ 沉船湾起获遗货
    assert(S.items.tmap_smuggler === 1, '藏宝图·其三：深潜者游群喉囊里滚出蜡封防水图（特殊掉落）');
    await WORLD.lighthouse.npcs.keeper.talk();
    assert(S.sideQuests.glowweeds === 'active', '支线【灯塔的荧藻】接取');

    // 礁滩 → 沉船湾 → 鲸骨滩 → 孤礁钓台 → 潮汐洞窟 → 淹水坳：荧藻 + 寻宝 + 支线
    await move('reef_shoal');
    await WORLD.reef_shoal.actions.find(a => a.text.includes('荧藻')).run();
    assert(S.flags.weed_reef && (S.items.glowweed || 0) === 1, '荧藻之一：礁滩背阴石缝');
    await move('shipwreck_cove');
    assert(S.items.whale_lance === 1, '新地点「沉船湾」：礁蟹败退，取得鲸骨长枪（攻+3）');
    await WORLD.shipwreck_cove.actions.find(a => a.text.includes('最后一行')).run();
    assert(S.flags.coveWords, '支线【船壁的名字】：船壁最后一行的刻痕念给浪听，也记在心里');
    await WORLD.shipwreck_cove.actions.find(a => a.text.includes('海藻')).run();
    const gT3 = S.gold;
    await WORLD.shipwreck_cove.actions.find(a => a.text.includes('鹞鹰号')).run();
    assert(S.flags.dug_smuggler && S.items.corsair_hook === 1 && S.gold === gT3 + 10 + 30, '寻宝·其三：鹞鹰号压舱暗格起获走私客遗货（守巢深潜者+10金币，宝藏+30金币，私掠者的虎爪链·攻击+1）');
    // 扩写·礁滩外围：鲸骨滩（寻宝·其五）→ 孤礁钓台（阿公的旧竿）
    await move('whale_beach');
    assert(!!WORLD.whale_beach && S.events.whaleVisit && WORLD.whale_beach.checkpoint, '扩写「鲸骨滩」：鲸肋穹门与三十年不断的祭火');
    assert(S.items.tmap_crab === 1, '藏宝图·其五：沉船湾老蟹妖的旧甲缝里搜出毛边皮图（特殊掉落）');
    await WORLD.whale_beach.actions.find(a => a.text.includes('祭台')).run();
    await WORLD.whale_beach.actions.find(a => a.text.includes('旧币')).run();
    assert(S.flags.whaleRite && S.flags.whaleCoins, '扩写：祭台续火（斗气+2）· 鲸骨缝隙旧币（+5金币）');
    const gT5 = S.gold;
    await WORLD.whale_beach.actions.find(a => a.text.includes('鲸肋穹门')).run();
    assert(S.flags.dug_crab && S.items.whale_amber === 1 && S.gold === gT5 + 9 + 15, '寻宝·其五：鲸肋穹门下掘出蟹妖的家当（守穴蟹妖+9金币，宝藏+15金币，老鲸的琥珀·生命上限+4）');
    await move('reef_perch');
    assert(!!WORLD.reef_perch && WORLD.reef_perch.rest.cost === 0 && S.events.perchVisit, '扩写「孤礁钓台」：下到一半的棋局与免费的遮棚');
    await WORLD.reef_perch.actions.find(a => a.text.includes('旧竿')).run();
    await WORLD.reef_perch.actions.find(a => a.text.includes('浮桶')).run();
    assert(S.sideQuests.grandrod === 'active' && S.flags.perchBarrel, '支线【阿公的旧竿】接取：卡雅认出阿公的钓竿 · 浮桶油纸包（+4金币）');
    await move('whale_beach');
    await move('shipwreck_cove');
    await move('reef_shoal');
    await move('sea_cave');
    assert(S.items.tide_orb === 1, '新地点「潮汐洞窟」：守窟怨念散去，取得潮珠（斗气上限+4）');
    await WORLD.sea_cave.actions.find(a => a.text.includes('荧藻')).run();
    // 黑暗探索⑤：潮汐洞窟——洞顶的半幅潮路图（卡雅家传暗线）
    const gSC = S.gold;
    await WORLD.sea_cave.actions.find(a => a.text.includes('洞顶')).run();
    assert(S.flags.caveGleam && S.gold === gSC + 4, '黑暗探索·潮汐洞窟：风灯照见洞顶倒悬的半幅潮路图（卡雅家传暗线，+4金币）');
    // 扩写：淹水坳（三十年水位与不肯搬的海爷）
    await move('sunken_hamlet');
    assert(!!WORLD.sunken_hamlet && WORLD.sunken_hamlet.wild, '扩写「淹水坳」：泡在退潮线以下的半个村子（荒野路途）');
    await WORLD.sunken_hamlet.npcs.hai.talk();
    assert(S.flags.hamletMet && (S.items.fish_soup || 0) >= 1, '扩写：守屋的海爷——进门一碗鱼骨汤（新消耗品·回复9）');
    await WORLD.sunken_hamlet.actions.find(a => a.text.includes('水位刻痕')).run();
    await WORLD.sunken_hamlet.actions.find(a => a.text.includes('浮箱')).run();
    assert(S.flags.hamletMarks && S.flags.hamletBox, '扩写：门楣水线与灯塔熄灭的年头严丝合缝 · 水巷浮箱（+6金币）');
    await move('sea_cave');
    await move('reef_shoal');
    await move('lighthouse');

    // 交付荧藻 → 灯塔重亮 → 旧竿归还 → 回海母祠交割 → 守到夜半大退潮
    await WORLD.lighthouse.npcs.keeper.talk();
    assert(S.flags.lampLit && S.items.tide_pearl === 1 && S.sideQuests.glowweeds === 'done', '支线【灯塔的荧藻】完成：灯塔重亮（+10金币，深海珍珠·生命上限+5）');
    await WORLD.lighthouse.npcs.keeper.talk();
    assert(S.sideQuests.grandrod === 'done', '支线【阿公的旧竿】完成：旧竿挂上塔壁（+4金币，声望+1，斗气+2）');
    // 回海母祠：把最后一行念给祝婆婆（栈道环路：灯塔→栈道→祠）
    await move('fog_boardwalk');
    await move('sea_mother_shrine');
    await WORLD.sea_mother_shrine.npcs.zhu.talk();
    assert(S.sideQuests.shipwall === 'done' && S.items.sea_rope === 1, '支线【船壁的名字】完成：灶生的最后一行念回灯墙下（+5金币，声望+1，海母祠的红绳·生命上限+3）');
    await move('fog_boardwalk');
    await move('lighthouse');
    await WORLD.lighthouse.actions.find(a => a.text.includes('大退潮')).run();
    assert(S.flags.tideNight, '守到夜半：大退潮降临，海路自现');

    // 海底神殿：前殿 → 咏泉回廊/潮路石阶（两翼）→ 潮汐祭坛 BOSS → 第三部收尾
    await move('reef_shoal');
    await move('sea_temple_hall');
    assert(WORLD.sea_temple_hall && S.items.tide_edict, '新地点「海底神殿前殿」：影蚀武士败退，获得影蚀潮令');
    await WORLD.sea_temple_hall.actions.find(a => a.text.includes('壁画')).run();
    // 扩写·神殿两翼：咏泉回廊 → 潮路石阶
    await move('spring_gallery');
    assert(!!WORLD.spring_gallery, '扩写「咏泉回廊」：石像掌心里涌出的咏泉源头');
    await WORLD.spring_gallery.actions.find(a => a.text.includes('掬一捧')).run();
    await WORLD.spring_gallery.actions.find(a => a.text.includes('壁龛')).run();
    await WORLD.spring_gallery.actions.find(a => a.text.includes('刻名')).run();
    assert(S.flags.galleryWater && S.flags.galleryNiche && S.flags.galleryNames, '扩写：泉眼活水（斗气+3）· 朝圣者过路钱（+8金币，药水×1）· 刻名止于「灯熄那年」');
    await move('sea_temple_hall');
    await move('tide_stairs');
    assert(!!WORLD.tide_stairs && S.events.stairsVisit, '扩写「潮路石阶」：几代人接着刻的潮路图（卡雅家传暗线）');
    await WORLD.tide_stairs.actions.find(a => a.text.includes('拓下')).run();
    assert(S.flags.tidePath, '扩写：拓下潮路刻痕（斗气+2，卡雅家传潮路图暗线加深）');
    await WORLD.tide_stairs.actions.find(a => a.text.includes('并上洞顶')).run();
    assert(S.flags.kayaTideMap, '卡雅潮路线：拓片与洞窟半幅图咬合——家传潮路图补全（终部暗渠伏笔）');
    await move('sea_temple_hall');
    const hpAltar = S.maxHp;
    topUp();
    await move('tide_altar');
    // 螺壳抉择默认选0=退开（不染侵蚀）
    await WORLD.tide_altar.actions.find(a => a.text.includes('溟汐')).run();
    assert(S.flags.rune3 && S.flags.part3 && S.items.rune3, '潮汐祭坛：溟汐败退，海洋之印入手（第三部通关）');
    assert(!S.flags.shellTaken && S.corruption === 0, '深渊螺壳抉择：退开未取（侵蚀仍为0）');
    assert(S.maxHp === hpAltar + 5, '潮汐共鸣：生命上限 +5');
    assert(getEndings().includes('ending_tide_guardian'), '第三部收尾「沧海守护者」录入');

    console.log('—— 第四部 · 丰收之印 ——');
    await move('sea_temple_hall');
    await move('reef_shoal');
    await move('lighthouse');
    await move('tidesong_harbor');
    await move('coast_road');
    await move('golden_road');
    assert(WORLD.golden_road && WORLD.golden_road.sub === '小节一 · 金穗平原' && WORLD.golden_road.wild, '新小节「金穗平原」：麦浪原已接入');
    await move('harvest_village');
    await WORLD.harvest_village.npcs.headman.talk();
    assert(S.sideQuests.seeds === 'active', '支线【被偷走的谷种】接取');
    setChoices('腐穗', '告辞');
    await WORLD.harvest_village.npcs.raven.talk();
    assert(S.flags.rotHint, '渡鸦传闻：腐穗的来头');

    // 田垄 → 老磨坊（谷种）→ 守穗人树林（农谚）→ 交付
    await move('locust_fields');
    await WORLD.locust_fields.actions.find(a => a.text.includes('驱蝗火')).run();
    assert(S.flags.locustHelped, '田垄驱蝗火：农户的火钱（+5金币）');
    await move('harvest_village');
    await move('old_mill');
    assert(S.items.grain === 1, '新地点「老磨坊」：腐行者败退，寻回祭典谷种（腐行者遗落谷窖藏图）');
    assert(S.items.tmap_granary === 1, '战斗掉落：腐行者身上的谷窖藏图（油浸粗布，指向谷仓后巷）');
    await WORLD.old_mill.actions.find(a => a.text.includes('刻痕')).run();
    assert(S.flags.millRhyme, '磨盘刻痕：前半句农谚拓下');
    await move('warden_grove');
    await WORLD.warden_grove.npcs.rong.talk();
    assert(S.flags.rhyme, '守穗人蓉婆婆：完整农谚入手');
    await move('harvest_village');
    await WORLD.harvest_village.npcs.headman.talk();
    assert(S.sideQuests.seeds === 'done', '支线【被偷走的谷种】完成（+15金币，声望+2）');
    await move('warden_grove');
    await WORLD.warden_grove.npcs.rong.talk();
    assert(S.items.vine_mail === 1, '守穗人的谢礼：荆藤战甲（受伤-3）');

    // —— 第四部扩写：渡鸦木牌 / 年集 / 渠口 / 迷宫 / 窝棚 / 草人 / 后巷 / 阁楼 / 旧哨 ——
    setChoices('乌鸦木牌', '告辞');
    await WORLD.harvest_village.npcs.raven.talk();
    assert(S.flags.ravenTag, '渡鸦暗线①：乌鸦木牌三十年前打的——「那本账，不是买卖」（老船坞呼应）');
    await move('fair_ground');
    assert(!!WORLD.fair_ground, '新地点「丰年前集」：蝗灾里冷清下来的年集');
    setChoices('是霜');
    await WORLD.fair_ground.actions.find(a => a.text.includes('灯谜')).run();
    assert(S.flags.fairRiddle && S.gold > 0, '丰年前集：谷穗灯谜「是霜」猜中（+3金币）');
    setChoices('苇笛', '告辞');
    await WORLD.fair_ground.npcs.laobu.talk();
    assert(S.sideQuests.reeds === 'active', '支线【苇笛驱蝗】接取');
    await move('thresh_floor');
    assert(!!WORLD.thresh_floor && WORLD.thresh_floor.rest.cost === 0, '新地点「打谷场」：车三爷的火堆，出门人免费歇脚');
    await WORLD.thresh_floor.actions.find(a => a.text.includes('连枷')).run();
    assert(S.flags.threshLoot, '打谷场：翻晒连枷与谷耙（+3金币）');
    await move('irrigation_sluice');
    await WORLD.irrigation_sluice.actions.find(a => a.text.includes('老芦苇')).run();
    await WORLD.irrigation_sluice.actions.find(a => a.text.includes('老芦苇')).run();
    await WORLD.irrigation_sluice.actions.find(a => a.text.includes('老芦苇')).run();
    assert((S.items.reeds || 0) === 3, '渠口割老芦苇×3（扎笛的料）');
    await WORLD.irrigation_sluice.actions.find(a => a.text.includes('渠壁的洞口')).run();
    assert(S.flags.sluiceGleam, '黑暗探索·渠口：照出水钱陶罐与「蓑衣人量地往北」炭字（+4金币）');
    await move('thresh_floor');
    await move('fair_ground');
    await WORLD.fair_ground.npcs.laobu.talk();
    assert(S.items.reed_flute === 1 && (S.items.reeds || 0) === 0, '老卜扎笛：三根芦苇换一支驱蝗的苇笛（工钱2金币）');
    await move('thresh_floor');
    await move('wheat_maze');
    setChoices('往左', '一直走', '往左');
    await WORLD.wheat_maze.actions.find(a => a.text.includes('迷宫')).run();
    assert(S.flags.mazeWon && (S.items.malt_candy || 0) === 2, '麦垛迷宫：照孩子的口诀「左直左」找到心儿里的宝（+4金币，麦芽糖×2）');
    await move('gleaner_camp');
    await WORLD.gleaner_camp.npcs.qian.talk();
    assert(S.flags.qianMet && (S.items.roast_wheat || 0) === 2, '新地点「拾穗人的窝棚」：荞婶的炒麦粒与三十年前「行商拉粮」旧话');
    await move('scarecrow_field');
    await WORLD.scarecrow_field.actions.find(a => a.text.includes('稻草人')).run();
    assert(S.flags.scareWheat, '稻草人小径：怀揣新麦的草人与孩子的字条（声望+1）');
    await move('locust_fields');
    await WORLD.locust_fields.actions.find(a => a.text.includes('苇笛')).run();
    assert(S.flags.reedPlayed && S.sideQuests.reeds === 'done', '支线【苇笛驱蝗】完成：三声笛音退了螟阵（+5金币，声望+1）');
    await move('harvest_village');
    await move('granary_row');
    const gGran = S.gold;
    await WORLD.granary_row.actions.find(a => a.text.includes('气窗往仓里看')).run();
    assert(S.flags.granaryPeek, '谷仓后巷：气窗里空了大半的粮囤与「封仓防人心」');
    await WORLD.granary_row.actions.find(a => a.text.includes('地窖门')).run();
    assert(S.flags.granaryGleam && S.gold === gGran + 4, '黑暗探索·谷仓后巷：照出地窖门缝与孩子封的四碗口粮（+4金币）');
    await WORLD.granary_row.actions.find(a => a.text.includes('界石')).run();
    assert(S.flags.dug_granary && S.items.grain_jade === 1 && S.gold === gGran + 4 + 15 + 6, '藏宝图④·谷窖：界石下挖出陶瓮（+15金币+守卫6，谷神玉珏·防+1）');
    await move('harvest_village');
    await move('old_mill');
    await move('mill_loft');
    await WORLD.mill_loft.actions.find(a => a.text.includes('日志')).run();
    assert(S.flags.loftLog, '磨坊阁楼：学徒日志——「蓑衣人量磨盘、农谚被凿」（与渠口炭字互证）');
    await WORLD.mill_loft.actions.find(a => a.text.includes('储钱罐')).run();
    assert(S.flags.loftLoot, '阁楼学徒的储钱罐（+3金币，字条照原样压回）');
    await move('old_mill');
    await move('warden_grove');
    await move('old_watchpost');
    await WORLD.old_watchpost.actions.find(a => a.text.includes('断梯远眺')).run();
    assert(S.flags.watchClimb, '守穗人旧哨：断梯远眺——螟群如锈色的河从古战场方向淌来（+3金币）');
    await WORLD.old_watchpost.actions.find(a => a.text.includes('暗格')).run();
    assert(S.flags.watchGleam && S.items.seed_mother === 1 && S.sideQuests.seedmother === 'active', '黑暗探索·旧哨：楼梯暗格里守穗人三十年的谷种母本');
    await move('warden_grove');
    await WORLD.warden_grove.npcs.rong.talk();
    assert(S.flags.motherGift && S.sideQuests.seedmother === 'done', '支线【失落的母本】完成：蓉婆婆三十年之诺（+8金币，声望+1，斗气上限+2）');

    // 丰年祭坛：五谷排布（稻麦黍豆麻）→ BOSS → 第四部收尾
    topUp();
    await move('harvest_altar');
    const hpFinal = S.maxHp;
    setChoices('稻', '麦', '黍', '豆', '麻');
    await WORLD.harvest_altar.actions.find(a => a.text.includes('五谷槽')).run();
    assert(S.flags.riddleSolved, '丰年祭坛：五谷排布合于农谚，坛门自开');
    await WORLD.harvest_altar.actions.find(a => a.text.includes('饕穰')).run();
    assert(S.flags.rune4 && S.flags.part4 && S.items.rune4, '丰年祭坛：饕穰溃散，丰收之印入手（第四部通关）');
    assert(S.maxHp === hpFinal + 6, '丰收共鸣：生命上限 +6');
    assert(getEndings().includes('ending_harvest_guardian'), '第四部收尾「大地的守望者」录入');
    assert(S.quest === 'q_war', '主线推进：七印之路已行其四，战痕古道开启');

    console.log('—— 系统 · 队伍与成长 v2 ——');
    // 世界扩展总断言：新地点 / 新装备 / 旅途事件 / 地图总览
    assert(Object.keys(WORLD).length === 139, '世界扩展：地点增至 139 处（第一~三部大扩写 38 处 + 第四部 9 处 + 第五部 8 处 + 第六部 8 处 + 终部扩写 5 处：鸦记货栈/回望台/折旗坡/地牢/无光前厅）');
    assert(ITEMS.rite_blade && ITEMS.rite_blade.atk === 2 && ITEMS.mist_pearl && ITEMS.mist_pearl.maxHp === 3, '探索装备：咏祭礼剑（攻+2）/ 雾泽明珠（生命上限+3）');
    assert(ITEMS.logger_axe && ITEMS.logger_axe.atk === 2 && ITEMS.reed_charm && ITEMS.reed_charm.spMax === 3, '第一部扩写装备：伐木斧（攻+2）/ 苇编哨（斗气上限+3）');
    assert(ITEMS.honey && ITEMS.roast_fish && ITEMS.glassbead && HEALS.honey === 6 && HEALS.roast_fish === 8, '第一部扩写消耗品与信物：林间蜂蜜（+6）/ 湖畔烤鱼（+8）/ 雾蓝玻璃珠');
    assert(!!ENEMIES.mistcrows && !!ENEMIES.bramble && !!ENEMIES.sentinel, '第一部扩写敌人：雾鸦群 / 荆棘蔓灵 / 被蚀的石兽');
    assert(SIDE_QUESTS.fare && SIDE_QUESTS.lamps && SIDE_QUESTS.bees, '第一部扩写支线：湖底的船钱 / 复明的灯柱 / 走失的蜂群');
    assert(WORLD.south_road.npcs.zhao && WORLD.stone_ford.npcs.wugou && WORLD.old_quarry.npcs.mason && WORLD.bee_clearing.npcs.ji && WORLD.lakeside_marsh.npcs.aman && WORLD.pilgrim_path.npcs.tangjiu && WORLD.guest_hall.npcs.sue, '第一部扩写 NPC：赵老汉/吴钩/莫大/纪老爹/阿满/唐九/素娥');
    assert(WORLD.miner_camp.npcs.he && WORLD.shrine_pass.npcs.huoqi && WORLD.goat_slope.npcs.shi && WORLD.king_square.npcs.kang && WORLD.curfew_post.npcs.nie && WORLD.orphanage.npcs.bai, '第二部扩写 NPC：何十斤/霍七/石头/康婆/聂伯/白嬷嬷');
    assert(!!ENEMIES.frosthusk && !!ENEMIES.corrupt_guard && !!ENEMIES.overseer, '第二部扩写敌人：霜僵 / 蚀卒 / 蚀变的矿监');
    assert(SIDE_QUESTS.lamb && SIDE_QUESTS.porridge, '第二部扩写支线：走失的羊羔 / 慈幼堂的口粮');
    assert(ITEMS.smoked_meat && ITEMS.hot_soup && HEALS.smoked_meat === 9 && HEALS.hot_soup === 7, '第二部扩写消耗品：猎户熏肉（+9）/ 热姜汤（+7）');
    assert(ITEMS.miner_lamp && ITEMS.peace_knot && ITEMS.star_silver_charm, '第二部扩写装备：老矿工的风灯 / 孩子们的平安结 / 星髓银坠');
    assert(TREASURES.miner && TREASURES.miner.digAt === 'snow_hot_spring', '第二部扩写藏宝：矿工的藏宝单 → 雪谷野汤热泥');
    assert(S.flags.granaryClue, '第二部扩写对质线索链：官仓夜车（当庭揭发时呈上仓簿）');
    assert(SIDE_QUESTS.creek && SIDE_QUESTS.seventh && SIDE_QUESTS.oldfriends && SIDE_QUESTS.letters, '跨部任务链：溪水的账 / 第七张脸 / 山里的旧友 / 矿工的家书（两部往来，接在一边、兑在另一边）');
    assert(!!ENEMIES.brinehusk && !!ENEMIES.lampfish, '第三部扩写敌人：盐壳鬼 / 灯眼鮟鱇');
    assert(WORLD.salt_sheds.npcs.lu && WORLD.old_dockyard.npcs.chao && WORLD.sea_mother_shrine.npcs.zhu && WORLD.sunken_hamlet.npcs.hai, '第三部扩写 NPC：卤叔 / 潮叔 / 祝婆婆 / 海爷');
    assert(SIDE_QUESTS.shipwall && SIDE_QUESTS.grandrod, '第三部扩写支线：船壁的名字 / 阿公的旧竿');
    assert(TREASURES.crab && TREASURES.crab.digAt === 'whale_beach' && ITEMS.whale_amber && ITEMS.whale_amber.maxHp === 4, '第三部扩写藏宝：蟹妖的藏宝图 → 鲸骨滩鲸肋穹门（老鲸的琥珀·生命上限+4）');
    assert(ITEMS.clam_skewer && ITEMS.fish_soup && HEALS.clam_skewer === 8 && HEALS.fish_soup === 9, '第三部扩写消耗品：烤贝串（+8）/ 鱼骨汤（+9）');
    assert(ITEMS.sea_rope && ITEMS.sea_rope.maxHp === 3, '第三部扩写装备：海母祠的红绳（生命上限+3）');
    assert(WORLD.coast_road.roam.byTime && WORLD.reef_shoal.roam.byTime && WORLD.tide_cliff.roam.byTime && WORLD.fog_boardwalk.roam.byTime && WORLD.sunken_hamlet.roam.byTime.night.en === 'lampfish', '时间制游荡·海洋篇：官道/礁滩/崖台/栈道入夜换「没脸的」，淹水坳入夜换灯眼鮟鱇');
    assert(S.flags.tidePath && S.flags.dockLedger, '第三部暗线加深：卡雅家传潮路图（石阶拓印）· 渡鸦三十年老主顾（船坞货单）');
    assert(WORLD.forest_deep.roam.byTime && WORLD.forest_deep.roam.byTime.night.en === 'wraith' && WORLD.south_road.roam.byTime.night.en === 'wraith' && WORLD.crow_ridge.roam.byTime.night.chance < WORLD.crow_ridge.roam.chance, '时间制游荡：夜晚野外换「没脸的」上场（白天是狼群/雾鸦，鸦眠坡入夜反而安静）');
    assert(Array.isArray(TAVERN_RUMORS) && TAVERN_RUMORS.length >= 35 && Array.isArray(BOUNTIES) && BOUNTIES.length >= 27, '酒馆系统：传闻池 35+ 条（天数/剧情解锁），委托池 27 式（讨伐/采办 + 5 式秘窟差事，按天轮换）');
    assert(Object.keys(DUNGEONS).length === 4 && DUNGEON_TASKS.length === 16, '副本系统：4 座秘窟（井底·无回廊/星髓深巷/覆阵窟/无光地牢）+ 16 式掘客委托（深入/清剿/讨伐/寻物）');
    assert(SIDE_QUESTS.duglamp && SIDE_QUESTS.vetag && SIDE_QUESTS.warroll && SIDE_QUESTS.namepage, '秘窟支线：井下的行灯/深巷的工牌/坑底的名册/缴名巷的名字（入口掘客承接，第 2 层据点寻获信物）');
    assert(BOUNTIES.some(b => b.type === 'kill' && b.en === 'well_husk') && BOUNTIES.some(b => b.type === 'fetch' && b.item === 'relic_shard'), '随机委托进副本：酒馆委托板可刷出井祟讨伐/残片收购等秘窟差事');
    assert(!!ENEMIES.well_devourer && !!ENEMIES.vein_watcher && !!ENEMIES.fallen_marshall && !!ENEMIES.dungeon_lord, '副本镇守者：井底吞噬者 / 星髓之眼 / 陷阵的亡帅 / 无光典狱长');
    assert(ITEMS.relic_shard && ITEMS.well_bell && ITEMS.star_pick && ITEMS.rally_banner && ITEMS.lightless_sigil, '副本奖励：渊纹残片 + 四件掘客旧物（入口残片兑换）');
    assert(typeof timeText === 'function' && timeDay() >= 8, '时间系统全程运转：终局之时已是第 ' + timeDay() + ' 天（移动+1刻，休息睡到清晨）');
    assert(!!ENEMIES.mistcrows && !!ENEMIES.bramble && !!ENEMIES.sentinel, '第一部扩写敌人：雾鸦群 / 荆棘蔓灵 / 被蚀的石兽');
    assert(SIDE_QUESTS.fare && SIDE_QUESTS.lamps, '第一部扩写支线：湖底的船钱 / 复明的灯柱');
    assert(ITEMS.whale_lance && ITEMS.whale_lance.atk === 3 && ITEMS.vine_mail && ITEMS.vine_mail.def === 3, '三/四部装备：鲸骨长枪（攻+3）/ 荆藤战甲（受伤-3）');
    assert(ITEMS.tide_orb && ITEMS.tide_orb.spMax === 4 && equipTotals, '饰品新词条：潮珠（斗气上限+4）——装备系统支持斗气加成');
    assert(Array.isArray(TRAVEL_EVENTS) && TRAVEL_EVENTS.length >= 8, '旅途随机事件池扩充（新增渔歌/稻草人/军旗，按章节浮现）');
    assert(ITEMS.torch && ITEMS.mule && ITEMS.mule.mount && ITEMS.horse && ITEMS.horse.mount && SHOP.torch && SHOP.mule && SHOP.horse, '生活系统：火把与坐骑入册上架（老骡每3程省1刻 / 青骢马每2程省1刻且旅途更少遇袭）');
    assert(['inn_cellar', 'grayridge_well', 'temple_cloister', 'frost_mine', 'city_well', 'sea_cave', 'irrigation_sluice', 'granary_row', 'old_watchpost', 'beacon_ruin', 'medic_tent', 'churchyard', 'relic_vault', 'dark_vestibule'].every(id => (WORLD[id].actions || []).some(a => a.needsLight)), '黑暗探索系统：十四处暗藏线索（序章2 + 二部2 + 三部2 + 四部3 + 五部2 + 六部2 + 终部1），火把·照明术·风灯三种光源皆可照亮');
    assert(TAVERN_RUMORS.some(r => r.id === 'torch_talk'), '酒馆传闻：掘客的「带光行话」入池（提示黑暗探索玩法）');
    assert(!!ENEMIES.grainwisp, '第四部扩写敌人：麦壳游魂');
    assert(SIDE_QUESTS.reeds && SIDE_QUESTS.seedmother, '第四部扩写支线：苇笛驱蝗 / 失落的母本');
    assert(TREASURES.granary && TREASURES.granary.digAt === 'granary_row' && ITEMS.grain_jade && ITEMS.grain_jade.def === 1, '第四部扩写藏宝：谷窖的藏图 → 谷仓后巷界石（谷神玉珏·防+1）');
    assert(ITEMS.roast_wheat && ITEMS.malt_candy && HEALS.roast_wheat === 5 && HEALS.malt_candy === 6, '第四部扩写消耗品：炒麦粒（+5）/ 麦芽糖（+6）');
    assert(WORLD.locust_fields.roam.byTime && WORLD.locust_fields.roam.byTime.night.en === 'grainwisp' && WORLD.irrigation_sluice.roam.byTime && WORLD.scarecrow_field.roam.byTime, '时间制游荡·丰收篇：田垄/渠口/草人小径入夜换「麦壳游魂」');
    assert(['irrigation_sluice', 'granary_row', 'old_watchpost'].every(id => (WORLD[id].actions || []).some(a => a.needsLight)), '黑暗探索·丰收篇：渠口/后巷/旧哨三处暗藏线索');
    assert(!!ENEMIES.rust_sentinel, '第五部扩写敌人：锈甲哨卫');
    assert(SIDE_QUESTS.letter && SIDE_QUESTS.medic, '第五部扩写支线：逃兵的家信 / 军医的药单');
    assert(TREASURES.spoils && TREASURES.spoils.digAt === 'disarm_pit' && ITEMS.war_tally && ITEMS.war_tally.atk === 2, '第五部扩写藏宝：军资窖图 → 缴械坑垫石（百战铜符·攻+2）');
    assert(ITEMS.stop_shield && ITEMS.stop_shield.def === 2 && ITEMS.medic_pouch && ITEMS.medic_pouch.maxHp === 4, '第五部扩写装备：止兵圆盾（受伤-2）/ 军医的药囊（生命上限+4）/ 逃兵的短刃（攻+3）');
    assert(['beacon_ruin', 'medic_tent'].every(id => (WORLD[id].actions || []).some(a => a.needsLight)), '黑暗探索·战争篇：烽燧/医帐暗藏线索');
    assert(!!ENEMIES.grave_ward, '第六部扩写敌人：墓园蚀影');
    assert(SIDE_QUESTS.calmherb && SIDE_QUESTS.candle, '第六部扩写支线：安神的药草 / 为归人点烛');
    assert(TREASURES.relic && TREASURES.relic.digAt === 'relic_vault' && ITEMS.prayer_bell && ITEMS.prayer_bell.maxHp === 4, '第六部扩写藏宝：圣物龛图 → 龛室地砖（祷银铃·生命上限+4）');
    assert(ITEMS.calm_sachet && ITEMS.calm_sachet.spMax === 3 && ITEMS.dusk_emblem && ITEMS.dusk_emblem.spMax === 3, '第六部扩写装备：安神香囊 / 暮色圣徽（斗气上限+3）');
    assert(ITEMS.roast_mushroom && HEALS.roast_mushroom === 6, '第六部扩写消耗品：烤蘑菇（+6）');
    assert(WORLD.dusk_path.roam.byTime && WORLD.dusk_path.roam.byTime.night.en === 'grave_ward', '时间制游荡·暮钟篇：山道入夜换「墓园蚀影」');
    assert(['churchyard', 'relic_vault'].every(id => (WORLD[id].actions || []).some(a => a.needsLight)), '黑暗探索·暮钟篇：墓园/龛室暗藏线索');
    assert(DIRS.sw === '↙ 西南' && DIRS.ne === '↗ 东北', '方位扩展：西南 / 东北');
    openMap();
    const mapHtml = document.querySelector('#modal-content').innerHTML;
    assert(mapHtml.includes('行记图') && mapHtml.includes('已踏足 100 / 139 处'), '世界地图总览：全境 139 处地点随探索点亮（此处已踏足 100 处）');
    closeModal();
    assert(Array.isArray(ENEMIES.wolves.units) && ENEMIES.wolves.units.length === 2, '遭遇制敌人：狼群以「头狼 + 灰狼」小组登场');
    assert(!!ENEMIES.starlord.moves && ENEMIES.starlord.moves.some(m => m.type === 'stun'), 'BOSS动作库：噬星斩/黑月护壁/星穹锁链（意图制）');
    assert(ENEMIES.tidesage && ENEMIES.tidesage.hp === 150 && ENEMIES.harvestgiant && ENEMIES.harvestgiant.hp === 180, '三/四部 BOSS：影蚀潮祭司·溟汐 / 腐穗巨灵·饕穰');
    assert(S.team && S.team.aria && S.team.thorne && S.team.kaya, '同伴为独立战斗单位：艾莉娅/索恩/卡雅拥有独立生命与斗气');
    assert(typeof STANCE === 'object' && STANCE[S.stance], '同伴态势系统就绪（当前：' + STANCE[S.stance] + '）');
    assert(SKILLS.tideb && SKILLS.tideb.reqFlag === 'rune3' && S.flags.rune3, '符文技能：潮汐之刃随海洋之印解锁');
    assert(SKILLS.harvestwave && SKILLS.harvestwave.all && SKILLS.harvestwave.reqFlag === 'rune4' && S.flags.rune4, '符文技能：穗浪千重（全体魔法）随丰收之印解锁');
    const lv0 = S.level, hp0 = S.maxHp, spMax0 = S.spMax;
    S.exp = expNeed() - 5;
    setChoices('生命强化');
    await gainExp(5);
    assert(S.level === lv0 + 1 && S.maxHp === hp0 + 5 + 6 && S.spMax === spMax0 + 1, '升级：基础成长 +5生命/+1斗气，自选强化「生命强化」+6 生效');
    assert(S.boons && S.boons.vit === 1, '强化印记已记录（可累计 build）');
    assert(SKILLS.whirlslash && SKILLS.whirlslash.lv === 4, '新技能「回旋斩」按等级解锁（Lv.4）');
    assert(ENEMIES.assassin.hp > 0 && S.corruption === 0, '侵蚀机制待命（本局未染侵蚀，战前无啃噬）');
    assert(getEndings().length === 3 && ENDINGS.length === 15, '结局收集：四部收尾各录一枚（3 / 15，其余待新章节与终局）');

    console.log('—— 第五部 · 战争之印 ——');
    topUp();
    // 从穗安村折回麦浪原，跨过北缘进入战痕古道
    await move('warden_grove');
    await move('harvest_village');
    await move('golden_road');
    await move('war_road');
    assert(WORLD.war_road && WORLD.war_road.sub === '小节一 · 北望古战场' && WORLD.war_road.wild, '新小节「北望古战场」：界碑古道已接入（荒野路途）');
    await WORLD.war_road.actions.find(a => a.text.includes('界碑上的尘土')).run();
    assert(S.flags.warStone, '界碑铭文：亡者为兵，生者为约');
    setChoices('影蚀在找什么', '告辞');
    await WORLD.war_road.npcs.raven.talk();
    assert(S.flags.warHint, '渡鸦传闻：五印在旗杆心里 / 影蚀在挖地');

    // —— 第五部扩写：酒摊 / 逃兵地窖 ——
    await move('vet_stall');
    await WORLD.vet_stall.npcs.cai.talk();
    assert(S.flags.vetMet && S.flags.queenVet, '新地点「老兵的酒摊」：独眼蔡伯的白石城旧忆——女王线伏笔①（「她守着一座空城」）');
    const gWine = S.gold;
    await WORLD.vet_stall.actions.find(a => a.text.includes('浊酒')).run();
    assert(S.gold === gWine - 1, '酒摊浊酒：一枚钱一碗暖（-1金币）');
    await move('war_road');
    await move('deserter_hollow');
    await WORLD.deserter_hollow.npcs.mute.talk();
    assert(S.sideQuests.letter === 'active', '新地点「逃兵的地窖」：支线【逃兵的家信】接取（不敢回家的半截舌）');
    await move('war_road');

    // 碑林：接支线 + 碑文（军阵次序）+ 石龛
    await move('rust_field');
    await move('training_yard');
    await WORLD.training_yard.actions.find(a => a.text.includes('石锁')).run();
    assert(S.flags.drillSp, '新地点「演武场旧址」：二百斤石锁举过三寸，风里一声喝彩（斗气+2）');
    await move('rust_field');
    assert(WORLD.rust_field && WORLD.rust_field.sub === '小节二 · 荒原与碑林', '新小节「荒原与碑林」：铁锈荒原已接入');
    await move('memorial_grove');
    await WORLD.memorial_grove.npcs.veteran.talk();
    assert(S.sideQuests.warname === 'active', '支线【碑林的名字】接取');
    await WORLD.memorial_grove.actions.find(a => a.text.includes('碑文')).run();
    assert(S.flags.warRhyme, '无名将军碑文：开阵五旗的次序入手');
    await WORLD.memorial_grove.actions.find(a => a.text.includes('长明火')).run();
    assert(S.flags.groveBox, '石龛致意：前人留存的军饷（+7金币）');

    // —— 第五部扩写：医帐 / 篝火 ——
    await move('medic_tent');
    await WORLD.medic_tent.npcs.healer.talk();
    assert(S.sideQuests.medic === 'active', '新地点「随军医旧帐」：支线【军医的药单】接取（残影军医的最后一副药）');
    await WORLD.medic_tent.actions.find(a => a.text.includes('药柜的暗层')).run();
    assert(S.flags.medicGleam, '黑暗探索·医帐：药柜暗屉的「账记俺头上」（+4金币）');
    await move('watchfire_glade');
    await WORLD.watchfire_glade.actions.find(a => a.text.includes('坐进火堆')).run();
    assert(S.flags.gladeFire && WORLD.watchfire_glade.rest.cost === 0, '新地点「亡者的篝火」：披甲的影子为你让出空位（斗气+2，免费歇脚）');
    await move('medic_tent');
    await move('memorial_grove');

    // 折戟丘 → 白骨哨塔 → 影蚀辎重营：集齐三块军牌
    await move('rust_field');
    await move('broken_ridge');
    await WORLD.broken_ridge.actions.find(a => a.text.includes('丘脚采止血草')).run();
    assert((S.items.stanch || 0) === 1, '折戟丘脚：止血草其一');
    await WORLD.broken_ridge.actions.find(a => a.text.includes('翻找')).run();
    assert((S.items.dogtag || 0) === 1, '折戟丘：锈土里的军牌（其一）');
    await move('beacon_ruin');
    await WORLD.beacon_ruin.actions.find(a => a.text.includes('烽房的暗格')).run();
    assert(S.flags.beaconGleam, '新地点「烽燧残台」：值烽名册最后一个名字被朱笔划去——烽哑了三十年（+4金币）');
    await move('broken_ridge');
    await move('disarm_pit');
    await WORLD.disarm_pit.actions.find(a => a.text.includes('老圆盾')).run();
    assert(S.items.stop_shield === 1, '新地点「缴械坑」：千年来被摸亮的止兵圆盾（受伤-2）');
    await move('broken_ridge');
    await move('rust_field');
    await move('bone_tower');
    await WORLD.bone_tower.actions.find(a => a.text.includes('塔基旁采止血草')).run();
    assert((S.items.stanch || 0) === 2, '白骨哨塔基：止血草其二');
    await WORLD.bone_tower.actions.find(a => a.text.includes('哨塔远眺')).run();
    assert(S.flags.towerClimb && (S.items.dogtag || 0) === 2, '白骨哨塔：登塔远眺（军牌其二，+8金币）');
    await move('rust_field');
    await WORLD.rust_field.actions.find(a => a.text.includes('壕沟边采止血草')).run();
    assert((S.items.stanch || 0) === 3, '锈水壕沟：止血草其三（集齐三丛）');
    await move('shadow_camp');
    assert(S.flags.campClear && (S.items.dogtag || 0) === 3 && S.items.war_order, '影蚀辎重营：营卫败退（军牌其三，影蚀工令入手）');
    await WORLD.shadow_camp.actions.find(a => a.text.includes('辎重帐')).run();
    assert(S.items.war_map === 1, '辎重帐搜查：布阵图残页入手');
    assert(S.items.tmap_spoils === 1, '战斗掉落：营卫护心镜夹层里的军资窖图');
    await move('rusty_vault');
    await WORLD.rusty_vault.actions.find(a => a.text.includes('凿痕图样')).run();
    assert(S.flags.vaultMarks, '新地点「影蚀石料场」：古渠走向图——尽头凿着一个「渊」字');
    await WORLD.rusty_vault.actions.find(a => a.text.includes('火漆匣')).run();
    assert(S.flags.brockLetter && S.items.brock_letter === 1, '女王线·暗证：巴洛克的密信——官仓「石料」送往影蚀（火漆私章「巴」）');
    await move('shadow_camp');
    // —— 第五部扩写：缴械坑掘宝 + 跨部送信 ——
    await move('rust_field');
    await move('broken_ridge');
    await move('disarm_pit');
    await WORLD.disarm_pit.actions.find(a => a.text.includes('垫石下挖挖看')).run();
    assert(S.flags.dug_spoils && S.items.war_tally === 1, '藏宝图⑤·军资窖：垫石下的饷银铁箱（百战铜符·攻+2）');
    await move('broken_ridge');
    await move('rust_field');
    await move('war_road');
    await move('golden_road');
    await move('thresh_floor');
    await WORLD.thresh_floor.npcs.che.talk();
    assert(S.flags.letterGiven, '跨部任务【逃兵的家信】中程：车三爷认出儿子的笔迹（「锅里那碗，爹天天留着」）');
    await move('golden_road');
    await move('war_road');
    await move('deserter_hollow');
    await WORLD.deserter_hollow.npcs.mute.talk();
    assert(S.flags.deserterHome && S.sideQuests.letter === 'done' && S.items.deserter_blade === 1, '跨部任务【逃兵的家信】完成：半截舌踏上归途（逃兵的短刃·攻+3，声望+1）');
    await move('war_road');
    await move('rust_field');
    await move('memorial_grove');

    // 交付军牌 → 折戟长戈；战旗高台：五旗谜题 → BOSS → 第五部收尾
    await move('rust_field');
    await move('memorial_grove');
    await WORLD.memorial_grove.npcs.veteran.talk();
    assert(S.sideQuests.warname === 'done' && S.items.war_glaive === 1, '支线【碑林的名字】完成（折戟长戈·攻+4，+12金币）');
    await move('medic_tent');
    await WORLD.medic_tent.npcs.healer.talk();
    assert(S.sideQuests.medic === 'done' && S.items.medic_pouch === 1, '支线【军医的药单】完成：最后一副伤药（军医的药囊·生命上限+4）');
    await move('memorial_grove');
    await move('rust_field');
    await move('banner_hill');
    setChoices('盾', '枪', '骑', '弓', '医');
    await WORLD.banner_hill.actions.find(a => a.text.includes('残旗')).run();
    assert(S.flags.bannerOrder, '战旗高台：五旗按碑文次第升定，阵眼开启');
    await WORLD.banner_hill.actions.find(a => a.text.includes('断矛')).run();
    assert(S.flags.rune5 && S.flags.part5 && S.items.rune5 && S.items.war_mail, '战旗台：断矛败退，战争之印入手（战殁重铠·受伤-4）');
    assert(getEndings().includes('ending_war_warden'), '第五部收尾「战旗不倒」录入');
    assert(S.quest === 'q_bell', '主线推进：钟声在西边——暮色山道开启');
    assert(SKILLS.warhorn && SKILLS.warhorn.reqFlag === 'rune5' && S.flags.rune5, '符文技能：战号之锋随战争之印解锁');

    console.log('—— 第六部 · 暮钟之印 ——');
    topUp();
    await move('rust_field');
    await move('war_road');
    await move('dusk_path');
    assert(WORLD.dusk_path && WORLD.dusk_path.sub === '小节一 · 暮色山道', '新小节「暮色山道」：暮色修道院线开启');

    // —— 第六部扩写：守夜人小径 / 隐修洞窟 ——
    await move('watchman_path');
    await WORLD.watchman_path.npcs.lao.talk();
    assert(S.flags.laoMet && (S.items.roast_mushroom || 0) === 2, '新地点「守夜人小径」：老椴的炭火山蘑与「钟哑三十年」的山林旧闻');
    await move('hermit_cell');
    await WORLD.hermit_cell.actions.find(a => a.text.includes('收梢篇')).run();
    assert(S.flags.hermitPage && WORLD.hermit_cell.rest.cost === 0, '新地点「隐修的洞窟」：《收梢篇》残页抄到一半断了（斗气+2，免费歇脚）');
    await move('watchman_path');
    await move('dusk_path');
    await WORLD.dusk_path.actions.find(a => a.text.includes('神龛边采安神草')).run();
    assert((S.items.calm_herb || 0) === 1, '神龛边：安神草其一（沾香火气，药性最足）');
    await move('abbey_gate');
    assert(S.flags.abbeyOpen, '山门：击退影蚀辅祭，修士开门（战斗）');
    assert(S.items.tmap_relic === 1, '战斗掉落：辅祭袖袋里的圣物龛图（熏黄皮纸，指向龛室地砖）');
    await WORLD.abbey_gate.actions.find(a => a.text.includes('石阶缝')).run();
    assert((S.items.calm_herb || 0) === 2, '山门石阶缝：安神草其二');

    // —— 第六部扩写：墓园 / 龛室 / 回廊 ——
    await move('churchyard');
    await WORLD.churchyard.actions.find(a => a.text.includes('空棺')).run();
    assert(S.flags.emptyCoffin, '守钟人的空棺：棺盖内侧「替俺们听着长夜」，棺内叠着旧商袍');
    await WORLD.churchyard.actions.find(a => a.text.includes('骨库门')).run();
    assert(S.flags.boneGleam, '黑暗探索·墓园：地下骨库门前的四盏油灯与「照亮」的钱袋（+4金币）');
    await move('relic_vault');
    await WORLD.relic_vault.actions.find(a => a.text.includes('柜底暗层')).run();
    assert(S.flags.relicGleam, '黑暗探索·龛室：守龛人的私房钱（+4金币）');
    await WORLD.relic_vault.actions.find(a => a.text.includes('「叉」的地砖')).run();
    assert(S.flags.dug_relic && S.items.prayer_bell === 1 && S.items.dusk_emblem === 1, '藏宝图⑥·圣物龛：地砖暗龛起出银铃与圣徽（+15金币+守卫11）');
    await move('churchyard');
    await move('abbey_gate');
    await move('cloister_walk');
    await WORLD.cloister_walk.npcs.nim.talk();
    assert(S.flags.nimMet && S.sideQuests.candle === 'active' && (S.items.torch || 0) === 1, '新地点「缄默回廊」：小修士塞来火把，托付【为归人点烛】');
    await WORLD.cloister_walk.npcs.nim.talk();
    assert(S.flags.candleLit && S.sideQuests.candle === 'done' && (S.items.torch || 0) === 0, '支线【为归人点烛】完成：空棺前亮起替归人照路的烛（声望+1）');
    await WORLD.cloister_walk.actions.find(a => a.text.includes('字板')).run();
    assert(S.flags.boardRead, '廊柱字板：钟哑那夜「冲上钟楼的守钟人」与「下山的师兄」');
    await move('abbey_gate');
    await move('vespers_hall');
    assert(WORLD.vespers_hall && WORLD.vespers_hall.sub === '小节二 · 晚课与静室', '新小节「晚课与静室」：晚课堂已接入');
    setChoices('怎么做');
    await WORLD.vespers_hall.npcs.anselm.talk();
    assert(S.sideQuests.belltongue === 'active', '支线【哑了的暮钟】接取');
    await WORLD.vespers_hall.actions.find(a => a.text.includes('圣咏书')).run();
    assert(S.flags.vesperRhyme, '圣咏书朱批：摇钟次序入手');
    await WORLD.vespers_hall.actions.find(a => a.text.includes('问起那位行商')).run();
    assert(S.flags.ravenAbbey, '渡鸦暗线③：安瑟姆忆师兄——守钟人钟哑夜下山，借走《钟史·下卷》三十年未还');
    await move('scriptorium');
    await WORLD.scriptorium.actions.find(a => a.text.includes('经卷')).run();
    assert(S.flags.archiveLoot, '缮写室：抄经人的小字条「钟会响的」（+3金币）');
    await WORLD.scriptorium.actions.find(a => a.text.includes('借阅簿')).run();
    assert(S.flags.ravenBook, '渡鸦暗线②：借阅簿上的鸦羽签名——《钟史·下卷》出借三十年，归还栏空白');
    await move('refectory');
    const gPorridge = S.gold;
    await WORLD.refectory.actions.find(a => a.text.includes('热麦粥')).run();
    assert(S.gold === gPorridge, '新地点「修道院斋堂」：掌勺老修士的热麦粥（分文不取，生命+4）');
    await move('scriptorium');
    await move('vespers_hall');
    await move('quiet_cell');
    assert(WORLD.quiet_cell && WORLD.quiet_cell.rest && WORLD.quiet_cell.rest.cost === 3, '静室休整点（3金币）');
    await move('herb_garden');
    await WORLD.herb_garden.npcs.mo.talk();
    assert(S.flags.moMet && S.sideQuests.calmherb === 'active', '新地点「药草园」：墨手的木牌——全寺三十年没睡过整觉');
    await WORLD.herb_garden.actions.find(a => a.text.includes('畦垄间采安神草')).run();
    assert((S.items.calm_herb || 0) === 3, '药草园畦垄：安神草其三（集齐三丛）');
    await WORLD.herb_garden.npcs.mo.talk();
    assert(S.flags.calmherbDone && S.sideQuests.calmherb === 'done' && S.items.calm_sachet === 1, '支线【安神的药草】完成：头一只给外人的安神囊（斗气上限+3）');
    await move('quiet_cell');
    await move('bell_lower');
    assert(S.items.bell_tongue === 1, '钟楼石阶：辅祭败退，夺回钟舌（战斗）');
    await WORLD.bell_lower.actions.find(a => a.text.includes('暗格')).run();
    assert(S.flags.bellBox, '石阶暗格：前任守钟人的香火钱（+8金币）');
    setChoices('亡者', '生者', '归人');
    await WORLD.bell_lower.actions.find(a => a.text.includes('三口钟')).run();
    assert(S.flags.bellReady, '钟序合于朱批：钟鸣三巡，闩落门开');
    await move('vespers_hall');
    await WORLD.vespers_hall.npcs.anselm.talk();
    assert(S.sideQuests.belltongue === 'done' && S.items.jade_chime === 1, '支线【哑了的暮钟】完成（玉磬坠·斗气上限+6）');
    setChoices('七印');
    await WORLD.vespers_hall.npcs.anselm.talk();
    assert(S.flags.lore, '安瑟姆的遗嘱课：七印不是七把锁（终局对话钥匙）');
    await move('bell_lower');
    await move('bell_top');
    topUp();   // 消除游荡遭遇磨损对流程断言的随机影响
    await WORLD.bell_top.actions.find(a => a.text.includes('夜祷')).run();
    assert(S.flags.rune6 && S.flags.part6 && S.items.rune6, '钟楼顶层：夜祷咏叹声碎，暮钟之印入手（第六部通关）');
    assert(getEndings().includes('ending_bell_warden'), '第六部收尾「晚祷的回声」录入');
    assert(S.quest === 'q_abyss', '主线推进：最后一印在底下——影渊谷口开启');
    assert(SKILLS.knell && SKILLS.knell.reqFlag === 'rune6' && S.flags.rune6, '符文技能：暮钟长鸣（全体魔法）随暮钟之印解锁');

    console.log('—— 终部 · 深渊之印 ——');
    topUp();
    await move('bell_lower');
    await move('vespers_hall');
    await move('abbey_gate');
    await move('abyss_mouth');
    assert(WORLD.abyss_mouth && WORLD.abyss_mouth.sub === '终章前夜 · 影渊谷口', '新小节「终章前夜」：影渊谷口已接入');
    setChoices('托他送信', '告辞');
    await WORLD.abyss_mouth.npcs.raven.talk();
    assert(S.flags.alliance, '渡鸦的最后一单：白石城援军之约（终战先手）');
    await WORLD.abyss_mouth.actions.find(a => a.text.includes('布防')).run();
    assert(S.flags.abyssScout, '谷口远眺：三条入口尽收眼底');

    // —— 终部扩写：鸦记货栈（渡鸦线·揭晓）/ 黎明回望台 ——
    await move('raven_depot');
    await WORLD.raven_depot.actions.find(a => a.text.includes('旧木牌')).run();
    assert(S.flags.ravenTruth && S.items.raven_whistle === 1, '渡鸦线·揭晓：满墙名字是守望会的账——三十年没断过一单的信使（鸦羽铜哨·斗气上限+4）');
    assert(S.flags.ravenTag && S.flags.ravenBook && S.flags.ravenAbbey && S.flags.dockLedger, '渡鸦暗线四证齐聚：船坞货账 / 乌鸦木牌 / 借阅簿鸦羽签名 / 安瑟姆忆师兄');
    await move('abyss_mouth');
    await move('dawn_look');
    await WORLD.dawn_look.actions.find(a => a.text.includes('来路')).run();
    assert(S.flags.dawnLook, '新地点「黎明回望台」：一路走来的灯火、钟声与麦浪（斗气+3）');
    await move('abyss_mouth');

    // —— 折旗坡 → 独石桥（堂堂正正）——
    await move('stone_bridge');
    await move('broken_banner_slope');
    await WORLD.broken_banner_slope.actions.find(a => a.text.includes('小残旗')).run();
    assert(S.flags.slopeOath, '新地点「折旗坡」：千年断旗坡上拾一面绣着小花的家乡旗（斗气+2）');
    await move('stone_bridge');
    await move('fortress_court');
    assert(S.flags.bridgeClear, '独石桥：桥头守将黑剑断成两截（堂堂正正，正门洞开）');

    // —— 卡雅潮道走暗渠（沉船遗货）——
    setChoices('卡雅');
    await move('cliff_channel');
    assert(S.flags.channelClear && S.items.tide_lead === 1, '卡雅潮道：暗渠深处的自家沉船（+25金币，引潮坠·斗气上限+3）');
    await move('fortress_court');

    // —— 地牢救信使 + 女王线·兑现 ——
    await move('dungeon_cage');
    assert(S.flags.cageClear && S.flags.messengerFreed, '新地点「影渊地牢」：狱卒败退，救出女王亲信营信使罗经（声望+1）');
    await WORLD.dungeon_cage.npcs.luo.talk();
    assert(S.flags.luoGuide, '信使罗经：交出接头的暗号与进谷路线（「这条路线，我三天里用脚量出来的」）');
    await move('fortress_court');
    await WORLD.fortress_court.actions.find(a => a.text.includes('号角')).run();
    assert(S.flags.queenAid && S.items.queen_aegis === 1, '女王线·兑现：白石城戍卫营入谷佯攻（女王的护心镜·受伤-2）');

    // —— 无光前厅（黑暗探索 + 遗嘱旁证）——
    await move('dark_vestibule');
    await WORLD.dark_vestibule.actions.find(a => a.text.includes('先王铭文')).run();
    assert(S.flags.vestibLore, '无光前厅：先王铭文「念完的人，我们等了他很久」（斗气+2）');
    await WORLD.dark_vestibule.actions.find(a => a.text.includes('封石')).run();
    assert(S.flags.vestibGleam && (S.items.potion_big || 0) >= 1, '黑暗探索·前厅：撬开封石起出影蚀战备窖（大药水×1，+20金币）');
    await move('fortress_court');

    assert(WORLD.fortress_court.rest && WORLD.fortress_court.rest.cost === 0, '内庭扎营：决战前免费休整点');
    await WORLD.fortress_court.actions.find(a => a.text.includes('最后一议')).run();
    assert(S.flags.courtTalk, '巨门前的最后一议');
    topUp();   // 决战前满状态（内庭扎营的流程化表达）
    // 王座厅：门之眼（默认拒听）→ 莫格拉斯（默认拔剑）→ 决战（默认挥剑，侵蚀0 → 破晓之光）
    await move('throne_hall');
    assert(S.flags.gameClear && S.quest === 'q_done', '王座大厅：莫格拉斯败退，正文念完（终部通关）');
    assert(getEndings().includes('ending_dawn'), '最终结局「破晓之光」录入');
    assert(getEndings().length === 6, '结局收集：终局录入后共 6 / 15（含未走的侵蚀路线与终局分支）');
    // 通关后重访
    await move('fortress_court');
    await move('throne_hall');
    assert(WORLD.throne_hall.desc.length > 0 && S.loc === 'throne_hall', '通关后重访：王座空置，艾尔多兰继续行走');
    openMap();
    const endHtml = document.querySelector('#modal-content').innerHTML;
    assert(endHtml.includes('已踏足 139 / 139 处'), '世界地图总览·终局：全境 139 处地点随主线与扩写尽数点亮（139 / 139）');
    closeModal();

    console.log('\n★ 冒烟测试全部通过：' + passed + ' 项断言 ✓');
    console.log('  最终状态：Lv.' + S.level + ' | 金币 ' + S.gold + ' | 声望 ' + S.rep + ' | 侵蚀 ' + S.corruption);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ 冒烟测试失败：' + (err && err.stack || err));
    process.exit(1);
  }
})();
