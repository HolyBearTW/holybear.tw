import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CharacterShareCard from '../../.vitepress/theme/maplestory/components/CharacterShareCard';
import {
  buildCharacterShareUrl,
  createCharacterShareCardViewModel,
  sanitizeCharacterCardFilename,
} from '../../.vitepress/theme/maplestory/services/shareCard';
import type { HolyBearCharacterRank } from '../../.vitepress/theme/maplestory/services/holyBearService';
import type { DashboardData } from '../../.vitepress/theme/maplestory/types';

const dataFor = (
  name: string,
  stats: Array<{ stat_name: string; stat_value: string }> = [],
): DashboardData => ({
  ocid: `ocid-${name}`,
  basic: {
    character_name: name,
    world_name: '普力特',
    character_gender: '女',
    character_class: '主教',
    character_class_level: '6',
    character_level: 290,
    character_exp: 0,
    character_exp_rate: '42.5',
    character_guild_name: '',
    character_image: 'https://open.api.nexon.com/character.png',
  },
  stat: { date: '2026-09-17', character_class: '主教', final_stat: stats, remain_ap: 0 },
  equipment: { date: '2026-09-17', character_gender: '女', character_class: '主教', preset_no: 1, item_equipment: [], title: null },
  ability: { date: '2026-09-17', ability_grade: 'Legendary', ability_info: [], remain_fame: 0 },
  hyperStat: { character_class: '主教', hyper_stat_preset_1: [], hyper_stat_preset_1_remain_point: 0 },
  linkSkill: { character_link_skill: [], character_owned_link_skill: undefined as never },
  lastUpdated: '2026-09-17',
});

describe('character share card data', () => {
  it('formats present combat values and omits missing secondary stats', () => {
    const model = createCharacterShareCardViewModel(dataFor('測試角色', [
      { stat_name: '戰鬥力', stat_value: '550000000' },
      { stat_name: 'BOSS怪物傷害', stat_value: '420' },
    ]));

    expect(model.combatPowerLabel).toBe('5億 5000萬 0');
    expect(model.combatStats).toEqual([{ label: 'BOSS 傷害', value: '420%' }]);
    expect(model.dataDate).toBe('2026-09-17');
  });

  it('does not display zero combat power or synthetic zero percent stats', () => {
    const model = createCharacterShareCardViewModel(dataFor('零戰力', [
      { stat_name: '戰鬥力', stat_value: '0' },
      { stat_name: '無視防禦率', stat_value: '0' },
    ]));

    expect(model.combatPower).toBeNull();
    expect(model.combatPowerLabel).toBeNull();
    expect(model.combatStats).toEqual([]);
  });

  it('includes final damage as the first combat stat and reuses the existing HEXA progress calculation', () => {
    const data = dataFor('六轉角色', [
      { stat_name: '最終傷害', stat_value: '88.5' },
      { stat_name: 'BOSS怪物傷害', stat_value: '420' },
      { stat_name: '無視防禦率', stat_value: '96.7' },
      { stat_name: '爆擊傷害', stat_value: '135.7' },
    ]);
    data.hexaMatrix = {
      date: '2026-09-17',
      character_hexa_core_equipment: [{
        hexa_core_name: '測試技能 VI',
        hexa_core_level: 1,
        hexa_core_type: '技能核心',
        linked_skill: [],
      }],
    };

    const model = createCharacterShareCardViewModel(data);
    expect(model.combatStats.map((stat) => stat.label)).toEqual(['最終傷害', 'BOSS 傷害', '無視防禦', '爆擊傷害']);
    expect(model.hexaProgress).not.toBeNull();
  });

  it('sanitizes Windows filename characters and keeps the existing hash URL rule', () => {
    expect(sanitizeCharacterCardFilename('A/B:*?')).toBe('holybear-A_B___-card.png');
    expect(buildCharacterShareUrl('角色名')).toBe('https://holybear.tw/maplestory#角色名');
  });
});

describe('CharacterShareCard markup', () => {
  const data = dataFor('切換角色', [{ stat_name: '戰鬥力', stat_value: '123456789' }]);
  const rank = {
    rank: 123,
    total: 1000,
    entry: {
      ocid: data.ocid,
      characterName: data.basic.character_name,
      worldName: data.basic.world_name,
      jobName: data.basic.character_class,
      level: data.basic.character_level,
      characterImage: data.basic.character_image,
      combatPower: 123456789,
      rank: 123,
    },
  } satisfies HolyBearCharacterRank;

  it('renders an available sample rank and hides QR by default', () => {
    const markup = renderToStaticMarkup(
      <CharacterShareCard
        data={data}
        characterImage=""
        shareUrl="https://holybear.tw/maplestory#切換角色"
        showQrCode={false}
        rank={rank}
      />,
    );

    expect(markup).toContain('站內近期戰力排名 #123');
    expect(markup).toContain('/favicon.png?v=20260816-face-cutout');
    expect(markup).toContain('聖小熊的秘密基地');
    expect(markup).not.toContain('data-character-card-qr');
  });

  it('omits a missing rank and renders a local QR when enabled', () => {
    const markup = renderToStaticMarkup(
      <CharacterShareCard
        data={dataFor('新角色', [])}
        characterImage=""
        shareUrl="https://holybear.tw/maplestory#新角色"
        showQrCode
        rank={null}
      />,
    );

    expect(markup).not.toContain('站內近期戰力排名');
    expect(markup).toContain('data-character-card-qr');
    expect(markup).toContain('<svg');
  });

  it('renders HEXA progress as a separate row when HEXA data exists', () => {
    const hexaData = dataFor('六轉圖卡', []);
    hexaData.hexaMatrix = {
      date: '2026-09-17',
      character_hexa_core_equipment: [{
        hexa_core_name: '測試技能 VI',
        hexa_core_level: 10,
        hexa_core_type: '技能核心',
        linked_skill: [],
      }],
    };

    const markup = renderToStaticMarkup(
      <CharacterShareCard
        data={hexaData}
        characterImage=""
        shareUrl="https://holybear.tw/maplestory#六轉圖卡"
        showQrCode={false}
        rank={null}
      />,
    );

    expect(markup).toContain('HEXA 六轉進度');
    expect(markup).toContain('role="progressbar"');
  });
});
