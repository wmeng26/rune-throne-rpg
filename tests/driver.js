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

/* ---------- 冒烟主线 ---------- */
(async () => {
  try {
    console.log('—— 序章 · 风雨之夜 ——');
    startNewGame('测试者');
    S.maxHp = 500; S.hp = 500; S.spMax = 60; S.sp = 60;   // 测试用高血量，聚焦流程而非数值
    S.exp = -1000000;                                      // 屏蔽升级弹窗，避免占用选择桩队列（升级另测）
    assert(S.gold === 20, '初始金币 20');

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

    console.log('—— 第一部 · 晨曦之印 ——');
    // 小节一「南下古道」：荒废烽燧
    await move('grayridge_gate');
    await move('south_road');
    assert(WORLD.south_road && WORLD.south_road.sub === '小节一 · 南下古道' && WORLD.south_road.wild, '新小节「南下古道」：荒废烽燧已接入（荒野路途）');
    const gBeacon = S.gold;
    await WORLD.south_road.actions.find(a => a.text.includes('烽燧残台')).run();
    assert(S.flags.beaconClimb && S.gold >= gBeacon + 6, '烽燧远眺：拾获金币，望见圣殿金顶');
    await move('forest_cross');

    // 小节二「迷雾森林」：采药支线
    await move('hermit_hut');
    await WORLD.hermit_hut.npcs.margo.talk();
    assert(S.sideQuests.herb === 'active', '支线【月下香草】接取');
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
    await move('mist_lake');
    await move('forest_road');
    await move('forest_cross');
    await move('forest_deep');
    const gBefore = S.gold;
    await move('hunter_lodge');
    assert(S.gold >= gBefore + 12, '废弃猎屋：拾获金币');
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
    await move('hermit_hut');
    await WORLD.hermit_hut.npcs.margo.talk();
    assert(S.sideQuests.herb === 'done', '支线【月下香草】完成（+8金币，2药水）');

    // 小节三「符文圣殿」：大门 + 回廊 + 三试炼
    await move('temple_foot');
    await move('temple_gate');
    await WORLD.temple_gate.actions.find(a => a.text === '按下「晨曦」符文').run();
    assert(S.flags.gateOpen, '圣殿大门开启');
    await move('temple_hall');
    await WORLD.temple_hall.actions.find(a => a.text.includes('经卷架')).run();
    await move('temple_cloister');
    assert(WORLD.temple_cloister && S.items.shadow_note, '新地点「圣殿回廊」：影蚀斥候战胜利，获得影蚀手记');
    await WORLD.temple_cloister.actions.find(a => a.text.includes('搜查坍塌的僧舍')).run();
    assert(S.items.old_seal === 1, '僧舍搜查：获得守殿人印戒（生命上限+4）');
    await WORLD.temple_cloister.actions.find(a => a.text.includes('壁画')).run();

    // 新地点：圣殿地宫（回廊下行）
    await move('temple_crypt');
    assert(!!WORLD.temple_crypt && S.items.rite_blade === 1, '新地点「圣殿地宫」：守墓的怨念散去，取得咏祭礼剑');
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

    // 小节四「晨曦重燃」
    await move('temple_altar');
    await WORLD.temple_altar.actions.find(a => a.text.includes('晨曦之痕')).run();
    assert(S.flags.part1 && S.flags.thorne && WORLD.temple_altar.sub === '小节四 · 晨曦重燃', '小节「晨曦重燃」：符文重燃，索恩入队');
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
    await move('harvest_altar');
    const hpFinal = S.maxHp;
    setChoices('稻', '麦', '黍', '豆', '麻');
    await WORLD.harvest_altar.actions.find(a => a.text.includes('五谷槽')).run();
    assert(S.flags.riddleSolved, '丰年祭坛：五谷排布合于农谚，坛门自开');
    await WORLD.harvest_altar.actions.find(a => a.text.includes('饕穰')).run();
    assert(S.flags.rune4 && S.flags.part4 && S.items.rune4, '丰年祭坛：饕穰溃散，丰收之印入手（第四部通关）');
    assert(S.maxHp === hpFinal + 6, '丰收共鸣：生命上限 +6');
    assert(getEndings().includes('ending_harvest_guardian'), '第四部收尾「大地的守望者」录入');
    assert(S.quest === 'q_horizon', '主线推进：七印之路已行其四，终部预告');

    console.log('—— 系统 · 队伍与成长 v2 ——');
    // 世界扩展总断言：新地点 / 新装备 / 旅途事件 / 地图总览
    assert(Object.keys(WORLD).length === 53, '世界扩展：地点从 39 处增至 53 处');
    assert(ITEMS.rite_blade && ITEMS.rite_blade.atk === 2 && ITEMS.mist_pearl && ITEMS.mist_pearl.maxHp === 3, '探索装备：咏祭礼剑（攻+2）/ 雾泽明珠（生命上限+3）');
    assert(ITEMS.whale_lance && ITEMS.whale_lance.atk === 3 && ITEMS.vine_mail && ITEMS.vine_mail.def === 3, '三/四部装备：鲸骨长枪（攻+3）/ 荆藤战甲（受伤-3）');
    assert(ITEMS.tide_orb && ITEMS.tide_orb.spMax === 4 && equipTotals, '饰品新词条：潮珠（斗气上限+4）——装备系统支持斗气加成');
    assert(Array.isArray(TRAVEL_EVENTS) && TRAVEL_EVENTS.length >= 7, '旅途随机事件池扩充（新增渔歌/稻草人，按章节浮现）');
    assert(DIRS.sw === '↙ 西南' && DIRS.ne === '↗ 东北', '方位扩展：西南 / 东北');
    openMap();
    const mapHtml = document.querySelector('#modal-content').innerHTML;
    assert(mapHtml.includes('行记图') && mapHtml.includes('已踏足 53 / 53 处'), '世界地图总览：全境 53 处地点随探索点亮');
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
    assert(getEndings().length === 3 && ENDINGS.length === 6, '结局收集：三/四部收尾各录一枚（3 / 6，含未走的侵蚀路线）');

    console.log('\n★ 冒烟测试全部通过：' + passed + ' 项断言 ✓');
    console.log('  最终状态：Lv.' + S.level + ' | 金币 ' + S.gold + ' | 声望 ' + S.rep + ' | 侵蚀 ' + S.corruption);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ 冒烟测试失败：' + (err && err.stack || err));
    process.exit(1);
  }
})();
