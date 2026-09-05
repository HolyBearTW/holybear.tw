import { getOrDiscoverCharacter } from './character-service';
import type { Env } from './env';
import type { PublicCharacter } from './models';
import { fetchNexonJson, NexonRequestError } from './nexon-client';
import { hashChampionRoster, hashCompleteUnionRaider, hashRaiderPresets } from './union-fingerprint';
import type {
  ChampionMember, UnionChampionResponse, UnionRaiderResponse, UnionSummaryResponse,
} from './union-fingerprint';

const nowIso = () => new Date().toISOString();

export type AccountSignalType = 'union_champion_roster' | 'union_raider_preset' | 'union_raider_full';

interface AccountSignal {
  type: AccountSignalType;
  fingerprint: string;
  canonical: string;
}

interface MatchingSignal {
  ocid: string;
  account_group_id: number | null;
}

interface RelatedCharacterRecord {
  ocid: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
  guildName: string | null;
}

const listGroupCharacters = async (db: D1Database, groupId: number) => {
  const result = await db.prepare(`
    SELECT ocid, character_name AS characterName, world_name AS worldName,
      job_name AS jobName, level, combat_power AS combatPower,
      character_image AS characterImage, guild_name AS guildName
    FROM characters WHERE account_group_id = ?1
    ORDER BY combat_power DESC, ocid ASC
  `).bind(groupId).all<RelatedCharacterRecord>();
  return result.results;
};

const fetchSignals = async (env: Env, ocid: string, types: AccountSignalType[]) => {
  const tasks = types.map(async (type): Promise<{
    signals: AccountSignal[];
    championMembers: ChampionMember[];
  }> => {
    if (type === 'union_champion_roster') {
      const payload = await fetchNexonJson<UnionChampionResponse>(
        env,
        `/user/union-champion?ocid=${encodeURIComponent(ocid)}`,
      );
      const signal = await hashChampionRoster(payload);
      return {
        signals: signal ? [{ type, ...signal }] : [],
        championMembers: payload.union_champion || [],
      };
    }
    if (type === 'union_raider_full') {
      const [union, raider] = await Promise.all([
        fetchNexonJson<UnionSummaryResponse>(env, `/user/union?ocid=${encodeURIComponent(ocid)}`),
        fetchNexonJson<UnionRaiderResponse>(env, `/user/union-raider?ocid=${encodeURIComponent(ocid)}`),
      ]);
      const signal = await hashCompleteUnionRaider(union, raider);
      return {
        signals: signal ? [{ type, ...signal }] : [],
        championMembers: [],
      };
    }
    const payload = await fetchNexonJson<UnionRaiderResponse>(
      env,
      `/user/union-raider?ocid=${encodeURIComponent(ocid)}`,
    );
    return {
      signals: (await hashRaiderPresets(payload)).map((signal) => ({ type, ...signal })),
      championMembers: [],
    };
  });
  const settled = await Promise.allSettled(tasks);
  const signals = settled.flatMap((result) => result.status === 'fulfilled' ? result.value.signals : []);
  const championMembers = settled.flatMap((result) => (
    result.status === 'fulfilled' ? result.value.championMembers : []
  ));
  const failures = settled.flatMap((result, index) => result.status === 'rejected'
    ? [{ type: types[index], error: result.reason }]
    : []);
  const unexpected = failures.find(({ error }) => !(error instanceof NexonRequestError));
  if (unexpected) throw unexpected.error;
  return { signals, championMembers, failures };
};

const storeAndMatchSignals = async (env: Env, character: PublicCharacter, signals: AccountSignal[]) => {
  let groupId = character.accountGroupId;
  if (signals.length === 0) return { groupId, lastVerifiedAt: null };
  const timestamp = nowIso();

  await env.DB.batch(signals.map((signal) => env.DB.prepare(`
    INSERT INTO account_group_signals (
      ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint,
      confidence, evidence_json, first_seen_at, last_seen_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, 1, ?4, 'high', ?5, ?6, ?6, ?6, ?6)
    ON CONFLICT(ocid, signal_type, fingerprint_version, union_fingerprint) DO UPDATE SET
      account_group_id = COALESCE(excluded.account_group_id, account_group_signals.account_group_id),
      evidence_json = excluded.evidence_json,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `).bind(character.ocid, groupId, signal.type, signal.fingerprint, signal.canonical, timestamp)));

  const matches: MatchingSignal[] = [];
  for (const signal of signals) {
    const result = await env.DB.prepare(`
      SELECT s.ocid, COALESCE(s.account_group_id, c.account_group_id) AS account_group_id
      FROM account_group_signals s JOIN characters c ON c.ocid = s.ocid
      WHERE s.signal_type = ?1 AND s.fingerprint_version = 1
        AND s.union_fingerprint = ?2 AND s.ocid <> ?3
    `).bind(signal.type, signal.fingerprint, character.ocid).all<MatchingSignal>();
    matches.push(...result.results);
  }

  const uniqueMatches = new Map<string, MatchingSignal>();
  for (const match of matches) {
    const existing = uniqueMatches.get(match.ocid);
    if (!existing || (existing.account_group_id == null && match.account_group_id != null)) {
      uniqueMatches.set(match.ocid, match);
    }
  }
  const matchedCharacters = [...uniqueMatches.values()];
  if (matchedCharacters.length === 0) {
    if (groupId) {
      await env.DB.batch([
        env.DB.prepare('UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2 WHERE ocid = ?3')
          .bind(groupId, timestamp, character.ocid),
        env.DB.prepare('UPDATE account_groups SET last_verified_at = ?2, updated_at = ?2 WHERE id = ?1')
          .bind(groupId, timestamp),
      ]);
    }
    return { groupId, lastVerifiedAt: timestamp };
  }

  const matchedGroupIds = matchedCharacters
    .map((match) => match.account_group_id)
    .filter((id): id is number => id != null);
  groupId ??= matchedGroupIds[0] ?? null;
  if (!groupId) {
    const group = await env.DB.prepare(`
      INSERT INTO account_groups (
        union_fingerprint, confidence, first_seen_at, last_verified_at, created_at, updated_at
      ) VALUES (?1, 'high', ?2, ?2, ?2, ?2) RETURNING id
    `).bind(signals[0].fingerprint, timestamp).first<{ id: number }>();
    groupId = group?.id ?? null;
  }
  if (!groupId) return { groupId: null, lastVerifiedAt: timestamp };

  const obsoleteGroupIds = [...new Set(matchedGroupIds.filter((id) => id !== groupId))];
  const linkedOcids = [character.ocid, ...matchedCharacters.map((match) => match.ocid)];
  await env.DB.batch([
    ...obsoleteGroupIds.flatMap((obsoleteId) => [
      env.DB.prepare('UPDATE characters SET account_group_id = ?1, updated_at = ?2 WHERE account_group_id = ?3')
        .bind(groupId, timestamp, obsoleteId),
      env.DB.prepare('UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2 WHERE account_group_id = ?3')
        .bind(groupId, timestamp, obsoleteId),
    ]),
    ...linkedOcids.map((ocid) => env.DB.prepare(
      'UPDATE characters SET account_group_id = ?1, updated_at = ?2 WHERE ocid = ?3',
    ).bind(groupId, timestamp, ocid)),
    ...linkedOcids.map((ocid) => env.DB.prepare(
      'UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2 WHERE ocid = ?3',
    ).bind(groupId, timestamp, ocid)),
    env.DB.prepare('UPDATE account_groups SET last_verified_at = ?2, updated_at = ?2 WHERE id = ?1')
      .bind(groupId, timestamp),
    ...obsoleteGroupIds.map((obsoleteId) => env.DB.prepare('DELETE FROM account_groups WHERE id = ?1').bind(obsoleteId)),
  ]);
  return { groupId, lastVerifiedAt: timestamp };
};

export const syncCharacterAccountSignals = async (
  env: Env,
  character: PublicCharacter,
  types: AccountSignalType[] = ['union_champion_roster', 'union_raider_full'],
) => {
  const discovered = await fetchSignals(env, character.ocid, types);
  const stored = await storeAndMatchSignals(env, character, discovered.signals);
  return {
    ...stored,
    signalCount: discovered.signals.length,
    championMembers: discovered.championMembers,
    failures: discovered.failures,
  };
};

const mergeOfficialChampionMembers = (
  groupedCharacters: RelatedCharacterRecord[],
  championMembers: RelatedCharacterRecord[],
) => {
  const merged = new Map<string, RelatedCharacterRecord>();
  for (const grouped of groupedCharacters) {
    const name = grouped.characterName.trim().normalize('NFC');
    if (name) merged.set(name.toLocaleLowerCase('zh-TW'), grouped);
  }
  for (const champion of championMembers) {
    const name = champion.characterName.trim().normalize('NFC');
    if (!name) continue;
    const key = name.toLocaleLowerCase('zh-TW');
    const grouped = merged.get(key);
    merged.set(key, grouped?.characterImage ? grouped : { ...grouped, ...champion });
  }
  return [...merged.values()];
};

const resolveOfficialChampionMembers = async (
  env: Env,
  character: PublicCharacter,
  championMembers: ChampionMember[],
) => {
  const currentName = character.characterName.normalize('NFC').toLocaleLowerCase('zh-TW');
  const uniqueMembers = new Map<string, ChampionMember>();
  for (const member of championMembers) {
    const name = String(member.champion_name || '').trim().normalize('NFC');
    const key = name.toLocaleLowerCase('zh-TW');
    if (name && key !== currentName) uniqueMembers.set(key, member);
  }
  const settled = await Promise.allSettled([...uniqueMembers.values()].map(async (member) => {
    const requestedName = String(member.champion_name || '').trim().normalize('NFC');
    const discovered = await getOrDiscoverCharacter(env, requestedName);
    const resolved = discovered.character;
    return {
      ocid: resolved.ocid,
      characterName: resolved.characterName,
      worldName: resolved.worldName,
      jobName: resolved.jobName || String(member.champion_class || ''),
      level: resolved.level,
      combatPower: resolved.combatPower,
      characterImage: resolved.characterImage,
      guildName: resolved.guildName,
    } satisfies RelatedCharacterRecord;
  }));
  return settled.map((result, index): RelatedCharacterRecord => {
    if (result.status === 'fulfilled') return result.value;
    const member = [...uniqueMembers.values()][index];
    return {
      ocid: '',
      characterName: String(member.champion_name || '').trim().normalize('NFC'),
      worldName: character.worldName,
      jobName: String(member.champion_class || ''),
      level: 0,
      combatPower: 0,
      characterImage: '',
      guildName: null,
    };
  });
};

export const getCharacterAlts = async (env: Env, characterName: string) => {
  const discovered = await getOrDiscoverCharacter(env, characterName);
  const character = discovered.character;
  const synced = await syncCharacterAccountSignals(env, character);
  const groupId = synced.groupId;
  const accountGroup = groupId
    ? await env.DB.prepare('SELECT id, confidence, last_verified_at AS lastVerifiedAt FROM account_groups WHERE id = ?1')
      .bind(groupId).first<{ id: number; confidence: string; lastVerifiedAt: string | null }>()
    : null;
  const groupedCharacters = groupId ? await listGroupCharacters(env.DB, groupId) : [];
  const officialChampionMembers = await resolveOfficialChampionMembers(
    env,
    character,
    synced.championMembers,
  );
  const alts = mergeOfficialChampionMembers(
    groupedCharacters.filter((alt) => alt.ocid !== character.ocid),
    officialChampionMembers,
  );
  return {
    character,
    accountGroup,
    confidence: accountGroup?.confidence || 'unknown',
    alts,
    lastVerifiedAt: accountGroup?.lastVerifiedAt || synced.lastVerifiedAt,
    disclosure: '依公開聯盟資料推定，並非 NEXON 官方 Account ID',
  };
};
