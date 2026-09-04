import { getOrDiscoverCharacter } from './character-service';
import type { Env } from './env';
import { fetchNexonJson, NexonRequestError } from './nexon-client';
import { hashChampionRoster } from './union-fingerprint';
import type { UnionChampionResponse } from './union-fingerprint';

const nowIso = () => new Date().toISOString();

const listGroupCharacters = async (db: D1Database, groupId: number) => {
  const result = await db.prepare(`
    SELECT ocid, character_name AS characterName, world_name AS worldName,
      job_name AS jobName, level, combat_power AS combatPower,
      character_image AS characterImage, guild_name AS guildName
    FROM characters WHERE account_group_id = ?1
    ORDER BY combat_power DESC, ocid ASC
  `).bind(groupId).all();
  return result.results;
};

export const getCharacterAlts = async (env: Env, characterName: string) => {
  const discovered = await getOrDiscoverCharacter(env, characterName);
  const character = discovered.character;
  let groupId = character.accountGroupId;
  let lastVerifiedAt: string | null = null;

  if (!groupId) {
    try {
      const champion = await fetchNexonJson<UnionChampionResponse>(
        env,
        `/user/union-champion?ocid=${encodeURIComponent(character.ocid)}`,
      );
      const signal = await hashChampionRoster(champion);
      if (signal) {
        const timestamp = nowIso();
        await env.DB.prepare(`
          INSERT INTO account_group_signals (
            ocid, signal_type, fingerprint_version, union_fingerprint,
            confidence, evidence_json, first_seen_at, last_seen_at, created_at, updated_at
          ) VALUES (?1, 'union_champion_roster', 1, ?2, 'high', ?3, ?4, ?4, ?4, ?4)
          ON CONFLICT(ocid, signal_type, fingerprint_version, union_fingerprint) DO UPDATE SET
            evidence_json = excluded.evidence_json,
            last_seen_at = excluded.last_seen_at,
            updated_at = excluded.updated_at
        `).bind(character.ocid, signal.fingerprint, signal.canonical, timestamp).run();
        const match = await env.DB.prepare(`
          SELECT s.ocid, COALESCE(s.account_group_id, c.account_group_id) AS account_group_id
          FROM account_group_signals s JOIN characters c ON c.ocid = s.ocid
          WHERE s.signal_type = 'union_champion_roster'
            AND s.fingerprint_version = 1 AND s.union_fingerprint = ?1 AND s.ocid <> ?2
          ORDER BY s.last_seen_at DESC LIMIT 1
        `).bind(signal.fingerprint, character.ocid).first<{ ocid: string; account_group_id: number | null }>();
        if (match) {
          groupId = match.account_group_id;
          if (!groupId) {
            const group = await env.DB.prepare(`
              INSERT INTO account_groups (
                union_fingerprint, confidence, first_seen_at, last_verified_at, created_at, updated_at
              ) VALUES (?1, 'high', ?2, ?2, ?2, ?2) RETURNING id
            `).bind(signal.fingerprint, timestamp).first<{ id: number }>();
            groupId = group?.id ?? null;
          }
          if (groupId) {
            await env.DB.batch([
              env.DB.prepare(`UPDATE characters SET account_group_id = ?1, updated_at = ?2 WHERE ocid IN (?3, ?4)`)
                .bind(groupId, timestamp, character.ocid, match.ocid),
              env.DB.prepare(`UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2
                WHERE signal_type = 'union_champion_roster' AND fingerprint_version = 1 AND union_fingerprint = ?3`)
                .bind(groupId, timestamp, signal.fingerprint),
              env.DB.prepare(`UPDATE account_groups SET last_verified_at = ?2, updated_at = ?2 WHERE id = ?1`)
                .bind(groupId, timestamp),
            ]);
          }
        }
        lastVerifiedAt = timestamp;
      }
    } catch (error) {
      if (!(error instanceof NexonRequestError)) throw error;
    }
  }

  const accountGroup = groupId
    ? await env.DB.prepare('SELECT id, confidence, last_verified_at AS lastVerifiedAt FROM account_groups WHERE id = ?1')
      .bind(groupId).first<{ id: number; confidence: string; lastVerifiedAt: string | null }>()
    : null;
  const alts = groupId ? await listGroupCharacters(env.DB, groupId) : [];
  return {
    character,
    accountGroup,
    confidence: accountGroup?.confidence || 'unknown',
    alts: alts.filter((alt) => (alt as { ocid: string }).ocid !== character.ocid),
    lastVerifiedAt: accountGroup?.lastVerifiedAt || lastVerifiedAt,
    disclosure: '依公開聯盟資料推定，並非 NEXON 官方 Account ID',
  };
};
