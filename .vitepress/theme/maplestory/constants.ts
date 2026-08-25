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

export const getJobBackgroundMap = (jobName: string): string => {
  if (!jobName) return '100000000';
  if (['皇家', '米哈逸', '聖魂', '烈焰', '破風', '暗夜', '閃雷'].some(k => jobName.includes(k))) return '130000000';
  if (['反抗軍', '惡魔', '傑諾', '煉獄', '機甲', '狂豹', '爆拳'].some(k => jobName.includes(k))) return '310000000';
  if (jobName.includes('夜光')) return '101000200';
  if (jobName.includes('精靈遊俠')) return '101050000';
  if (jobName.includes('狂狼勇士')) return '140000000';
  if (jobName.includes('幻影俠盜')) return '915000000';
  if (jobName.includes('龍魔導士')) return '100030102';
  if (jobName.includes('隱月')) return '410000000';
  if (jobName.includes('虎影')) return '410000200';
  if (jobName.includes('菈菈')) return '410004003';
  if (jobName.includes('蓮')) return '102000000';
  if (['凱撒', '天使破壞者', '卡蒂娜', '凱殷'].some(k => jobName.includes(k))) return '400000000';
  if (['阿戴爾', '亞克', '伊利恩', '卡莉'].some(k => jobName.includes(k))) return '402000000';
  if (jobName.includes('神之子')) return '321000000';
  if (jobName.includes('凱內西斯')) return '331000000';
  if (['劍士', '英雄', '聖騎士', '黑騎士', '狂戰士', '十字軍', '騎士', '槍騎兵', '龍騎士'].some(k => jobName.includes(k))) return '102000000';
  if (['法師', '火、毒', '冰、雷', '主教', '巫師', '魔導士', '僧侶', '祭司', '琳恩', '幻獸師'].some(k => jobName.includes(k))) return '101000000';
  if (['盜賊', '夜使者', '暗影神偷', '影武者', '刺客', '暗殺者', '俠盜', '神偷'].some(k => jobName.includes(k))) return '103000000';
  if (['海盜', '拳霸', '槍神', '重砲', '墨玄'].some(k => jobName.includes(k))) return '120000000';
  return '100000000';
};
