import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Executes the real migration/production SQL locally; never connects to Cloudflare.
export const createTestD1 = () => {
  const sqlite = new DatabaseSync(':memory:');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  class Statement {
    values: Array<string | number | null> = [];
    constructor(readonly sql: string) {}
    bind(...values: Array<string | number | null>) {
      if (values.length > 100) throw new Error('D1 statement parameter limit exceeded');
      this.values = values; return this;
    }
    execute() {
      const prepared = sqlite.prepare(this.sql);
      // D1's numbered parameters bind positionally; node:sqlite treats them as named.
      const bindings = Object.fromEntries(this.values.map((value, index) => [`?${index + 1}`, value]));
      return this.values.length ? prepared.all(bindings) : prepared.all();
    }
    async first(column?: string) { const row = this.execute()[0]; return column ? row?.[column] ?? null : row ?? null; }
    async all() { return { results: this.execute(), success: true }; }
    async run() { return { results: this.execute(), success: true }; }
  }
  const db = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((statement) => ({ results: statement.execute(), success: true }));
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  } as unknown as D1Database;
  return { db, sqlite };
};
