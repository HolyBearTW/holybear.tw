import type { Env } from './env';
import { findCharacterByOcid, invalidateCharacterStatement, isCanonicalCharacterMetadataComplete } from './character-repository';
import { fetchNexonJson, isUnavailableNameLookup, runWithConcurrency } from './nexon-client';
import { invalidateCachedCharacterRank } from './ranking-cache';
import { mergeRelatedCharacters, type RelatedCharacterRecord } from './related-character-policy';

const VERIFIED_CACHE_SECONDS = 300;
const UNAVAILABLE_CACHE_SECONDS = 300;
const UNKNOWN_CACHE_SECONDS = 30;
type NameCheck = {
  status: 'valid' | 'unavailable' | 'unknown';
  checkedAt: string;
  reason?: 'missing' | 'mismatch';
};
const cacheKey = (member: RelatedCharacterRecord) => new Request(
  `https://holybear.tw/__related-name-v1/${encodeURIComponent(member.ocid || 'unresolved')}?name=${encodeURIComponent(member.characterName.trim().normalize('NFC'))}&world=${encodeURIComponent(member.worldName)}`,
);
const edgeCache = () => (caches as unknown as { default: Cache }).default;
const cacheSeconds = (check: NameCheck) => check.status === 'unknown' ? UNKNOWN_CACHE_SECONDS
  : check.status === 'valid' ? VERIFIED_CACHE_SECONDS : UNAVAILABLE_CACHE_SECONDS;

const checkName = async (env: Env, member: RelatedCharacterRecord): Promise<NameCheck> => {
  const checkedAt = new Date().toISOString();
  const key = cacheKey(member);
  const cached = await (async () => {
    try {
      const response = await edgeCache().match(key);
      if (!response) return null;
      const check = await response.json<NameCheck>();
      if (!['valid', 'unavailable', 'unknown'].includes(check.status)) return null;
      const age = Date.now() - Date.parse(check.checkedAt);
      if (!Number.isFinite(age) || age < 0 || age > cacheSeconds(check) * 1000) return null;
      if (check.status === 'unavailable'
        && Date.parse(member.lastCheckedAt || '') > Date.parse(check.checkedAt)) return null;
      return check;
    } catch { return null; }
  })();
  if (cached) return cached;

  let check: NameCheck;
  try {
    // Identity-only lookup: no canonical basic/stat refresh, source writes,
    // or per-member D1 reads. Transient failures keep the known relation.
    const result = await fetchNexonJson<{ ocid?: unknown }>({
      ...env, NEXON_RETRY_LIMIT: '1', NEXON_REQUEST_TIMEOUT_MS: '3000',
    }, `/id?character_name=${encodeURIComponent(member.characterName.trim().normalize('NFC'))}`);
    check = typeof result.ocid !== 'string' || !result.ocid.trim()
      ? { status: 'unknown', checkedAt }
      : !member.ocid || result.ocid === member.ocid ? { status: 'valid', checkedAt }
        : { status: 'unavailable', checkedAt, reason: 'mismatch' };
  } catch (error) {
    // The name is already present and encoded in a fixed /id request. NEXON
    // uses 00003/00004 for an unavailable target. Bare HTTP failures, bad keys,
    // invalid API paths and transient service errors are not identity proof.
    check = isUnavailableNameLookup(error)
      ? { status: 'unavailable', checkedAt, reason: 'missing' }
      : { status: 'unknown', checkedAt };
  }
  try {
    await edgeCache().put(key, Response.json(check, {
      headers: { 'cache-control': `public, max-age=${cacheSeconds(check)}` },
    }));
  } catch { /* Edge caching is optional; never persist positive checks to D1. */ }
  return check;
};

export const verifyRelatedCharacterNames = async (
  env: Env, members: RelatedCharacterRecord[], currentOcid: string,
) => {
  const candidates = mergeRelatedCharacters(members).filter((member) => member.ocid !== currentOcid);
  const settled = await runWithConcurrency(candidates, 4, 0, async (member) => {
    if (!member.isActive) return member;
    const check = await checkName(env, member);
    if (check.status !== 'unavailable') return member;
    if (!member.ocid) return { ...member, isActive: false };
    const reason = check.reason === 'mismatch'
      ? '此名字已不再對應原角色，已停止舊角色的自動更新並移出排名'
      : '舊名字已無法查詢，已停止自動更新並移出排名';
    try {
      const result = await invalidateCharacterStatement(
        env.DB, member.ocid, member.characterName, check.checkedAt, reason,
      ).run();
      if (!result.meta.changes) {
        // Only a guarded negative write needs this extra primary-key read: a
        // newer canonical refresh, or another invalidation, may have won.
        const current = await findCharacterByOcid(env.DB, member.ocid);
        if (current?.isActive !== false && current) return {
          ...member, characterName: current.characterName, worldName: current.worldName,
          jobName: current.jobName, level: current.level, combatPower: current.combatPower,
          characterImage: current.characterImage, guildName: current.guildName,
          lastCheckedAt: current.requestedAt ?? null,
          metadataAvailable: isCanonicalCharacterMetadataComplete(current),
        };
      }
    } catch (error) {
      console.error('Unable to persist confirmed unavailable related character', member.ocid, error);
    }
    await invalidateCachedCharacterRank(member.characterName).catch(() => undefined);
    return { ...member, isActive: false };
  });
  return settled.map((result, index) => result.status === 'fulfilled' ? result.value : candidates[index]);
};
