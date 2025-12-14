import { DashboardData, ItemOption } from './types';

const EMPTY_OPTION: ItemOption = {
  str: "0", dex: "0", int: "0", luk: "0", max_hp: "0", max_mp: "0",
  attack_power: "0", magic_power: "0", armor: "0", speed: "0", jump: "0",
  boss_damage: "0", ignore_monster_armor: "0", all_stat: "0", damage: "0",
  equipment_level_decrease: 0, max_hp_rate: "0", max_mp_rate: "0"
};

export const MOCK_DATA: DashboardData = {
  basic: {
    character_name: "DemoHero",
    world_name: "Scania",
    character_gender: "Female",
    character_class: "Bishop",
    character_class_level: "6",
    character_level: 275,
    character_exp: 123456789,
    character_exp_rate: "45.23",
    character_guild_name: "Legends",
    character_image: "https://picsum.photos/200/200", 
    character_date_create: "2021-03-24T00:00:00Z"
  },
  lastUpdated: "2024-05-20 20:41:47",
  stat: {
    date: "2024-05-20",
    character_class: "Bishop",
    remain_ap: 0,
    pop: 253,
    final_stat: [
      { stat_name: "STR", stat_value: "1500" },
      { stat_name: "DEX", stat_value: "1500" },
      { stat_name: "INT", stat_value: "45000" },
      { stat_name: "LUK", stat_value: "4000" },
      { stat_name: "HP", stat_value: "50000" },
      { stat_name: "MP", stat_value: "120000" },
      { stat_name: "Combat Power", stat_value: "377645860" },
      { stat_name: "Final Damage", stat_value: "101.77" },
      { stat_name: "Boss Damage", stat_value: "584" },
      { stat_name: "Ignore Defense Rate", stat_value: "96.98" },
      { stat_name: "Critical Damage", stat_value: "113.65" },
      { stat_name: "Attack Power", stat_value: "6200" },
      { stat_name: "Magic Power", stat_value: "1430" },
      { stat_name: "Star Force", stat_value: "326" }
    ]
  },
  ability: {
    date: "2024-05-20",
    ability_grade: "Legendary",
    remain_fame: 12345,
    ability_info: [
      { ability_no: "1", ability_grade: "Legendary", ability_value: "道具掉落率增加 20%" },
      { ability_no: "2", ability_grade: "Unique", ability_value: "Buff技能持續時間增加38%" },
      { ability_no: "3", ability_grade: "Unique", ability_value: "增加楓幣獲得量 13%" },
    ]
  },
  hyperStat: {
    character_class: "Bishop",
    hyper_stat_preset_1: [],
    hyper_stat_preset_1_remain_point: 0
  },
  linkSkill: {
    character_link_skill: []
  },
  equipment: {
    title: {
      title_name: "Root Abyss Master",
      title_icon: "",
      title_description: "Defeated all Root Abyss bosses."
    },
    item_equipment: [
      {
        item_equipment_part: "Weapon",
        item_equipment_slot: "Weapon",
        item_name: "Arcane Umbra Wand",
        item_icon: "https://picsum.photos/50/50?random=1",
        item_description: "A powerful wand.",
        item_shape_name: "Arcane Umbra Wand",
        item_shape_icon: "",
        item_gender: "Common",
        starforce: "22",
        starforce_scroll_flag: "1",
        item_level: 200,
        special_ring_level: 0,
        date_expire: "9999-12-31",
        potential_option_grade: "Legendary",
        additional_potential_option_grade: "Epic",
        potential_option_1: "Magic ATT: +12%",
        potential_option_2: "Boss Damage: +30%",
        potential_option_3: "Int: +9%",
        additional_potential_option_1: "Magic ATT: +6%",
        additional_potential_option_2: "Int: +3%",
        additional_potential_option_3: "",
        item_base_option: {
          ...EMPTY_OPTION,
          str: "0", dex: "0", int: "100", luk: "0", max_hp: "0", max_mp: "0", attack_power: "200", magic_power: "400"
        },
        item_total_option: {
           ...EMPTY_OPTION,
           str: "0", dex: "0", int: "150", luk: "0", max_hp: "0", max_mp: "0", attack_power: "250", magic_power: "550"
        },
        item_add_option: EMPTY_OPTION,
        item_etc_option: EMPTY_OPTION,
        item_starforce_option: EMPTY_OPTION
      }
    ]
  }
};
