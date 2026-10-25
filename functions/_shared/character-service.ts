import { findCharacterByName, invalidateCharacterStatement, isCharacterFresh, upsertCanonicalNexonCharacterWithStorage } from './character-repository';
import type { Env } from './env';
import { HttpError } from './http';
import { NexonRequestError, resolveNexonCharacter } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';
import { invalidateCachedCharacterRank } from './ranking-cache';

export const getOrDiscoverCharacter = async (env: Env, characterName: string) => {
  const existing = await findCharacterByName(env.DB, characterName);
  const config = getRuntimeConfig(env);
  if (existing && isCharacterFresh(existing, config.characterFreshnessSeconds)) {
    return { character: existing, updatedAt: existing.updatedAt, stale: false, source: 'd1' as const };
  }

  const checkedAt = new Date().toISOString();
  try {
    // Resolve the requested name again, rather than trusting an old OCID whose
    // historical basic data may still be readable after a rename/name reuse.
    const resolved = await resolveNexonCharacter(env, characterName);
    const stored = await upsertCanonicalNexonCharacterWithStorage(env, resolved, [
      {
        source: 'nexon',
        sourceCharacterId: resolved.ocid,
        observedAt: resolved.observedAt,
        sourceUpdatedAt: resolved.nexonUpdatedAt,
      },
      { source: 'holybear_search', sourceCharacterId: resolved.characterName },
    ]);
    if (existing && existing.isActive !== false && existing.ocid !== stored.character.ocid) {
      await invalidateCharacterStatement(
        env.DB, existing.ocid, existing.characterName, checkedAt,
        '此名字已不再對應原角色，已停止舊角色的自動更新並移出排名',
      ).run();
      await invalidateCachedCharacterRank(existing.characterName).catch(() => undefined);
    }
    if (existing && existing.characterName !== stored.character.characterName) {
      await invalidateCachedCharacterRank(existing.characterName).catch(() => undefined);
    }
    return {
      character: stored.character,
      updatedAt: stored.character.updatedAt,
      stale: false,
      source: 'nexon' as const,
      discovered: stored.created,
    };
  } catch (error) {
    if (error instanceof NexonRequestError && error.code === 'character_not_found'
      && (error.status === 404 || error.nexonCode === 'OPENAPI00003')) {
      if (existing) {
        if (existing.isActive !== false) await invalidateCharacterStatement(
          env.DB, existing.ocid, existing.characterName, checkedAt,
          '官方已無法確認此角色，已停止自動更新並移出排名',
        ).run();
        await invalidateCachedCharacterRank(existing.characterName).catch(() => undefined);
      }
      throw new HttpError(404, 'character_not_found', '找不到這個角色');
    }
    if (existing && existing.isActive !== false) {
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
