import { findCharacterByName, isCharacterFresh, upsertCanonicalNexonCharacter } from './character-repository';
import type { Env } from './env';
import { HttpError } from './http';
import { NexonRequestError, resolveNexonCharacter } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

export const getOrDiscoverCharacter = async (env: Env, characterName: string) => {
  const existing = await findCharacterByName(env.DB, characterName);
  const config = getRuntimeConfig(env);
  if (existing && isCharacterFresh(existing, config.characterFreshnessSeconds)) {
    return { character: existing, updatedAt: existing.updatedAt, stale: false, source: 'd1' as const };
  }

  try {
    const resolved = await resolveNexonCharacter(env, characterName, existing?.ocid);
    const stored = await upsertCanonicalNexonCharacter(env.DB, resolved, [
      {
        source: 'nexon',
        sourceCharacterId: resolved.ocid,
        observedAt: resolved.observedAt,
        sourceUpdatedAt: resolved.nexonUpdatedAt,
      },
      { source: 'holybear_search', sourceCharacterId: resolved.characterName },
    ]);
    return {
      character: stored.character,
      updatedAt: stored.character.updatedAt,
      stale: false,
      source: 'nexon' as const,
      discovered: stored.created,
    };
  } catch (error) {
    if (existing) {
      return {
        character: existing,
        updatedAt: existing.updatedAt,
        stale: true,
        source: 'd1' as const,
        refreshError: error instanceof NexonRequestError ? error.code : 'nexon_refresh_failed',
      };
    }
    if (error instanceof NexonRequestError && error.code === 'character_not_found') {
      throw new HttpError(404, 'character_not_found', '找不到這個角色');
    }
    if (!env.NEXON_API_KEY) {
      throw new HttpError(503, 'nexon_not_configured', '角色查詢服務尚未設定 NEXON_API_KEY');
    }
    throw new HttpError(502, 'nexon_unavailable', 'NEXON 角色資料暫時無法取得');
  }
};
