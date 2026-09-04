import type { CharacterSource } from '../models';

export interface SeedCharacter {
  sourceId: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  ocid?: string | null;
}

export interface SeedPage {
  page: number;
  pageSize: number;
  total: number | null;
  items: SeedCharacter[];
  complete: boolean;
}

export interface SeedImporter {
  readonly source: Extract<CharacterSource, 'maplerhouse'>;
  fetchPage(page: number, pageSize: number): Promise<SeedPage>;
}

export class ImportSourceUnavailableError extends Error {
  constructor(
    public readonly source: string,
    message: string,
  ) {
    super(message);
  }
}
