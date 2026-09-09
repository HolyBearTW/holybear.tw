import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('retired provider removal', () => {
  it('has no retired Growth client, importer, component, API URL, or active route', () => {
    expect(existsSync(resolve(root, '.vitepress/theme/maplestory/services/maplerhouseService.ts'))).toBe(false);
    expect(existsSync(resolve(root, '.vitepress/theme/maplestory/components/MaplerHouseGrowthTracker.tsx'))).toBe(false);
    expect(existsSync(resolve(root, 'functions/_shared/importers/maplerhouse-importer.ts'))).toBe(false);
    expect(read('.vitepress/theme/maplestory/services/growthService.ts')).not.toMatch(/maplerhouse/i);
    expect(read('.vitepress/theme/maplestory/components/GrowthTracker.tsx')).not.toMatch(/maplerhouse/i);
    expect(read('functions/api/admin/import/[source].ts')).not.toMatch(/maplerhouse/i);
    expect(read('scripts/run-maple-import.mjs')).not.toMatch(/maplerhouse/i);
  });

  it('has no retired provider disclosure in either privacy policy', () => {
    const policies = `${read('privacy.md')}\n${read('en/privacy.md')}`;
    expect(policies).not.toMatch(/mapler\s*house|maplerhouse|冒險者小屋/i);
    expect(policies).toContain('最後更新：2026 年 9 月 10 日');
    expect(policies).toContain('Last updated: September 10, 2026');
  });
});
