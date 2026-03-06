export interface NexonError {
  error: {
    name: string;
    message: string;
  };
}

export interface OcidResponse {
  ocid: string;
}

export interface CharacterBasic {
  character_name: string;
  world_name: string;
  character_gender: string;
  character_class: string;
  character_class_level: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: string;
  character_guild_name: string;
  character_image: string;
  character_date_create?: string;
  access_flag?: string; // Login status
  liberation_quest_clear_flag?: string;
}

export interface FinalStat {
  stat_name: string;
  stat_value: string;
}

export interface CharacterStat {
  date: string;
  character_class: string;
  final_stat: FinalStat[];
  remain_ap: number;
  pop?: number; // Popularity/Fame
}

export interface ItemOption {
  str: string;
  dex: string;
  int: string;
  luk: string;
  max_hp: string;
  max_mp: string;
  attack_power: string;
  magic_power: string;
  armor: string;
  speed: string;
  jump: string;
  boss_damage: string;
  ignore_monster_armor: string;
  all_stat: string;
  damage: string;
  equipment_level_decrease: number;
  max_hp_rate: string;
  max_mp_rate: string;
}

export interface EquipmentItem {
  item_equipment_part: string;
  item_equipment_slot: string;
  item_name: string;
  item_icon: string;
  item_description: string;
  item_shape_name: string;
  item_shape_icon: string;
  item_gender: string;
  item_total_option: ItemOption;
  item_base_option: ItemOption;
  item_add_option: ItemOption; // Flame stats
  item_etc_option: ItemOption; // Scroll stats
  item_starforce_option: ItemOption; // Starforce stats
  potential_option_grade: string;
  additional_potential_option_grade: string;
  potential_option_1: string;
  potential_option_2: string;
  potential_option_3: string;
  additional_potential_option_1: string;
  additional_potential_option_2: string;
  additional_potential_option_3: string;
  starforce: string;
  scroll_upgrade: string;
  scroll_upgradable_count: string;
  golden_hammer_flag: string;
  cuttable_count: string;
  starforce_scroll_flag: string;
  item_level: number;
  special_ring_level: number;
  date_expire: string;
  soul_name?: string;
  soul_option?: string;
}

export interface CharacterEquipment {
  date: string;
  character_gender: string;
  character_class: string;
  preset_no: number;
  item_equipment: EquipmentItem[];
  title: {
    title_name: string;
    title_icon: string;
    title_description: string;
  } | null;
  // Presets
  item_equipment_preset_1?: EquipmentItem[];
  item_equipment_preset_2?: EquipmentItem[];
  item_equipment_preset_3?: EquipmentItem[];
  dragon_equipment?: EquipmentItem[];
  mechanic_equipment?: EquipmentItem[];
}

export interface AbilityInfo {
  ability_no: string;
  ability_grade: string;
  ability_value: string;
}

export interface CharacterAbility {
  date: string;
  ability_grade: string;
  ability_info: AbilityInfo[];
  remain_fame: number;
}

export interface HyperStat {
  stat_type: string;
  stat_point: number;
  stat_level: number;
  stat_increase: string;
}

export interface CharacterHyperStat {
  character_class: string;
  hyper_stat_preset_1: HyperStat[];
  hyper_stat_preset_1_remain_point: number;
}

export interface LinkSkill {
  skill_name: string;
  skill_description: string;
  skill_level: number;
  skill_effect: string;
  skill_icon: string;
}

export interface CharacterLinkSkill {
  character_link_skill: LinkSkill[];
  character_owned_link_skill: LinkSkill;
  character_link_skill_preset_1?: LinkSkill[];
  character_link_skill_preset_2?: LinkSkill[];
  character_link_skill_preset_3?: LinkSkill[];
}

export interface DashboardData {
  basic: CharacterBasic;
  stat: CharacterStat;
  equipment: CharacterEquipment;
  ability: CharacterAbility;
  hyperStat: CharacterHyperStat;
  linkSkill: CharacterLinkSkill;
  union?: CharacterUnion;
  unionRaider?: CharacterUnionRaider;
  unionArtifact?: CharacterUnionArtifact;
  unionChampion?: CharacterUnionChampion;
  petEquipment?: CharacterPetEquipment;
  symbolEquipment?: CharacterSymbolEquipment;
  setEffect?: CharacterSetEffect;
  vMatrix?: CharacterVMatrix;
  hexaMatrix?: CharacterHexaMatrix;
  hexaMatrixStat?: CharacterHexaMatrixStat;
  skill0?: CharacterSkill;
  skill1?: CharacterSkill;
  skill2?: CharacterSkill;
  skill3?: CharacterSkill;
  skill4?: CharacterSkill;
  skill5?: CharacterSkill;
  skill6?: CharacterSkill;
  cashItemEquipment?: CharacterCashItemEquipment;
  beautyEquipment?: CharacterBeautyEquipment;
  dojo?: CharacterDojo;
  lastUpdated: string; // Internal timestamp for display
}

export interface CharacterUnion {
  date: string;
  union_level: number;
  union_grade: string;
  union_artifact_level?: number;
  union_artifact_exp?: number;
}

export interface CharacterUnionRaider {
  date: string;
  union_raider_stat: string[];
  union_occupied_stat: string[];
  union_block: {
    block_type: string;
    block_class: string;
    block_level: string;
    block_control_point_x: number;
    block_control_point_y: number;
    block_position: { x: number; y: number }[];
  }[];
  union_inner_stat: {
    stat_field_id: string;
    stat_field_effect: string;
  }[];
}

export interface CharacterUnionArtifact {
  date: string;
  union_artifact_effect: {
      name: string;
      level: number;
  }[];
  union_artifact_crystal: {
      name: string;
      validity_date: string;
      level: number;
      crystal_option_name_1: string;
      crystal_option_name_2: string;
      crystal_option_name_3: string;
  }[];
  union_artifact_remain_ap: number;
  union_artifact_level?: number;
  level?: number; // Possible fallback field
  union_artifact_exp?: number;
}

export interface UnionChampionBadge {
  stat: string;
}

export interface UnionChampionInfo {
  champion_name: string;
  champion_slot: number;
  champion_grade: string;
  champion_class: string;
  champion_badge_info: UnionChampionBadge[];
}

export interface CharacterUnionChampion {
  date: string;
  union_champion: UnionChampionInfo[];
  champion_badge_total_info: UnionChampionBadge[];
}

export interface CharacterPetEquipment {
  date: string;
  pet_1_name?: string;
  pet_1_nickname?: string;
  pet_1_icon?: string;
  pet_1_description?: string;
  pet_1_equipment?: {
      item_name: string;
      item_icon: string;
      item_description: string;
  };
  pet_1_auto_skill?: {
      skill_1: string;
      skill_1_icon: string;
      skill_2: string;
      skill_2_icon: string;
  };
  pet_2_name?: string;
  pet_2_nickname?: string;
  pet_2_icon?: string;
  pet_2_description?: string;
  pet_2_equipment?: {
      item_name: string;
      item_icon: string;
      item_description: string;
  };
  pet_2_auto_skill?: {
      skill_1: string;
      skill_1_icon: string;
      skill_2: string;
      skill_2_icon: string;
  };
  pet_3_name?: string;
  pet_3_nickname?: string;
  pet_3_icon?: string;
  pet_3_description?: string;
  pet_3_equipment?: {
      item_name: string;
      item_icon: string;
      item_description: string;
  };
  pet_3_auto_skill?: {
      skill_1: string;
      skill_1_icon: string;
      skill_2: string;
      skill_2_icon: string;
  };
}

export interface CharacterSymbolEquipment {
  date: string;
  symbol: {
      symbol_name: string;
      symbol_icon: string;
      symbol_description: string;
      symbol_force: string;
      symbol_level: number;
      symbol_str: string;
      symbol_dex: string;
      symbol_int: string;
      symbol_luk: string;
      symbol_hp: string;
      symbol_growth_count: number;
      symbol_require_growth_count: number;
  }[];
}

export interface CharacterSetEffect {
  date: string;
  set_effect: {
      set_name: string;
      total_set_count: number;
      set_effect_info: {
          set_count: number;
          set_option: string;
      }[];
  }[];
}

export interface CharacterVMatrix {
  date: string;
  character_v_core_equipment: {
      slot_id: string;
      slot_level: number;
      v_core_name: string;
      v_core_type: string;
      v_core_level: number;
      v_core_skill_1: string;
      v_core_skill_2: string;
      v_core_skill_3: string;
  }[];
}

export interface CharacterHexaMatrix {
  date: string;
  character_hexa_core_equipment: {
      hexa_core_name: string;
      hexa_core_level: number;
      hexa_core_type: string;
      linked_skill: {
          hexa_skill_id: string;
      }[];
  }[];
}

export interface HexaStatCore {
  slot_id: string;
  main_stat_name: string;
  sub_stat_name_1: string;
  sub_stat_name_2: string;
  main_stat_level: number;
  sub_stat_level_1: number;
  sub_stat_level_2: number;
  stat_grade: number;
}

export interface CharacterHexaMatrixStat {
  date: string;
  character_class: string;
  character_hexa_stat_core: HexaStatCore[];
  character_hexa_stat_core_2: HexaStatCore[];
  character_hexa_stat_core_3: HexaStatCore[];
  preset_hexa_stat_core: HexaStatCore[];
  preset_hexa_stat_core_2: HexaStatCore[];
  preset_hexa_stat_core_3: HexaStatCore[];
}

export interface CharacterDojo {
  date: string;
  character_class: string;
  world_name: string;
  dojang_best_floor: number;
  date_dojang_record: string;
  dojang_best_time: number;
}

export interface Skill {
  skill_name: string;
  skill_description: string;
  skill_level: number;
  skill_effect: string;
  skill_icon: string;
}

export interface CharacterSkill {
  date: string;
  character_class: string;
  character_skill_grade: string;
  character_skill: Skill[];
}

export interface CashItemOption {
  option_type: string;
  option_value: string;
}

export interface CashItemColoringPrism {
  color_range: string;
  hue: number;
  saturation: number;
  value: number;
}

export interface CashItemEquipmentPreset {
  cash_item_equipment_part: string;
  cash_item_equipment_slot: string;
  cash_item_name: string;
  cash_item_icon: string;
  cash_item_description: string;
  cash_item_option: CashItemOption[];
  date_expire: string;
  date_option_expire: string;
  cash_item_label: string;
  cash_item_coloring_prism: CashItemColoringPrism;
  item_gender: string;
}

export interface CharacterCashItemEquipment {
  date: string;
  character_gender: string;
  character_class: string;
  preset_no: number;
  cash_item_equipment_base: CashItemEquipmentPreset[];
  cash_item_equipment_preset_1: CashItemEquipmentPreset[];
  cash_item_equipment_preset_2: CashItemEquipmentPreset[];
  cash_item_equipment_preset_3: CashItemEquipmentPreset[];
  additional_cash_item_equipment_base: CashItemEquipmentPreset[];
  additional_cash_item_equipment_preset_1: CashItemEquipmentPreset[];
  additional_cash_item_equipment_preset_2: CashItemEquipmentPreset[];
  additional_cash_item_equipment_preset_3: CashItemEquipmentPreset[];
}

export interface CharacterBeautyEquipment {
  date: string;
  character_gender: string;
  character_class: string;
  character_hair: {
    hair_name: string;
    base_color: string;
    mix_color: string;
    mix_rate: string;
  };
  character_face: {
    face_name: string;
    base_color: string;
    mix_color: string;
    mix_rate: string;
  };
  character_skin: {
    skin_name: string;
    color_style: string;
    hue: number;
    saturation: number;
    brightness: number;
  };
  additional_character_hair: {
    hair_name: string;
    base_color: string;
    mix_color: string;
    mix_rate: string;
  } | null;
  additional_character_face: {
    face_name: string;
    base_color: string;
    mix_color: string;
    mix_rate: string;
  } | null;
  additional_character_skin: {
    skin_name: string;
    color_style: string;
    hue: number;
    saturation: number;
    brightness: number;
  } | null;
}

export interface CharacterAndroidEquipment {
  date: string;
  android_name: string;
  android_nickname: string;
  android_icon: string;
  android_description: string;
}