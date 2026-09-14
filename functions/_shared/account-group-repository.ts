import { getOrDiscoverCharacter } from './character-service';
import {
  findCharacterByOcid,
  findCharacterByWorldAndName,
  isCanonicalCharacterMetadataComplete,
} from './character-repository';
import {
  enqueueCharacterMetadataRefreshes,
  type CharacterMetadataRefreshRequest,
} from './character-metadata-refresh';
import {
  ACCOUNT_SIGNAL_TYPE,
  claimAccountSignalForOnDemand,
  completeAccountSignalClaim,
  failAccountSignalClaim,
} from './account-signal-queue';
import type { Env } from './env';
import type { PublicCharacter } from './models';
import { fetchNexonJson, NexonRequestError } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';
import {
  createAccountSignalInstrumentation,
  metricTimer,
  recordNexonMetric,
  type AccountSignalInstrumentation,
} from './account-signal-metrics';
import { hashChampionRoster, hashCompleteUnionRaider, hashRaiderPresets } from './union-fingerprint';
import { writeEvidencePayload } from './evidence-storage';
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

export type AccountSignalTriggerSource =
  | 'interactive_search'
  | 'cloudflare_cron'
  | 'github_actions_fallback'
  | 'admin_backfill'
  | 'background';

interface ConnectedCharacter {
  ocid: string;
  account_group_id: number | null;
}

interface ConnectedSignal {
  id: number;
  ocid: string;
  account_group_id: number | null;
  signal_type: AccountSignalType;
  fingerprint_version: number;
  union_fingerprint: string;
}

interface AccountGroupResolution {
  groupId: number | null;
  lastVerifiedAt: string | null;
  connectedOcids: string[];
  matchedSignals: Array<{ type: AccountSignalType; fingerprint: string }>;
  mergedGroupIds: number[];
}

const MAX_ACCOUNT_COMPONENT_CHARACTERS = 80;
const D1_MUTATION_CHUNK_SIZE = 80;

interface RelatedCharacterRecord {
  ocid: string | null;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number | null;
  combatPower: number | null;
  characterImage: string | null;
  guildName: string | null;
  metadataAvailable: boolean;
}

const listGroupCharacters = async (db: D1Database, groupId: number) => {
  const result = await db.prepare(`
    SELECT ocid, character_name AS characterName, world_name AS worldName,
      job_name AS jobName, level, combat_power AS combatPower,
      character_image AS characterImage, guild_name AS guildName
    FROM characters WHERE account_group_id = ?1
    ORDER BY combat_power DESC, ocid ASC
  `).bind(groupId).all<RelatedCharacterRecord>();
  return result.results.map((row) => ({
    ...row,
    level: Number(row.level) > 0 ? Number(row.level) : null,
    combatPower: Number.isFinite(Number(row.combatPower)) ? Number(row.combatPower) : null,
    characterImage: row.characterImage?.trim() || null,
    metadataAvailable: isCanonicalCharacterMetadataComplete({
      worldName: row.worldName,
      jobName: row.jobName,
      level: Number(row.level),
      characterImage: row.characterImage || '',
    }),
  }));
};

const fetchSignals = async (
  env: Env,
  ocid: string,
  types: AccountSignalType[],
  metrics: AccountSignalInstrumentation,
) => {
  const tasks = types.map(async (type): Promise<{
    signals: AccountSignal[];
    championMembers: ChampionMember[];
  }> => {
    if (type === 'union_champion_roster') {
      const payload = await fetchNexonJson<UnionChampionResponse>(
        env,
        `/user/union-champion?ocid=${encodeURIComponent(ocid)}`,
        undefined,
        (metric) => recordNexonMetric(metrics, metric),
      );
      if (!payload || !Array.isArray(payload.union_champion)) {
        throw new Error('Invalid union champion roster payload');
      }
      const canonicalizationStartedAt = Date.now();
      const signal = await hashChampionRoster(payload);
      metrics.fingerprintCanonicalizationMs += metricTimer(canonicalizationStartedAt);
      return {
        signals: signal ? [{ type, ...signal }] : [],
        championMembers: payload.union_champion || [],
      };
    }
    if (type === 'union_raider_full') {
      const [union, raider] = await Promise.all([
        fetchNexonJson<UnionSummaryResponse>(
          env,
          `/user/union?ocid=${encodeURIComponent(ocid)}`,
          undefined,
          (metric) => recordNexonMetric(metrics, metric),
        ),
        fetchNexonJson<UnionRaiderResponse>(
          env,
          `/user/union-raider?ocid=${encodeURIComponent(ocid)}`,
          undefined,
          (metric) => recordNexonMetric(metrics, metric),
        ),
      ]);
      const canonicalizationStartedAt = Date.now();
      const signal = await hashCompleteUnionRaider(union, raider);
      metrics.fingerprintCanonicalizationMs += metricTimer(canonicalizationStartedAt);
      return {
        signals: signal ? [{ type, ...signal }] : [],
        championMembers: [],
      };
    }
    const payload = await fetchNexonJson<UnionRaiderResponse>(
      env,
      `/user/union-raider?ocid=${encodeURIComponent(ocid)}`,
      undefined,
      (metric) => recordNexonMetric(metrics, metric),
    );
    const canonicalizationStartedAt = Date.now();
    const signals = (await hashRaiderPresets(payload)).map((signal) => ({ type, ...signal }));
    metrics.fingerprintCanonicalizationMs += metricTimer(canonicalizationStartedAt);
    return {
      signals,
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

const discoverConnectedComponent = async (db: D1Database, triggerOcid: string) => {
  const characters = new Map<string, ConnectedCharacter>([[
    triggerOcid,
    { ocid: triggerOcid, account_group_id: null },
  ]]);
  const signals = new Map<number, ConnectedSignal>();
  const knownOcids = new Set([triggerOcid]);
  const knownGroupIds = new Set<number>();
  const knownSignalKeys = new Set<string>();
  const pendingOcids = [triggerOcid];
  const pendingGroupIds: number[] = [];
  const pendingSignals: Array<{
    type: AccountSignalType;
    version: number;
    fingerprint: string;
  }> = [];
  const addOcid = (ocid: string) => {
    if (!knownOcids.has(ocid)) {
      knownOcids.add(ocid);
      characters.set(ocid, { ocid, account_group_id: null });
      pendingOcids.push(ocid);
    }
  };
  const addGroup = (groupId: number | null) => {
    if (groupId != null && !knownGroupIds.has(groupId)) {
      knownGroupIds.add(groupId);
      pendingGroupIds.push(groupId);
    }
  };
  const addSignal = (signal: ConnectedSignal) => {
    signals.set(signal.id, signal);
    addGroup(signal.account_group_id);
    const key = `${signal.signal_type}\u001f${signal.fingerprint_version}\u001f${signal.union_fingerprint}`;
    if (!knownSignalKeys.has(key)) {
      knownSignalKeys.add(key);
      pendingSignals.push({
        type: signal.signal_type,
        version: signal.fingerprint_version,
        fingerprint: signal.union_fingerprint,
      });
    }
  };
  const validSignalWhere = `
    confidence = 'high' AND fingerprint_version = 1
    AND length(union_fingerprint) = 64
    AND signal_type IN ('union_champion_roster', 'union_raider_full')
  `;

  traversal: while (pendingOcids.length || pendingGroupIds.length || pendingSignals.length) {
    if (knownOcids.size > MAX_ACCOUNT_COMPONENT_CHARACTERS) break;

    if (pendingOcids.length) {
      const ocids = pendingOcids.splice(0, D1_MUTATION_CHUNK_SIZE);
      const placeholders = ocids.map((_, index) => `?${index + 1}`).join(', ');
      const [characterRows, signalRows] = await Promise.all([
        db.prepare(`SELECT ocid, account_group_id FROM characters WHERE ocid IN (${placeholders})`)
          .bind(...ocids).all<ConnectedCharacter>(),
        db.prepare(`SELECT id, ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint
          FROM account_group_signals WHERE ${validSignalWhere} AND ocid IN (${placeholders})`)
          .bind(...ocids).all<ConnectedSignal>(),
      ]);
      for (const row of characterRows.results) {
        characters.set(row.ocid, row);
        addGroup(row.account_group_id);
      }
      for (const row of signalRows.results) addSignal(row);
    }

    if (pendingGroupIds.length) {
      const groupIds = pendingGroupIds.splice(0, D1_MUTATION_CHUNK_SIZE);
      const placeholders = groupIds.map((_, index) => `?${index + 1}`).join(', ');
      const [characterRows, signalRows] = await Promise.all([
        db.prepare(`SELECT ocid, account_group_id FROM characters WHERE account_group_id IN (${placeholders})`)
          .bind(...groupIds).all<ConnectedCharacter>(),
        db.prepare(`SELECT id, ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint
          FROM account_group_signals WHERE ${validSignalWhere} AND account_group_id IN (${placeholders})`)
          .bind(...groupIds).all<ConnectedSignal>(),
      ]);
      for (const row of characterRows.results) {
        characters.set(row.ocid, row);
        addOcid(row.ocid);
      }
      for (const row of signalRows.results) {
        addOcid(row.ocid);
        addSignal(row);
      }
    }

    if (pendingSignals.length) {
      const fingerprints = pendingSignals.splice(0, 25);
      const tuples = fingerprints.map((_, index) => {
        const offset = index * 3;
        return `(?${offset + 1}, ?${offset + 2}, ?${offset + 3})`;
      }).join(', ');
      const bindings = fingerprints.flatMap((signal) => [
        signal.type, signal.version, signal.fingerprint,
      ]);
      const rows = await db.prepare(`
        SELECT id, ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint
        FROM account_group_signals
        WHERE confidence = 'high' AND length(union_fingerprint) = 64
          AND (signal_type, fingerprint_version, union_fingerprint) IN (${tuples})
      `).bind(...bindings).all<ConnectedSignal>();
      for (const row of rows.results) {
        addOcid(row.ocid);
        addSignal(row);
        if (knownOcids.size > MAX_ACCOUNT_COMPONENT_CHARACTERS) break traversal;
      }
    }
  }

  return {
    characters: [...characters.values()].sort((left, right) => left.ocid.localeCompare(right.ocid)),
    signals: [...signals.values()].sort((left, right) => left.id - right.id),
  };
};

const selectMergeEvidence = (signals: ConnectedSignal[]) => {
  const occurrences = new Map<string, { type: AccountSignalType; fingerprint: string; ocids: Set<string> }>();
  for (const signal of signals) {
    const key = `${signal.signal_type}\u001f${signal.fingerprint_version}\u001f${signal.union_fingerprint}`;
    const entry = occurrences.get(key) || {
      type: signal.signal_type,
      fingerprint: signal.union_fingerprint,
      ocids: new Set<string>(),
    };
    entry.ocids.add(signal.ocid);
    occurrences.set(key, entry);
  }
  return [...occurrences.values()]
    .filter((entry) => entry.ocids.size > 1)
    .sort((left, right) => left.type.localeCompare(right.type)
      || left.fingerprint.localeCompare(right.fingerprint))[0] || null;
};

const appendMergeFailure = async (
  env: Env,
  character: PublicCharacter,
  triggerSource: AccountSignalTriggerSource,
  evidence: ReturnType<typeof selectMergeEvidence>,
  sourceGroupIds: number[],
  connectedOcids: string[],
  error: unknown,
) => {
  const reason = error instanceof Error ? error.message : String(error);
  await env.DB.prepare(`
    INSERT INTO account_group_merge_events (
      timestamp, trigger_ocid, trigger_character, signal_type, fingerprint,
      source_group_id, target_group_id, merged_group_ids_json, merged_ocids_json,
      trigger_source, status, reason
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9, 'failed', ?10)
  `).bind(
    nowIso(), character.ocid, character.characterName,
    evidence?.type || null, evidence?.fingerprint || null,
    sourceGroupIds[0] ?? null, JSON.stringify(sourceGroupIds), JSON.stringify(connectedOcids),
    triggerSource, reason.slice(0, 1000),
  ).run();
};

const convergeAccountGroup = async (
  env: Env,
  character: PublicCharacter,
  triggerSource: AccountSignalTriggerSource,
  metrics: AccountSignalInstrumentation,
): Promise<AccountGroupResolution> => {
  const matchingStartedAt = Date.now();
  let component = await discoverConnectedComponent(env.DB, character.ocid);
  metrics.fingerprintMatchingMs += metricTimer(matchingStartedAt);
  const connectedOcids = component.characters.map((row) => row.ocid);
  const matchedSignals = [...new Map(component.signals.map((signal) => [
    `${signal.signal_type}\u001f${signal.union_fingerprint}`,
    { type: signal.signal_type, fingerprint: signal.union_fingerprint },
  ])).values()];
  if (connectedOcids.length > MAX_ACCOUNT_COMPONENT_CHARACTERS) {
    const evidence = selectMergeEvidence(component.signals);
    const groupIds = [...new Set(component.characters
      .map((row) => row.account_group_id)
      .filter((id): id is number => id != null))];
    const error = new Error(`Account signal component exceeds safety limit (${connectedOcids.length})`);
    await appendMergeFailure(env, character, triggerSource, evidence, groupIds, connectedOcids, error)
      .catch(() => undefined);
    throw error;
  }
  if (connectedOcids.length < 2) {
    return {
      groupId: character.accountGroupId,
      lastVerifiedAt: component.signals.length ? nowIso() : null,
      connectedOcids,
      matchedSignals,
      mergedGroupIds: [],
    };
  }

  const timestamp = nowIso();
  let groupIds = [...new Set(component.characters
    .map((row) => row.account_group_id)
    .filter((id): id is number => id != null)
    .concat(component.signals
      .map((row) => row.account_group_id)
      .filter((id): id is number => id != null)))].sort((left, right) => left - right);
  let targetGroupId: number | null = groupIds[0] ?? null;
  const evidence = selectMergeEvidence(component.signals);
  if (!targetGroupId) {
    const group = await env.DB.prepare(`
      INSERT INTO account_groups (
        union_fingerprint, confidence, first_seen_at, last_verified_at, created_at, updated_at
      ) VALUES (?1, 'high', ?2, ?2, ?2, ?2) RETURNING id
    `).bind(evidence?.fingerprint || null, timestamp).first<{ id: number }>();
    const candidateGroupId = group?.id ?? null;
    if (!candidateGroupId) throw new Error('Unable to allocate an account group');
    const anchor = [...component.signals].sort((left, right) => left.id - right.id)[0];
    if (!anchor) throw new Error('Unable to lock an account group without a signal');
    const claimed = await env.DB.prepare(`
      UPDATE account_group_signals SET account_group_id = ?2, updated_at = ?3
      WHERE id = ?1 AND account_group_id IS NULL
      RETURNING account_group_id
    `).bind(anchor.id, candidateGroupId, timestamp).first<{ account_group_id: number }>();
    if (claimed) {
      targetGroupId = candidateGroupId;
    } else {
      const winner = await env.DB.prepare('SELECT account_group_id FROM account_group_signals WHERE id = ?1')
        .bind(anchor.id).first<{ account_group_id: number | null }>();
      targetGroupId = winner?.account_group_id ?? null;
      await env.DB.prepare('DELETE FROM account_groups WHERE id = ?1').bind(candidateGroupId).run();
      if (!targetGroupId) throw new Error('Concurrent account group allocation did not publish a target');
    }
    // Re-read after allocation so concurrent linkage is folded into the same
    // deterministic lowest-id target before the atomic component mutation.
    component = await discoverConnectedComponent(env.DB, character.ocid);
    groupIds = [...new Set([
      targetGroupId,
      ...component.characters.map((row) => row.account_group_id)
        .filter((id): id is number => id != null),
      ...component.signals.map((row) => row.account_group_id)
        .filter((id): id is number => id != null),
    ])].sort((left, right) => left - right);
    targetGroupId = groupIds[0];
  }

  const obsoleteGroupIds = groupIds.filter((id) => id !== targetGroupId);
  const looseOcids = component.characters
    .filter((row) => row.account_group_id !== targetGroupId)
    .map((row) => row.ocid);
  const mutationStartedAt = Date.now();
  const auditReason = obsoleteGroupIds.length
    ? 'merged_connected_groups'
    : 'linked_connected_characters';
  const characterChunks = Array.from(
    { length: Math.ceil(component.characters.length / D1_MUTATION_CHUNK_SIZE) },
    (_, index) => component.characters.slice(
      index * D1_MUTATION_CHUNK_SIZE,
      (index + 1) * D1_MUTATION_CHUNK_SIZE,
    ),
  );
  const statements: D1PreparedStatement[] = [
    ...obsoleteGroupIds.flatMap((obsoleteId) => [
      env.DB.prepare('UPDATE characters SET account_group_id = ?1, updated_at = ?2 WHERE account_group_id = ?3')
        .bind(targetGroupId, timestamp, obsoleteId),
      env.DB.prepare('UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2 WHERE account_group_id = ?3')
        .bind(targetGroupId, timestamp, obsoleteId),
    ]),
    ...characterChunks.flatMap((chunk) => [
      env.DB.prepare(`UPDATE characters SET account_group_id = ?1, updated_at = ?2
        WHERE ocid IN (${chunk.map((_, index) => `?${index + 3}`).join(', ')})`)
        .bind(targetGroupId, timestamp, ...chunk.map((row) => row.ocid)),
      env.DB.prepare(`UPDATE account_group_signals SET account_group_id = ?1, updated_at = ?2
        WHERE ocid IN (${chunk.map((_, index) => `?${index + 3}`).join(', ')})`)
        .bind(targetGroupId, timestamp, ...chunk.map((row) => row.ocid)),
    ]),
    env.DB.prepare('UPDATE account_groups SET last_verified_at = ?2, updated_at = ?2 WHERE id = ?1')
      .bind(targetGroupId, timestamp),
  ];
  if (obsoleteGroupIds.length || looseOcids.length) {
    statements.push(env.DB.prepare(`
      INSERT INTO account_group_merge_events (
        timestamp, trigger_ocid, trigger_character, signal_type, fingerprint,
        source_group_id, target_group_id, merged_group_ids_json, merged_ocids_json,
        trigger_source, status, reason
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'success', ?11)
    `).bind(
      timestamp, character.ocid, character.characterName,
      evidence?.type || null, evidence?.fingerprint || null,
      obsoleteGroupIds[0] ?? null, targetGroupId,
      JSON.stringify(obsoleteGroupIds), JSON.stringify(component.characters.map((row) => row.ocid)),
      triggerSource, auditReason,
    ));
  }
  statements.push(...obsoleteGroupIds.map((obsoleteId) => (
    env.DB.prepare('DELETE FROM account_groups WHERE id = ?1').bind(obsoleteId)
  )));
  try {
    await env.DB.batch(statements);
  } catch (error) {
    await appendMergeFailure(
      env, character, triggerSource, evidence, groupIds,
      component.characters.map((row) => row.ocid), error,
    ).catch(() => undefined);
    throw error;
  }
  metrics.accountGroupMutationMs += metricTimer(mutationStartedAt);
  return {
    groupId: targetGroupId,
    lastVerifiedAt: timestamp,
    connectedOcids: component.characters.map((row) => row.ocid),
    matchedSignals,
    mergedGroupIds: obsoleteGroupIds,
  };
};

const storeAndMatchSignals = async (
  env: Env,
  character: PublicCharacter,
  signals: AccountSignal[],
  metrics: AccountSignalInstrumentation,
  triggerSource: AccountSignalTriggerSource,
) => {
  if (signals.length === 0) {
    return convergeAccountGroup(env, character, triggerSource, metrics);
  }
  const timestamp = nowIso();

  // R2 is the only destination for new complete payloads. Every route that
  // reaches this shared writer therefore gets the same retry-safe behavior.
  await Promise.all(signals.map((signal) => writeEvidencePayload(env, {
    ocid: character.ocid,
    signalType: signal.type,
    fingerprintVersion: 1,
    unionFingerprint: signal.fingerprint,
  }, signal.canonical)));

  const signalWriteStartedAt = Date.now();
  await env.DB.batch(signals.map((signal) => env.DB.prepare(`
    INSERT INTO account_group_signals (
      ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint,
      confidence, first_seen_at, last_seen_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, 1, ?4, 'high', ?5, ?5, ?5, ?5)
    ON CONFLICT(ocid, signal_type, fingerprint_version, union_fingerprint) DO UPDATE SET
      account_group_id = COALESCE(excluded.account_group_id, account_group_signals.account_group_id),
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `).bind(character.ocid, character.accountGroupId, signal.type, signal.fingerprint, timestamp)));
  metrics.signalDbWriteMs += metricTimer(signalWriteStartedAt);
  return convergeAccountGroup(env, character, triggerSource, metrics);
};

export const syncCharacterAccountSignals = async (
  env: Env,
  character: PublicCharacter,
  types: AccountSignalType[] = ['union_champion_roster', 'union_raider_full'],
  metrics = createAccountSignalInstrumentation(),
  triggerSource: AccountSignalTriggerSource = 'background',
) => {
  const startedAt = Date.now();
  const discovered = await fetchSignals(env, character.ocid, types, metrics);
  const stored = await storeAndMatchSignals(env, character, discovered.signals, metrics, triggerSource);
  metrics.characterWallMs.push(metricTimer(startedAt));
  return {
    ...stored,
    signals: discovered.signals,
    signalCount: discovered.signals.length,
    championMembers: discovered.championMembers,
    failures: discovered.failures,
    metrics,
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
    if (grouped?.metadataAvailable) continue;
    merged.set(key, champion.metadataAvailable ? champion : (grouped || champion));
  }
  return [...merged.values()];
};

const loadOfficialChampionMembers = async (
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
  const refreshes: CharacterMetadataRefreshRequest[] = [];
  const members = await Promise.all([...uniqueMembers.values()].map(async (member): Promise<RelatedCharacterRecord> => {
    const requestedName = String(member.champion_name || '').trim().normalize('NFC');
    const resolved = await findCharacterByWorldAndName(env.DB, requestedName, character.worldName);
    if (!resolved || !isCanonicalCharacterMetadataComplete(resolved)) {
      refreshes.push({
        characterName: requestedName,
        expectedWorldName: character.worldName,
        ocid: resolved?.ocid,
        reason: resolved ? 'incomplete_metadata' : 'missing_character',
      });
      return {
        ocid: resolved?.ocid || null,
        characterName: requestedName,
        worldName: resolved?.worldName || character.worldName,
        jobName: resolved?.jobName || String(member.champion_class || ''),
        level: resolved && resolved.level > 0 ? resolved.level : null,
        combatPower: resolved ? resolved.combatPower : null,
        characterImage: resolved?.characterImage?.trim() || null,
        guildName: resolved?.guildName ?? null,
        metadataAvailable: false,
      };
    }
    return {
      ocid: resolved.ocid,
      characterName: resolved.characterName,
      worldName: resolved.worldName,
      jobName: resolved.jobName || String(member.champion_class || ''),
      level: resolved.level,
      combatPower: resolved.combatPower,
      characterImage: resolved.characterImage,
      guildName: resolved.guildName,
      metadataAvailable: true,
    } satisfies RelatedCharacterRecord;
  }));
  await enqueueCharacterMetadataRefreshes(env.DB, refreshes);
  return members;
};

export const getCharacterAlts = async (env: Env, characterName: string) => {
  const discovered = await getOrDiscoverCharacter(env, characterName);
  const initialCharacter = discovered.character;
  const config = getRuntimeConfig(env);
  // The full signal shares the background queue lease. A fresh completed row
  // is reused; champion roster remains on-demand because it is also the
  // immediate official member list shown by this endpoint.
  const fullClaim = await claimAccountSignalForOnDemand(
    env.DB,
    initialCharacter.ocid,
    config.accountSignalFreshnessSeconds,
  );
  const syncTypes: AccountSignalType[] = fullClaim
    ? ['union_champion_roster', ACCOUNT_SIGNAL_TYPE]
    : ['union_champion_roster'];

  let synced: Awaited<ReturnType<typeof syncCharacterAccountSignals>>;
  try {
    synced = await syncCharacterAccountSignals(
      env,
      initialCharacter,
      syncTypes,
      undefined,
      'interactive_search',
    );
    if (fullClaim) {
      const fullFailure = synced.failures.find(({ type }) => type === ACCOUNT_SIGNAL_TYPE);
      if (fullFailure) {
        const retryable = !(fullFailure.error instanceof NexonRequestError) || fullFailure.error.retryable;
        await failAccountSignalClaim(
          env.DB,
          fullClaim,
          fullFailure.error,
          retryable,
          config.nexonRetryLimit,
        );
      } else {
        const fullSignalCount = synced.signals.filter(({ type }) => type === ACCOUNT_SIGNAL_TYPE).length;
        await completeAccountSignalClaim(env.DB, fullClaim, fullSignalCount);
      }
    }
  } catch (error) {
    if (fullClaim) {
      await failAccountSignalClaim(env.DB, fullClaim, error, true, config.nexonRetryLimit);
    }
    throw error;
  }

  // Matching can update the current character's account_group_id. Reload it
  // before reading the group so an on-demand request sees the just-merged row.
  const character = await findCharacterByOcid(env.DB, initialCharacter.ocid) || initialCharacter;
  const groupId = character.accountGroupId;
  const accountGroup = groupId
    ? await env.DB.prepare('SELECT id, confidence, last_verified_at AS lastVerifiedAt FROM account_groups WHERE id = ?1')
      .bind(groupId).first<{ id: number; confidence: string; lastVerifiedAt: string | null }>()
    : null;
  const groupedCharacters = groupId ? await listGroupCharacters(env.DB, groupId) : [];
  await enqueueCharacterMetadataRefreshes(env.DB, groupedCharacters
    .filter((member) => !member.metadataAvailable)
    .map((member) => ({
      characterName: member.characterName,
      expectedWorldName: member.worldName,
      ocid: member.ocid,
      reason: 'incomplete_metadata' as const,
    })));
  const officialChampionMembers = await loadOfficialChampionMembers(
    env,
    character,
    synced.championMembers,
  );
  const alts = mergeOfficialChampionMembers(
    groupedCharacters.filter((alt) => alt.ocid !== character.ocid),
    officialChampionMembers,
  );
  const partialReasons = synced.failures.map(({ type, error }) => ({
    signalType: type,
    reason: error instanceof NexonRequestError ? error.code : 'unexpected_error',
    retryable: !(error instanceof NexonRequestError) || error.retryable,
  }));
  const result = {
    character,
    accountGroup,
    confidence: accountGroup?.confidence || 'unknown',
    alts,
    lastVerifiedAt: accountGroup?.lastVerifiedAt || synced.lastVerifiedAt,
    resolution: {
      status: partialReasons.length ? 'partial' as const : 'complete' as const,
      scope: 'available_signal_graph' as const,
      officialAccountComplete: false as const,
      partialReasons,
    },
    disclosure: '依公開聯盟資料推定，並非 NEXON 官方 Account ID',
  };
  console.info(JSON.stringify({
    event: 'account_alts_resolved',
    triggerSource: 'interactive_search',
    triggerCharacter: character.characterName,
    triggerOcid: character.ocid,
    syncedSignalTypes: syncTypes,
    discoveredSignals: synced.signals.map((signal) => ({
      type: signal.type,
      fingerprint: signal.fingerprint,
    })),
    connectedOcids: synced.connectedOcids,
    matchedSignals: synced.matchedSignals,
    mergedGroupIds: synced.mergedGroupIds,
    finalGroupId: groupId,
    returnedAlts: alts.length,
    resolution: result.resolution,
  }));
  return result;
};
