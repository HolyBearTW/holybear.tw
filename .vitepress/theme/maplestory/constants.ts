import { DashboardData, ItemOption } from './types';
import { mapleAsset } from './assets';

const EMPTY_OPTION: ItemOption = {
  str: "0", dex: "0", int: "0", luk: "0", max_hp: "0", max_mp: "0",
  attack_power: "0", magic_power: "0", armor: "0", speed: "0", jump: "0",
  boss_damage: "0", ignore_monster_armor: "0", all_stat: "0", damage: "0",
  equipment_level_decrease: 0, max_hp_rate: "0", max_mp_rate: "0"
};

export const SERVER_ICONS: Record<string, string> = {
  '艾麗亞': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/ai_li_ya.png',
  '普力特': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/pu_li_te.png',
  '琉德': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/liu_de.png',
  '優依娜': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/you_yi_na.png',
  '愛麗西亞': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/ai_li_xi_ya.png',
  '殺人鯨': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/sha_ren_jing.png',
  '賽蓮': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/silien.png',
  '米特拉': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/reboot.png',
  'Reboot': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/reboot.png',
  '挑戰者': mapleAsset('ChallengerServer.png')
};

export const getMaplestoryIoMapVersion = (mapId: string): string => (
  ['410004100', '875000000', '875010000'].includes(mapId) ? '270' : '248'
);

export type MapSceneAnchor = { x: number; y: number };

// One fixed spawn foothold per map. These coordinates are exported from the
// local WZ map's `sp` portal + foothold and are intentionally not recalculated
// in the browser, so a map never jumps to another platform between renders.
export const MAP_SCENE_ANCHORS: Record<string, MapSceneAnchor> = {
  '100000000': { x: 2476, y: 1134 },
  '100030102': { x: 1787, y: 759 },
  '100051000': { x: 781, y: 886 },
  '101000000': { x: 958, y: 1323 },
  '101000200': { x: 471, y: 740 },
  '101050000': { x: 614, y: 1171 },
  '102000000': { x: 412, y: 1834 },
  // 墮落城市：保留目前已調好的夜使者立足點。
  '103000000': { x: 2429, y: 1234 },
  '103050100': { x: 1390, y: 651 },
  '120000000': { x: 1211, y: 542 },
  '130000000': { x: 2015, y: 815 },
  '140000000': { x: 2402, y: 657 },
  '150000000': { x: 1093, y: 176 },
  '3000300': { x: 230, y: 636 },
  '310000000': { x: 4302, y: 871 },
  '320000000': { x: 1078, y: 388 },
  // WZ has the Kinesis spawn portal but no matching foothold record.
  '331000000': { x: 1149, y: 1374 },
  '400000000': { x: 3834, y: 914 },
  '402000000': { x: 3625, y: 1211 },
  '402000500': { x: 346, y: 807 },
  '402000600': { x: 3194, y: 808 },
  '410000000': { x: 3454, y: 939 },
  '410000200': { x: 4343, y: 903 },
  '410000300': { x: 3068, y: 900 },
  '410000402': { x: 1563, y: 823 },
  '410004000': { x: 3276, y: 1221 },
  '410004100': { x: 1424, y: 958 },
  '410007500': { x: 1680, y: 1597 },
  '807000000': { x: 5341, y: 1780 },
  '875000000': { x: 227, y: 823 },
  '875010000': { x: 1264, y: 709 },
};

export const MAP_SCENE_OPTIONS = [
  ['100000000', '弓箭手村'],
  ['100030102', '龍魔導士起始地'],
  ['100051000', '開拓者起始地'],
  ['101000000', '魔法森林'],
  ['101000200', '夜光起始地'],
  ['101050000', '精靈遊俠起始地'],
  ['102000000', '勇士之村'],
  ['103000000', '墮落城市'],
  ['103050100', '影武者起始地'],
  ['120000000', '鯨魚號'],
  ['130000000', '耶雷弗'],
  ['140000000', '瑞恩'],
  ['150000000', '幻影俠盜起始地'],
  ['3000300', '重砲指揮官起始地'],
  ['310000000', '埃德爾斯坦'],
  ['320000000', '神之子神殿'],
  ['331000000', '凱內西斯起始地'],
  ['400000000', '萬神殿'],
  ['402000000', '卡蒂娜起始地'],
  ['402000500', '伊利恩起始地'],
  ['402000600', '亞克起始地'],
  ['410000000', '隱月起始地'],
  ['410000200', '虎影起始地'],
  ['410000300', '阿戴爾起始地'],
  ['410000402', '凱殷起始地'],
  ['410004000', '菈菈起始地'],
  ['410004100', '蓮起始地'],
  ['410007500', '卡莉起始地'],
  ['807000000', '劍豪／陰陽師起始地'],
  ['875000000', '墨玄起始地'],
  ['875010000', '琳恩起始地'],
] as const;

export const getJobBackgroundMap = (jobName: string): string => {
  if (!jobName) return '100000000';
  if (['皇家', '米哈逸', '聖魂', '烈焰', '破風', '暗夜', '閃雷'].some(k => jobName.includes(k))) return '130000000';
  if (['反抗軍', '惡魔', '傑諾', '煉獄', '機甲', '狂豹', '爆拳'].some(k => jobName.includes(k))) return '310000000';
  if (jobName.includes('夜光')) return '101000200';
  if (jobName.includes('精靈遊俠')) return '101050000';
  if (jobName.includes('狂狼勇士')) return '140000000';
  if (jobName.includes('幻影俠盜')) return '150000000';
  if (jobName.includes('龍魔導士')) return '100030102';
  if (jobName.includes('隱月')) return '410000000';
  if (jobName.includes('虎影')) return '410000200';
  if (jobName.includes('菈菈')) return '410004000';
  if (jobName.includes('蓮')) return '410004100';
  if (['凱撒', '天使破壞者'].some(k => jobName.includes(k))) return '400000000';
  if (jobName.includes('卡蒂娜')) return '402000000';
  if (jobName.includes('凱殷')) return '410000402';
  if (jobName.includes('阿戴爾')) return '410000300';
  if (jobName.includes('亞克')) return '402000600';
  if (jobName.includes('伊利恩')) return '402000500';
  if (jobName.includes('卡莉')) return '410007500';
  if (jobName.includes('神之子')) return '320000000';
  if (jobName.includes('凱內西斯')) return '331000000';
  if (['劍豪', '陰陽師'].some(k => jobName.includes(k))) return '807000000';
  if (jobName.includes('墨玄')) return '875000000';
  if (jobName.includes('琳恩')) return '875010000';
  if (jobName.includes('開拓者')) return '100051000';
  if (jobName.includes('重砲')) return '3000300';
  if (jobName.includes('影武者')) return '103050100';
  if (['劍士', '英雄', '聖騎士', '黑騎士', '狂戰士', '十字軍', '騎士', '槍騎兵', '龍騎士'].some(k => jobName.includes(k))) return '102000000';
  if (['法師', '火、毒', '冰、雷', '主教', '巫師', '魔導士', '僧侶', '祭司', '幻獸師'].some(k => jobName.includes(k))) return '101000000';
  if (['盜賊', '夜使者', '暗影神偷', '影武者', '刺客', '暗殺者', '俠盜', '神偷'].some(k => jobName.includes(k))) return '103000000';
  if (['海盜', '拳霸', '槍神'].some(k => jobName.includes(k))) return '120000000';
  return '100000000';
};

export const getJobFallbackVillageMap = (jobName: string): string => {
  if (!jobName) return '100000000';
  if (jobName.includes('爆拳槍神')) return '102000000';

  if (['法師', '巫師', '魔導士', '主教', '僧侶', '祭司', '烈焰巫師', '龍魔導士', '夜光', '煉獄巫師', '凱內西斯', '伊利恩', '菈菈', '陰陽師', '幻獸師', '琳恩'].some((keyword) => jobName.includes(keyword))) return '101000000';
  if (['弓箭手', '弓手', '箭神', '神射手', '破風使者', '精靈遊俠', '狂豹獵人', '開拓者', '凱殷'].some((keyword) => jobName.includes(keyword))) return '100000000';
  if (['盜賊', '夜使者', '暗影神偷', '影武者', '刺客', '暗殺者', '俠盜', '神偷', '暗夜行者', '幻影俠盜', '傑諾', '卡蒂娜', '虎影', '卡莉'].some((keyword) => jobName.includes(keyword))) return '103000000';
  if (['海盜', '拳霸', '槍神', '重砲', '閃雷悍將', '機甲戰神', '天使破壞者', '隱月', '亞克', '墨玄'].some((keyword) => jobName.includes(keyword))) return '120000000';
  if (['劍士', '戰士', '英雄', '聖騎士', '黑騎士', '狂戰士', '十字軍', '米哈逸', '聖魂劍士', '狂狼勇士', '惡魔', '爆拳槍神', '凱撒', '神之子', '阿戴爾', '劍豪', '蓮'].some((keyword) => jobName.includes(keyword))) return '102000000';

  return '100000000';
};
