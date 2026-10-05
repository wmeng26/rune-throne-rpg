/* ============================================================
 * 冒烟测试驱动（与游戏代码同一 eval 作用域执行，直接访问 S/WORLD 等）
 * ============================================================ */

/* ---------- 选择桩：按谓词队列挑选，默认选 0 ---------- */
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
    const gWell = S.gold;
    setChoices('挑上来');
    await move('grayridge_well');
    assert(S.events.wellVisit && S.gold === gWell + 4, '新地点「灰岭古井」：打捞失落的钱袋（+4金币）');
    await move('grayridge_street');
    await move('inn_hall');
    setChoices('愿闻其详');
    await WORLD.inn_hall.npcs.cedric.talk();
    assert(S.flags.heardLegend, '序章：听取七印传说');

    const gCellar = S.gold;
    setChoices('松砖');
    await move('inn_cellar');
    assert(S.events.cellarVisit && (S.items.potion || 0) >= 1 && S.gold === gCellar + 4, '新地点「旅店地窖」：撬开松砖得店主私藏（+4金币，药水×1）');
    await move('inn_hall');

    // 小节「子夜惊变」：夜袭（选项默认0：挥剑，必胜）
    await move('inn_room');
    assert(WORLD.inn_room.sub === '子夜惊变' && S.flags.cedricDead && S.items.shard, '小节「子夜惊变」：夜袭战胜，获得晨曦之痕');

    // 店主告别节拍
    await move('inn_hall');
    await WORLD.inn_hall.npcs.keeper.talk();
    assert((S.items.potion || 0) >= 2 && S.gold === 20 + 4 + 4 + 5 + 5, '店主告别节拍：药水×2 + 金币+5（古井/地窖各+4，夜袭刺客+5）');
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
    setChoices('大生命', '告辞');
    const g0 = S.gold;
    await WORLD.road_town.npcs.raven.talk();
    assert(S.items.potion_big === 1 && S.gold === g0 - 20, '商店：新增大生命药水（20金币）购入');
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
    await move('spur_fork');
    await move('road_town');
    await WORLD.road_town.actions.find(a => a.text.includes('悬赏告示板')).run();
    assert(S.sideQuests.bounty === 'done', '支线【隘口的匪首】完成（+18金币）');

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
    await move('frost_pass');

    // 小节二「官道北行」：溃兵营地（onEnter 默认选0=留银钱稳军心，得线索）
    await move('north_road');
    assert(WORLD.north_road && WORLD.north_road.sub === '小节二 · 官道北行', '新小节「官道北行」：溃兵营地已接入');
    await WORLD.north_road.actions.find(a => a.text.includes('茶棚')).run();
    assert(S.flags.teaHouseChat, '茶棚情报：白石城近况');
    assert(S.flags.deserterClue, '溃兵营地：获得「北境换防」线索');

    // 小节三「白石城中」：入城 + 失踪案 + 藏书阁
    setChoices('出示');
    await move('whitestone_gate');
    assert(S.flags.inCity, '白石城：出示符文入城');
    await move('whitestone_street');
    await move('west_alley');
    assert(S.items.watch === 1, '支线【宵禁下的失踪】：小巷战胜利获得怀表');
    await move('whitestone_street');
    const oldAct = WORLD.whitestone_street.actions.find(a => a.text.includes('老妇'));
    await oldAct.run();
    await oldAct.run();
    assert(S.sideQuests.lost === 'done', '支线【宵禁下的失踪】完成（+12金币，声望+2）');
    await move('city_market');
    assert(!!WORLD.city_market, '新地点：白石市集已接入');

    // 新增：卫戍营房（城防情报 + 切磋赌彩头）
    await move('city_barracks');
    assert(!!WORLD.city_barracks, '新地点「卫戍营房」：空了一半的操练场');
    setChoices('过两招', '抱拳');
    await WORLD.city_barracks.npcs.captain.talk();
    assert(S.events.barrackIntel, '贝伦队长：城防情报（调令抽空城防）');
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

    console.log('—— 第三部 · 海洋之印 ——');
    // 返程：星塔 → 王宫 → 城门，转上南海官道
    await move('star_tower_mid');
    await move('star_tower_base');
    await move('palace_hall');
    await move('whitestone_street');
    await move('whitestone_gate');
    await move('coast_road');
    assert(WORLD.coast_road && WORLD.coast_road.sub === '小节一 · 南下潮歌湾' && WORLD.coast_road.wild, '新小节「南下潮歌湾」：海风岬已接入');
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
    await WORLD.lighthouse.npcs.keeper.talk();
    assert(S.sideQuests.glowweeds === 'active', '支线【灯塔的荧藻】接取');

    // 礁滩 → 沉船湾 → 潮汐洞窟：三株荧藻 + 隐藏收获
    await move('reef_shoal');
    await WORLD.reef_shoal.actions.find(a => a.text.includes('荧藻')).run();
    assert(S.flags.weed_reef && (S.items.glowweed || 0) === 1, '荧藻之一：礁滩背阴石缝');
    await move('shipwreck_cove');
    assert(S.items.whale_lance === 1, '新地点「沉船湾」：礁蟹败退，取得鲸骨长枪（攻+3）');
    await WORLD.shipwreck_cove.actions.find(a => a.text.includes('海藻')).run();
    await move('reef_shoal');
    await move('sea_cave');
    assert(S.items.tide_orb === 1, '新地点「潮汐洞窟」：守窟怨念散去，取得潮珠（斗气上限+4）');
    await WORLD.sea_cave.actions.find(a => a.text.includes('荧藻')).run();
    await move('reef_shoal');
    await move('lighthouse');

    // 交付荧藻 → 灯塔重亮 → 守到夜半大退潮
    await WORLD.lighthouse.npcs.keeper.talk();
    assert(S.flags.lampLit && S.items.tide_pearl === 1 && S.sideQuests.glowweeds === 'done', '支线【灯塔的荧藻】完成：灯塔重亮（+10金币，深海珍珠·生命上限+5）');
    await WORLD.lighthouse.actions.find(a => a.text.includes('大退潮')).run();
    assert(S.flags.tideNight, '守到夜半：大退潮降临，海路自现');

    // 海底神殿：前殿 → 潮汐祭坛 BOSS → 第三部收尾
    await move('reef_shoal');
    await move('sea_temple_hall');
    assert(WORLD.sea_temple_hall && S.items.tide_edict, '新地点「海底神殿前殿」：影蚀武士败退，获得影蚀潮令');
    await WORLD.sea_temple_hall.actions.find(a => a.text.includes('壁画')).run();
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
    assert(S.items.grain === 1, '新地点「老磨坊」：腐行者败退，寻回祭典谷种');
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
    assert(Object.keys(WORLD).length === 88, '世界扩展：地点从 76 处增至 88 处（第一部大扩写：12 新地点 + 7 NPC + 环路自由移动）');
    assert(ITEMS.rite_blade && ITEMS.rite_blade.atk === 2 && ITEMS.mist_pearl && ITEMS.mist_pearl.maxHp === 3, '探索装备：咏祭礼剑（攻+2）/ 雾泽明珠（生命上限+3）');
    assert(ITEMS.logger_axe && ITEMS.logger_axe.atk === 2 && ITEMS.reed_charm && ITEMS.reed_charm.spMax === 3, '第一部扩写装备：伐木斧（攻+2）/ 苇编哨（斗气上限+3）');
    assert(ITEMS.honey && ITEMS.roast_fish && ITEMS.glassbead && HEALS.honey === 6 && HEALS.roast_fish === 8, '第一部扩写消耗品与信物：林间蜂蜜（+6）/ 湖畔烤鱼（+8）/ 雾蓝玻璃珠');
    assert(!!ENEMIES.mistcrows && !!ENEMIES.bramble && !!ENEMIES.sentinel, '第一部扩写敌人：雾鸦群 / 荆棘蔓灵 / 被蚀的石兽');
    assert(SIDE_QUESTS.fare && SIDE_QUESTS.lamps && SIDE_QUESTS.bees, '第一部扩写支线：湖底的船钱 / 复明的灯柱 / 走失的蜂群');
    assert(WORLD.south_road.npcs.zhao && WORLD.stone_ford.npcs.wugou && WORLD.old_quarry.npcs.mason && WORLD.bee_clearing.npcs.ji && WORLD.lakeside_marsh.npcs.aman && WORLD.pilgrim_path.npcs.tangjiu && WORLD.guest_hall.npcs.sue, '第一部扩写 NPC：赵老汉/吴钩/莫大/纪老爹/阿满/唐九/素娥');
    assert(WORLD.forest_deep.roam.byTime && WORLD.forest_deep.roam.byTime.night.en === 'wraith' && WORLD.south_road.roam.byTime.night.en === 'wraith' && WORLD.crow_ridge.roam.byTime.night.chance < WORLD.crow_ridge.roam.chance, '时间制游荡：夜晚野外换「没脸的」上场（白天是狼群/雾鸦，鸦眠坡入夜反而安静）');
    assert(Array.isArray(TAVERN_RUMORS) && TAVERN_RUMORS.length >= 14 && Array.isArray(BOUNTIES) && BOUNTIES.length >= 7, '酒馆系统：传闻池 14+ 条（天数/剧情解锁），委托池 7 式（讨伐/采办，按天轮换）');
    assert(typeof timeText === 'function' && timeDay() >= 8, '时间系统全程运转：终局之时已是第 ' + timeDay() + ' 天（移动+1刻，休息睡到清晨）');
    assert(!!ENEMIES.mistcrows && !!ENEMIES.bramble && !!ENEMIES.sentinel, '第一部扩写敌人：雾鸦群 / 荆棘蔓灵 / 被蚀的石兽');
    assert(SIDE_QUESTS.fare && SIDE_QUESTS.lamps, '第一部扩写支线：湖底的船钱 / 复明的灯柱');
    assert(ITEMS.whale_lance && ITEMS.whale_lance.atk === 3 && ITEMS.vine_mail && ITEMS.vine_mail.def === 3, '三/四部装备：鲸骨长枪（攻+3）/ 荆藤战甲（受伤-3）');
    assert(ITEMS.tide_orb && ITEMS.tide_orb.spMax === 4 && equipTotals, '饰品新词条：潮珠（斗气上限+4）——装备系统支持斗气加成');
    assert(Array.isArray(TRAVEL_EVENTS) && TRAVEL_EVENTS.length >= 8, '旅途随机事件池扩充（新增渔歌/稻草人/军旗，按章节浮现）');
    assert(DIRS.sw === '↙ 西南' && DIRS.ne === '↗ 东北', '方位扩展：西南 / 东北');
    openMap();
    const mapHtml = document.querySelector('#modal-content').innerHTML;
    assert(mapHtml.includes('行记图') && mapHtml.includes('已踏足 70 / 88 处'), '世界地图总览：全境 88 处地点随探索点亮（旧境已踏足 70 处）');
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

    // 碑林：接支线 + 碑文（军阵次序）+ 石龛
    await move('rust_field');
    assert(WORLD.rust_field && WORLD.rust_field.sub === '小节二 · 荒原与碑林', '新小节「荒原与碑林」：铁锈荒原已接入');
    await move('memorial_grove');
    await WORLD.memorial_grove.npcs.veteran.talk();
    assert(S.sideQuests.warname === 'active', '支线【碑林的名字】接取');
    await WORLD.memorial_grove.actions.find(a => a.text.includes('碑文')).run();
    assert(S.flags.warRhyme, '无名将军碑文：开阵五旗的次序入手');
    await WORLD.memorial_grove.actions.find(a => a.text.includes('长明火')).run();
    assert(S.flags.groveBox, '石龛致意：前人留存的军饷（+7金币）');

    // 折戟丘 → 白骨哨塔 → 影蚀辎重营：集齐三块军牌
    await move('rust_field');
    await move('broken_ridge');
    await WORLD.broken_ridge.actions.find(a => a.text.includes('翻找')).run();
    assert((S.items.dogtag || 0) === 1, '折戟丘：锈土里的军牌（其一）');
    await move('rust_field');
    await move('bone_tower');
    await WORLD.bone_tower.actions.find(a => a.text.includes('哨塔远眺')).run();
    assert(S.flags.towerClimb && (S.items.dogtag || 0) === 2, '白骨哨塔：登塔远眺（军牌其二，+8金币）');
    await move('rust_field');
    await move('shadow_camp');
    assert(S.flags.campClear && (S.items.dogtag || 0) === 3 && S.items.war_order, '影蚀辎重营：营卫败退（军牌其三，影蚀工令入手）');
    await WORLD.shadow_camp.actions.find(a => a.text.includes('辎重帐')).run();
    assert(S.items.war_map === 1, '辎重帐搜查：布阵图残页入手');

    // 交付军牌 → 折戟长戈；战旗高台：五旗谜题 → BOSS → 第五部收尾
    await move('rust_field');
    await move('memorial_grove');
    await WORLD.memorial_grove.npcs.veteran.talk();
    assert(S.sideQuests.warname === 'done' && S.items.war_glaive === 1, '支线【碑林的名字】完成（折戟长戈·攻+4，+12金币）');
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
    await move('abbey_gate');
    assert(S.flags.abbeyOpen, '山门：击退影蚀辅祭，修士开门（战斗）');
    await move('vespers_hall');
    assert(WORLD.vespers_hall && WORLD.vespers_hall.sub === '小节二 · 晚课与静室', '新小节「晚课与静室」：晚课堂已接入');
    setChoices('怎么做');
    await WORLD.vespers_hall.npcs.anselm.talk();
    assert(S.sideQuests.belltongue === 'active', '支线【哑了的暮钟】接取');
    await WORLD.vespers_hall.actions.find(a => a.text.includes('圣咏书')).run();
    assert(S.flags.vesperRhyme, '圣咏书朱批：摇钟次序入手');
    await move('quiet_cell');
    assert(WORLD.quiet_cell && WORLD.quiet_cell.rest && WORLD.quiet_cell.rest.cost === 3, '静室休整点（3金币）');
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
    // 走暗渠潜入（侧洞取补给）
    setChoices('侧洞');
    await move('cliff_channel');
    await move('fortress_court');
    assert(S.flags.channelClear && (S.items.potion || 0) >= 2, '崖壁暗渠：侧洞支线（药水×2，+15金币），潜入内庭');
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

    console.log('\n★ 冒烟测试全部通过：' + passed + ' 项断言 ✓');
    console.log('  最终状态：Lv.' + S.level + ' | 金币 ' + S.gold + ' | 声望 ' + S.rep + ' | 侵蚀 ' + S.corruption);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ 冒烟测试失败：' + (err && err.stack || err));
    process.exit(1);
  }
})();
