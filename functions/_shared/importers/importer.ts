export interface SeedCharacter {
  sourceId: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  ocid?: string | null;
  sourceUpdatedAt?: string | null;
  observedAt?: string;
  sourceMetadataJson?: string | null;
}

export interface SeedPage {
  page: number;
  pageSize: number;
  total: number | null;
  items: SeedCharacter[];
  complete: boolean;
}
