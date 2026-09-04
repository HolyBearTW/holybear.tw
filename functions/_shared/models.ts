export const CHARACTER_SOURCES = ['maplerhouse', 'nexon', 'holybear_search'] as const;

export type CharacterSource = (typeof CHARACTER_SOURCES)[number];
export type AccountConfidence = 'high' | 'probable' | 'unknown';

export interface CharacterRow {
  ocid: string;
  character_name: string;
  normalized_name: string;
  world_name: string;
  job_name: string;
  level: number;
  combat_power: number;
  character_image: string;
  guild_name: string | null;
  account_group_id: number | null;
  first_seen_at: string;
  last_seen_at: string;
  nexon_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterWrite {
  ocid: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  guildName: string | null;
  observedAt?: string;
  nexonUpdatedAt?: string | null;
}

export interface CharacterSourceWrite {
  source: CharacterSource;
  sourceCharacterId?: string | null;
  observedAt?: string;
  sourceUpdatedAt?: string | null;
  rawJson?: string | null;
}

export interface PublicCharacter {
  ocid: string;
  characterName: string;
  normalizedName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  guildName: string | null;
  accountGroupId: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  nexonUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RankingFilters {
  page: number;
  pageSize: number;
  world?: string;
  job?: string;
  minLevel?: number;
}

export interface RankingEntry {
  ocid: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  guildName: string | null;
  rank: number;
}
