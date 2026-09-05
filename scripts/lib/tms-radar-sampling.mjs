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
