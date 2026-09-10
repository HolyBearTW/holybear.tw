import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  budgetAfter,
  ImportBudgetError,
  type ImportJobRow,
} from '../../functions/_shared/import-repository';
import type { Env } from '../../functions/_shared/env';
import { getRuntimeConfig } from '../../functions/_shared/runtime-config';
import { createTestD1 } from './sqlite-d1';

const CURRENT_DATE = '2026-09-10';

const job = (id: number, rowsWritten: number, date = CURRENT_DATE) => ({
  id,
  d1_budget_date: date,
  d1_rows_read_estimate: 0,
  d1_rows_written_estimate: rowsWritten,
}) as ImportJobRow;

let local: ReturnType<typeof createTestD1>;

beforeEach(() => {
  local = createTestD1();
  vi.useFakeTimers();
  vi.setSystemTime(`${CURRENT_DATE}T00:00:00.000Z`);
});

afterEach(() => {
  local.sqlite.close();
  vi.useRealTimers();
});

describe('import D1 write budget', () => {
  it('accepts a 5M-plus production estimate while retaining the 20M ceiling', async () => {
    const config = getRuntimeConfig({
      DB: local.db,
      SURVEY_DB: local.db,
      IMPORT_D1_WRITE_BUDGET: '20000000',
    } as Env);

    expect(config.importD1WriteBudget).toBe(20_000_000);
    await expect(budgetAfter(local.db, job(1, 5_000_000), 0, 100, config))
      .resolves.toMatchObject({ rowsWritten: 5_000_100 });
  });

  it('keeps the existing shared-budget boundary and rejects only above 20M', async () => {
    local.sqlite.exec(`
      INSERT INTO import_jobs (id, source, status, d1_budget_date, d1_rows_written_estimate)
      VALUES (2, 'manual_seed', 'paused', '${CURRENT_DATE}', 10_000_000)
    `);
    const config = getRuntimeConfig({
      DB: local.db,
      SURVEY_DB: local.db,
      IMPORT_D1_WRITE_BUDGET: '20000000',
    } as Env);

    await expect(budgetAfter(local.db, job(1, 9_999_900), 0, 100, config))
      .resolves.toMatchObject({ rowsWritten: 10_000_000 });
    await expect(budgetAfter(local.db, job(1, 10_000_000), 0, 1, config))
      .rejects.toMatchObject({ code: 'import_budget_reached', kind: 'write' } satisfies Partial<ImportBudgetError>);
  });

  it('leaves the job counter unchanged while projecting the next batch', async () => {
    const current = job(1, 5_000_000);
    const config = getRuntimeConfig({
      DB: local.db,
      SURVEY_DB: local.db,
      IMPORT_D1_WRITE_BUDGET: '20000000',
    } as Env);

    await budgetAfter(local.db, current, 0, 1_923, config);
    expect(current.d1_rows_written_estimate).toBe(5_000_000);
  });
});
