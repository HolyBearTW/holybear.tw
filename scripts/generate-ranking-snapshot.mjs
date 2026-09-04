import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [databasePath, outputPath = 'public/maplestory/rankings/current.json', rawLimit = '100'] = process.argv.slice(2);
if (!databasePath) throw new Error('Usage: node scripts/generate-ranking-snapshot.mjs <sqlite-db> [output] [limit]');
const limit = Math.max(1, Math.min(5000, Number.parseInt(rawLimit, 10) || 100));
const sqlite = (sql) => {
  const result = spawnSync('sqlite3', ['-json', databasePath, sql], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || 'sqlite3 failed');
  return JSON.parse(result.stdout || '[]');
};
const [{ total = 0, generatedAt = new Date().toISOString() } = {}] = sqlite(
  'SELECT COUNT(*) AS total, MAX(updated_at) AS generatedAt FROM characters',
);
const rows = sqlite(`SELECT ocid, character_name AS characterName, world_name AS worldName,
  job_name AS jobName, level, combat_power AS combatPower, guild_name AS guildName
  FROM characters ORDER BY combat_power DESC, ocid ASC LIMIT ${limit}`);
const items = rows.map((row, index) => ({
  ...row,
  characterImage: '',
  rank: index + 1,
}));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ generatedAt, total, items })}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, generatedAt, total, items: items.length }));
