/**
 * Selects a deterministic, rank-distributed sample for every job. The input is
 * expected to be ordered by combat power, so the first and last member of each
 * job are retained and the remaining samples are spread across its full range.
 */
export function selectStratifiedRadarSamples(entries, perJobLimit, normalizeJob = (value) => String(value || '')) {
  const groups = new Map();
  for (const entry of entries) {
    const job = normalizeJob(entry?.job);
    if (!job) continue;
    if (!groups.has(job)) groups.set(job, []);
    groups.get(job).push(entry);
  }

  const selected = [];
  for (const rows of groups.values()) {
    if (rows.length <= perJobLimit) {
      selected.push(...rows);
      continue;
    }
    if (perJobLimit === 1) {
      selected.push(rows[0]);
      continue;
    }
    const indexes = new Set();
    for (let index = 0; index < perJobLimit; index += 1) {
      indexes.add(Math.round(index * (rows.length - 1) / (perJobLimit - 1)));
    }
    selected.push(...[...indexes].map((index) => rows[index]));
  }
  return selected;
}

export const radarCharacterKey = (entry) => entry.ocid ? `ocid:${entry.ocid}`
  : `name:${JSON.stringify([String(entry.world || '').normalize('NFC'), String(entry.name).normalize('NFC')])}`;

export function deduplicateRadarCharacters(entries) {
  const unique = new Map();
  for (const entry of entries) {
    if (!entry?.name) continue;
    const key = radarCharacterKey(entry);
    if (!unique.has(key)) unique.set(key, entry);
  }
  return [...unique.values()];
}

export function prepareRadarCandidates(entries, perJobLimit, normalizeJob = (value) => String(value || '')) {
  const trackedCharacters = deduplicateRadarCharacters(entries);
  const sampledCharacters = selectStratifiedRadarSamples(trackedCharacters, perJobLimit, normalizeJob);
  return {
    trackedCharacters,
    sampledCharacters,
    sourceCount: trackedCharacters.length,
    sampledSourceCount: sampledCharacters.length,
  };
}

export function assertRankingPageIntegrity(page, expectedPage, pageSize, expectedTotal, expectedTotalPages) {
  if (page?.degraded || page?.unavailable) {
    throw new Error(`Radar candidate page ${expectedPage} is degraded or unavailable`);
  }
  const total = Number(page?.total);
  const totalPages = Number(page?.totalPages);
  const actualPage = Number(page?.page);
  const actualPageSize = Number(page?.pageSize);
  const items = Array.isArray(page?.items) ? page.items : null;
  if (!Number.isSafeInteger(total) || total < 1
    || !Number.isSafeInteger(totalPages) || totalPages < 1
    || actualPage !== expectedPage || actualPageSize !== pageSize || !items) {
    throw new Error(`Radar candidate page ${expectedPage} has invalid pagination metadata`);
  }
  if (totalPages !== Math.ceil(total / pageSize)) {
    throw new Error(`Radar candidate page ${expectedPage} has inconsistent totalPages`);
  }
  if (expectedTotal != null && (total !== expectedTotal || totalPages !== expectedTotalPages)) {
    throw new Error(`Radar candidate pagination changed while fetching page ${expectedPage}`);
  }
  const expectedItems = expectedPage < totalPages ? pageSize : total - pageSize * (totalPages - 1);
  if (items.length !== expectedItems) {
    throw new Error(`Radar candidate page ${expectedPage} returned ${items.length}/${expectedItems} items`);
  }
  return { total, totalPages, items };
}

export function assertCandidateUniverseIntegrity({
  sourceCount,
  fetchedCount,
  expectedTotal,
  previousSourceCount = 0,
  minimumSourceCount = 0,
  minimumPreviousRatio = 0.8,
}) {
  if (fetchedCount !== expectedTotal) {
    throw new Error(`Radar candidate fetch returned ${fetchedCount}/${expectedTotal} rows`);
  }
  if (sourceCount < minimumSourceCount) {
    throw new Error(`Radar candidate source ${sourceCount} is below the required minimum ${minimumSourceCount}`);
  }
  const relativeMinimum = Math.floor(previousSourceCount * minimumPreviousRatio);
  if (previousSourceCount > 0 && sourceCount < relativeMinimum) {
    throw new Error(`Radar candidate source shrank from ${previousSourceCount} to ${sourceCount}`);
  }
}

export function shouldRefreshRadarCache({ forceRefresh, cachedAt, now, cacheTtlMs }) {
  if (forceRefresh) return true;
  return !Number.isFinite(cachedAt) || now - cachedAt > cacheTtlMs;
}

const payloadWithoutGeneratedAt = (reference) => {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) return reference;
  const { generatedAt: _generatedAt, ...payload } = reference;
  return payload;
};

export function finalizeRadarReference(previousReference, nextPayload, generatedAt) {
  const previousPayload = payloadWithoutGeneratedAt(previousReference);
  const changed = JSON.stringify(previousPayload) !== JSON.stringify(nextPayload);
  return {
    changed,
    reference: changed ? { generatedAt, ...nextPayload } : previousReference,
  };
}
