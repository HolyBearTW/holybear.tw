import { describe, expect, it } from 'vitest';
import {
  detectWeaponItemLiberationStage,
  formatCharacterLiberationStage,
  formatDojangRecord,
  formatDojangTime,
  formatGrowthEventValue,
  isDestinyWeaponPhase2,
  normalizeCharacterBasic,
  resolveCharacterLiberationDetails,
} from '../../.vitepress/theme/maplestory/services/growthEventFormat';
import type { GrowthHistoryEvent } from '../../.vitepress/theme/maplestory/services/growthTypes';

const dojangEvent = (overrides: Partial<GrowthHistoryEvent> = {}): GrowthHistoryEvent => ({
  date: '2026-08-08',
  type: 'dojang',
  from: '701秒',
  to: '501秒',
  dojang: { beforeFloor: 100, beforeTime: 701, afterFloor: 100, afterTime: 501 },
  ...overrides,
});

describe('growth dojang event formatting', () => {
  it('formats raw record seconds as minutes and seconds', () => {
    expect(formatDojangTime(701)).toBe('11分41秒');
    expect(formatDojangTime(501)).toBe('8分21秒');
  });

  it('includes the floor for a same-floor time improvement', () => {
    const event = dojangEvent();
    expect(formatGrowthEventValue(event, 'before')).toBe('100樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 8分21秒');
  });

  it('includes both records for a floor increase', () => {
    const event = dojangEvent({
      from: '98F',
      to: '100F',
      dojang: { beforeFloor: 98, beforeTime: 701, afterFloor: 100, afterTime: 701 },
    });
    expect(formatGrowthEventValue(event, 'before')).toBe('98樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 11分41秒');
  });

  it('includes floor and time when both change', () => {
    const event = dojangEvent({
      from: '98F',
      to: '100F',
      dojang: { beforeFloor: 98, beforeTime: 701, afterFloor: 100, afterTime: 501 },
    });
    expect(formatGrowthEventValue(event, 'before')).toBe('98樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 8分21秒');
  });

  it('formats a legacy seconds-only event without inventing a floor', () => {
    const event = dojangEvent({ dojang: undefined });
    expect(formatGrowthEventValue(event, 'before')).toBe('11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('8分21秒');
  });

  it('does not create records from null, zero, or invalid data', () => {
    expect(formatDojangTime(null)).toBeNull();
    expect(formatDojangTime(0)).toBeNull();
    expect(formatDojangTime(-1)).toBeNull();
    expect(formatDojangTime('invalid')).toBeNull();
    expect(formatDojangRecord(null, 701)).toBeNull();
    expect(formatDojangRecord(0, 701)).toBeNull();
    expect(formatDojangRecord(100, 0)).toBeNull();
    expect(formatDojangRecord(100, Number.NaN)).toBeNull();
  });
});

describe('growth liberation event formatting', () => {
  const liberationEvent = (from: string, to: string): GrowthHistoryEvent => ({
    date: '2025-12-07', type: 'liberation', from, to,
  });

  it('formats official stage-to-stage transitions without losing detail', () => {
    const event = liberationEvent('1', '2');
    expect(formatGrowthEventValue(event, 'before')).toBe('創世');
    expect(formatGrowthEventValue(event, 'after')).toBe('命運一階');
  });

  it('keeps legacy boolean events generic instead of inventing a stage', () => {
    const event = liberationEvent('false', 'true');
    expect(formatGrowthEventValue(event, 'before')).toBe('未完成');
    expect(formatGrowthEventValue(event, 'after')).toBe('已完成');
  });

  it('handles null-like and unknown stages without guessing', () => {
    expect(formatGrowthEventValue(liberationEvent('', 'future-stage'), 'before')).toBe('無');
    expect(formatGrowthEventValue(liberationEvent('', 'future-stage'), 'after')).toBe('future-stage');
    expect(formatGrowthEventValue(liberationEvent('2', '3'), 'before')).toBe('命運一階');
    expect(formatGrowthEventValue(liberationEvent('2', '3'), 'after')).toBe('3');
  });
});

describe('destiny weapon phase 2 detection and liberation display', () => {
  const phase1Weapon = {
    item_equipment_part: '武器',
    item_equipment_slot: '武器',
    item_name: '命運鬥拳',
    starforce: '22',
    scroll_upgrade: '8',
    scroll_upgradeable_count: '0',
    item_base_option: { base_equipment_level: 250 },
    item_etc_option: { attack_power: '72', magic_power: '0' },
  };

  const phase2Weapon22Star = {
    item_equipment_part: '武器',
    item_equipment_slot: '武器',
    item_name: '命運雙弩槍',
    starforce: '22',
    scroll_upgrade: '9',
    scroll_upgradeable_count: '0',
    item_base_option: { base_equipment_level: 250 },
    item_etc_option: { attack_power: '81', magic_power: '0' },
  };

  const phase2Weapon25StarMagic = {
    item_equipment_part: '武器',
    item_equipment_slot: '武器',
    item_name: '命運陰陽扇',
    starforce: '25',
    scroll_upgrade: '9',
    scroll_upgradeable_count: '0',
    item_base_option: { base_equipment_level: 250 },
    item_etc_option: { attack_power: '0', magic_power: '81' },
  };

  it('recognizes both 22-star and 25-star Destiny Phase 2 weapons via scroll_upgrade=9 and +81 atk/matk', () => {
    expect(isDestinyWeaponPhase2(phase1Weapon)).toBe(false);
    expect(detectWeaponItemLiberationStage(phase1Weapon)).toBe('destiny_phase_1');

    expect(isDestinyWeaponPhase2(phase2Weapon22Star)).toBe(true);
    expect(detectWeaponItemLiberationStage(phase2Weapon22Star)).toBe('destiny_phase_2');

    expect(isDestinyWeaponPhase2(phase2Weapon25StarMagic)).toBe(true);
    expect(detectWeaponItemLiberationStage(phase2Weapon25StarMagic)).toBe('destiny_phase_2');
  });

  it('does not misclassify non-Destiny 9-scroll weapons or Genesis badges', () => {
    const arcane9Scroll = {
      item_equipment_part: '武器',
      item_equipment_slot: '武器',
      item_name: '神秘冥界雙弩槍',
      starforce: '22',
      scroll_upgrade: '9',
      scroll_upgradeable_count: '0',
      item_base_option: { base_equipment_level: 200 },
      item_etc_option: { attack_power: '81', magic_power: '0' },
    };
    const genesisBadge = {
      item_equipment_part: '胸章',
      item_equipment_slot: '胸章',
      item_name: '創世的胸章',
      starforce: '0',
      scroll_upgrade: '0',
    };
    expect(isDestinyWeaponPhase2(arcane9Scroll)).toBe(false);
    expect(detectWeaponItemLiberationStage(arcane9Scroll)).toBeNull();
    expect(detectWeaponItemLiberationStage(genesisBadge)).toBeNull();
  });

  it('displays Destiny Phase 2 when basic API returns liberation_quest_clear="2" while preserving raw status "2"', () => {
    const basic = normalizeCharacterBasic({
      character_name: '測試角色',
      world_name: '艾麗亞',
      character_gender: '女',
      character_class: '精靈遊俠',
      character_class_level: '6',
      character_level: 295,
      character_exp: 0,
      character_exp_rate: '0',
      character_guild_name: '公會',
      character_image: '',
      liberation_quest_clear: '2',
    });

    expect(basic.liberation_quest_clear).toBe('2');
    expect(basic.liberation_quest_clear_flag).toBe('2');

    const details22Star = resolveCharacterLiberationDetails(basic, {
      item_equipment: [phase2Weapon22Star],
    });
    expect(details22Star).toEqual({
      rawLiberationStatus: '2',
      equipmentStage: 'destiny_phase_2',
      stage: 'destiny_phase_2',
      label: '命運二階',
    });
    expect(formatCharacterLiberationStage(basic, { item_equipment: [phase2Weapon22Star] })).toBe('命運二階');
    expect(basic.liberation_quest_clear).toBe('2');

    const detailsPhase1 = resolveCharacterLiberationDetails(basic, {
      item_equipment: [phase1Weapon],
    });
    expect(detailsPhase1).toEqual({
      rawLiberationStatus: '2',
      equipmentStage: 'destiny_phase_1',
      stage: 'destiny_phase_1',
      label: '命運一階',
    });
  });

  it('does not treat unconfirmed liberation_quest_clear="3" alone as Destiny Phase 2 without equipment evidence', () => {
    const details = resolveCharacterLiberationDetails(
      { liberation_quest_clear: '3' },
      { item_equipment: [] },
    );
    expect(details.rawLiberationStatus).toBe('3');
    expect(details.equipmentStage).toBeNull();
    expect(details.stage).toBe('unknown');
    expect(details.label).toBe('3');
  });
});
