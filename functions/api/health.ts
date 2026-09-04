import type { AppPagesFunction } from '../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env }) => {
  try {
    const migration = await env.DB.prepare('SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1')
      .first<{ name: string }>();
    return json({ ok: true, database: 'connected', latestMigration: migration?.name ?? null });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
