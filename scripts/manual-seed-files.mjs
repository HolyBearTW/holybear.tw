import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_MANUAL_SEED_DIR = path.join('data', 'manual-character-seed');

const integer = (value, minimum = 0) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : null;
};

const power = (value) => {
  const parsed = Number(String(value ?? '').replaceAll(',', ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

export const normalizeName = (value) => String(value ?? '')
  .trim()
  .normalize('NFC')
  .toLocaleLowerCase('zh-TW');

export const pageFromFilename = (filename) => {
  const match = /^page-(\d+)\.json$/i.exec(filename);
  return match ? integer(match[1], 1) : null;
};

export const parseManualSeedPage = (payload, expectedPage, observedAt = new Date().toISOString()) => {
  if (!payload || !Array.isArray(payload.data) || !payload.pagination) {
    throw new Error('JSON must contain data[] and pagination');
  }
  const page = integer(payload.pagination.page, 1);
  const limit = integer(payload.pagination.limit, 1);
  const total = integer(payload.pagination.total, 0);
  const totalPages = integer(payload.pagination.totalPages, 1);
  const version = integer(payload.version, 0);
  if (page !== expectedPage) throw new Error(`pagination.page ${page} does not match filename page ${expectedPage}`);
  if (limit == null || total == null || totalPages == null || page > totalPages) throw new Error('pagination values are invalid');
  if (version == null) throw new Error('version is missing or invalid');

  let invalidRecords = 0;
  let blankNames = 0;
  const items = [];
  for (const record of payload.data) {
    if (!record || typeof record !== 'object') {
      invalidRecords += 1;
      continue;
    }
    const characterName = String(record.characterName ?? '').trim().normalize('NFC');
    if (!characterName) {
      invalidRecords += 1;
      blankNames += 1;
      continue;
    }
    const normalizedName = normalizeName(characterName);
    items.push({
      sourceId: normalizedName,
      characterName,
      normalizedName,
      worldName: String(record.worldName ?? ''),
      jobName: String(record.characterClass ?? ''),
      level: power(record.characterLevel),
      combatPower: power(record.characterPower),
      characterImage: String(record.characterImage ?? ''),
      sourceUpdatedAt: record.maxCharacterPowerRecordedAt || payload.lastUpdatedAt || null,
      observedAt,
    });
  }
  return {
    page,
    limit,
    total,
    totalPages,
    version,
    rawRecords: payload.data.length,
    validRecords: items.length,
    invalidRecords,
    blankNames,
    items,
  };
};

export const readManualSeedPage = async (absolutePath, expectedPage) => {
  const raw = await readFile(absolutePath, 'utf8');
  const payload = JSON.parse(raw);
  const fileStat = await stat(absolutePath);
  return {
    ...parseManualSeedPage(payload, expectedPage, fileStat.mtime.toISOString()),
    checksum: createHash('sha256').update(raw).digest('hex'),
  };
};

const compactRanges = (values) => {
  if (!values.length) return [];
  const ranges = [];
  let start = values[0];
  let end = start;
  for (const value of values.slice(1)) {
    if (value === end + 1) end = value;
    else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = value;
      end = value;
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges;
};

export const scanManualSeedDirectory = async (directory = DEFAULT_MANUAL_SEED_DIR, onProgress) => {
  const resolvedDirectory = path.resolve(directory);
  const filenames = (await readdir(resolvedDirectory)).filter((name) => name.toLowerCase().endsWith('.json')).sort();
  const filesByPage = new Map();
  const invalidFiles = [];
  for (const filename of filenames) {
    const page = pageFromFilename(filename);
    if (page == null) {
      invalidFiles.push({ filename, error: 'Expected page-000001.json filename' });
      continue;
    }
    const list = filesByPage.get(page) ?? [];
    list.push(filename);
    filesByPage.set(page, list);
  }
  const duplicatePages = [...filesByPage.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([page, names]) => ({ page, filenames: names }));
  const duplicatePageNumbers = new Set(duplicatePages.map(({ page }) => page));
  const summaries = [];
  const uniqueNames = new Set();
  let rawRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;
  let blankNames = 0;
  let duplicateRecords = 0;
  let scanned = 0;

  for (const [page, names] of [...filesByPage.entries()].sort(([left], [right]) => left - right)) {
    if (duplicatePageNumbers.has(page)) continue;
    const filename = names[0];
    const absolutePath = path.join(resolvedDirectory, filename);
    try {
      const parsed = await readManualSeedPage(absolutePath, page);
      let pageDuplicateRecords = 0;
      for (const item of parsed.items) {
        if (uniqueNames.has(item.normalizedName)) {
          duplicateRecords += 1;
          pageDuplicateRecords += 1;
        }
        else uniqueNames.add(item.normalizedName);
      }
      rawRecords += parsed.rawRecords;
      validRecords += parsed.validRecords;
      invalidRecords += parsed.invalidRecords;
      blankNames += parsed.blankNames;
      summaries.push({
        filename,
        absolutePath,
        page,
        limit: parsed.limit,
        total: parsed.total,
        totalPages: parsed.totalPages,
        version: parsed.version,
        rawRecords: parsed.rawRecords,
        validRecords: parsed.validRecords,
        newUniqueRecords: parsed.validRecords - pageDuplicateRecords,
        duplicateRecords: pageDuplicateRecords,
        checksum: parsed.checksum,
      });
    } catch (error) {
      invalidFiles.push({ filename, error: String(error?.message ?? error) });
    }
    scanned += 1;
    if (scanned % 100 === 0) onProgress?.({ scanned, total: filesByPage.size });
  }

  const pages = [...filesByPage.keys()].sort((a, b) => a - b);
  const minPage = pages[0] ?? null;
  const maxPage = pages.at(-1) ?? null;
  const missing = [];
  if (minPage != null && maxPage != null) {
    const found = new Set(pages);
    for (let page = minPage; page <= maxPage; page += 1) if (!found.has(page)) missing.push(page);
  }
  const distinct = (field) => [...new Set(summaries.map((summary) => summary[field]))];
  return {
    directory: resolvedDirectory,
    filesFound: filenames.length,
    minPage,
    maxPage,
    missingPages: compactRanges(missing),
    duplicatePages,
    invalidFiles,
    rawRecords,
    validRecords,
    invalidRecords,
    blankNames,
    duplicateRecords,
    uniqueCharacters: uniqueNames.size,
    schema: {
      limits: distinct('limit'),
      totals: distinct('total'),
      totalPages: distinct('totalPages'),
      versions: distinct('version'),
    },
    summaries,
  };
};
