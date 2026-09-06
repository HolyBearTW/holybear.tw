import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as getSurveyAdmin } from '../../functions/api/admin/survey';
import { onRequestDelete as deleteSurveyResponse } from '../../functions/api/admin/survey/[id]';
import { onRequestPost as submitSurvey } from '../../functions/api/survey';
import { onRequest as surveyMethod } from '../../functions/api/survey';
import { createSurveyIpFingerprint, deriveSurveyRiskFlags, recordSurveyAbuseEvent } from '../../functions/_shared/survey';

const validBody = {
  anonymousId: '11111111-1111-4111-8111-111111111111',
  usageFrequency: 'frequent',
  satisfactionScore: 5,
  supportContinue: 'support',
  futureUseIntent: 'will',
  improvementFeedback: '希望增加更多比較圖表',
  otherFeedback: '謝謝維護工具',
};

const makeRequest = (body: Record<string, unknown> = validBody, headers: Record<string, string> = {}) => new Request('https://holybear.tw/api/survey', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-turnstile-token': 'turnstile-token', 'cf-connecting-ip': '203.0.113.10', ...headers },
  body: JSON.stringify(body),
});

const makeDb = (changes = 1) => ({
  prepare: vi.fn((query: string) => ({
    bind: vi.fn(() => ({
      run: vi.fn(async () => ({ meta: { changes } })),
      all: vi.fn(async () => ({ results: [{ id: 1, created_at: '2026-09-06T00:00:00.000Z', improvement_feedback: '建議', other_feedback: '留言' }] })),
      first: vi.fn(async () => undefined),
    })),
    first: vi.fn(async () => ({ total_responses: 2, average_satisfaction: 4.5 })),
    all: vi.fn(async () => query.includes('GROUP BY')
      ? { results: [] }
      : { results: [{ id: 1, created_at: '2026-09-06T00:00:00.000Z', improvement_feedback: '建議', other_feedback: '留言' }] }),
  })),
});

const envFor = (db = makeDb(), secret = 'survey-admin-secret') => ({
  SURVEY_DB: db,
  SURVEY_ADMIN_SECRET: secret,
  SURVEY_FINGERPRINT_SECRET: 'preview-fingerprint-secret',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
}) as never;

type FakeSurveyRow = {
  id: number;
  created_at: string;
  anonymous_id: string;
  usage_frequency: string;
  satisfaction_score: number;
  support_continue: string;
  future_use_intent: string;
  improvement_feedback: string;
  other_feedback: string;
  ip_fingerprint: string;
  risk_flags: string;
  is_suspicious: number;
};

const makeStatefulDb = (seed: Partial<FakeSurveyRow>[] = []) => {
  const responses: FakeSurveyRow[] = seed.map((row, index) => ({
    id: index + 1,
    created_at: new Date().toISOString(),
    anonymous_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    usage_frequency: 'frequent',
    satisfaction_score: 5,
    support_continue: 'support',
    future_use_intent: 'will',
    improvement_feedback: '',
    other_feedback: '',
    ip_fingerprint: 'seed-fingerprint',
    risk_flags: '',
    is_suspicious: 0,
    ...row,
  }));
  const events: { event_type: string; ip_fingerprint: string; created_at: string }[] = [];
  const recent = (value: string, since: string) => value >= since;
  const statusFilter = (query: string) => query.includes('is_suspicious = 1') ? 1 : query.includes('is_suspicious = 0') ? 0 : null;
  const firstFor = (query: string, params: unknown[]) => {
    if (query.includes('FROM survey_abuse_events') && query.includes('SUM(CASE')) {
      const fingerprint = String(params[0]);
      const since = String(params[1]);
      const matching = events.filter((event) => event.ip_fingerprint === fingerprint && recent(event.created_at, since));
      return {
        total: matching.length,
        network_cooldown: matching.filter((event) => event.event_type === 'network_cooldown').length,
        duplicate_browser: matching.filter((event) => event.event_type === 'duplicate_browser').length,
        turnstile_failed: matching.filter((event) => event.event_type === 'turnstile_failed').length,
        schema_invalid: matching.filter((event) => event.event_type === 'schema_invalid').length,
      };
    }
    if (query.includes('WHERE anonymous_id = ?1')) return responses.find((row) => row.anonymous_id === String(params[0]));
    if (query.includes('WHERE ip_fingerprint = ?1')) return responses.find((row) => row.ip_fingerprint === String(params[0]) && recent(row.created_at, String(params[1])));
    if (query.includes('COUNT(*) AS count') && query.includes('survey_abuse_events')) {
      return { count: events.filter((event) => event.event_type === 'network_cooldown' && recent(event.created_at, String(params[0]))).length };
    }
    if (query.includes('COUNT(*) AS count') && query.includes('is_suspicious = 1')) return { count: responses.filter((row) => row.is_suspicious === 1).length };
    if (query.includes('COUNT(*) AS total_responses')) {
      const flag = statusFilter(query);
      const matching = flag === null ? responses : responses.filter((row) => row.is_suspicious === flag);
      return { total_responses: matching.length, average_satisfaction: matching.length ? matching.reduce((sum, row) => sum + row.satisfaction_score, 0) / matching.length : 0 };
    }
    return undefined;
  };
  const allFor = (query: string) => {
    if (query.includes('GROUP BY')) {
      const column = query.match(/SELECT (\w+) AS value/)?.[1] as keyof FakeSurveyRow;
      const flag = statusFilter(query);
      const matching = flag === null ? responses : responses.filter((row) => row.is_suspicious === flag);
      const counts = new Map<string, number>();
      matching.forEach((row) => counts.set(String(row[column]), (counts.get(String(row[column])) || 0) + 1));
      return { results: Array.from(counts, ([value, count]) => ({ value, count })) };
    }
    const flag = statusFilter(query);
    const matching = flag === null ? responses : responses.filter((row) => row.is_suspicious === flag);
    return { results: matching.map((row) => ({ ...row })) };
  };
  const db = {
    prepare: vi.fn((query: string) => {
      const bind = (...params: unknown[]) => ({
        run: vi.fn(async () => {
          if (query.includes('INSERT OR IGNORE INTO survey_responses')) {
            const anonymousId = String(params[0]);
            const fingerprint = String(params[7]);
            const since = String(params[12]);
            if (responses.some((row) => row.anonymous_id === anonymousId || (row.ip_fingerprint === fingerprint && recent(row.created_at, since)))) {
              return { meta: { changes: 0 } };
            }
            responses.push({
              id: responses.length + 1,
              created_at: new Date().toISOString(),
              anonymous_id: anonymousId,
              usage_frequency: String(params[1]),
              satisfaction_score: Number(params[2]),
              support_continue: String(params[3]),
              future_use_intent: String(params[4]),
              improvement_feedback: String(params[5]),
              other_feedback: String(params[6]),
              ip_fingerprint: fingerprint,
              risk_flags: String(params[8]),
              is_suspicious: Number(params[9]),
            });
            return { meta: { changes: 1 } };
          }
          if (query.includes('INSERT INTO survey_abuse_events')) {
            events.push({ event_type: String(params[0]), ip_fingerprint: String(params[1]), created_at: new Date().toISOString() });
          }
          return { meta: { changes: 1 } };
        }),
        first: vi.fn(async () => firstFor(query, params)),
        all: vi.fn(async () => allFor(query)),
      });
      return {
        bind,
        first: vi.fn(async () => firstFor(query, [])),
        all: vi.fn(async () => allFor(query)),
      };
    }),
  };
  return { db: db as never, responses, events };
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' },
  })));
});

describe('survey submission API', () => {
  it('accepts a valid submission', async () => {
    const response = await submitSurvey({ env: envFor(), request: makeRequest() } as never);
    expect(response.status).toBe(201);
    expect((await response.json() as { ok?: boolean }).ok).toBe(true);
  });

  it('allows optional free-text fields to be omitted', async () => {
    const { improvementFeedback: _improvement, otherFeedback: _other, ...requiredOnly } = validBody;
    const response = await submitSurvey({ env: envFor(), request: makeRequest(requiredOnly) } as never);
    expect(response.status).toBe(201);
  });

  it('rejects a second submission from the same anonymous id and records the browser signal', async () => {
    const state = makeStatefulDb();
    const first = await submitSurvey({ env: envFor(state.db), request: makeRequest() } as never);
    const second = await submitSurvey({ env: envFor(state.db), request: makeRequest() } as never);
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(state.responses).toHaveLength(1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_type: 'duplicate_browser', ip_fingerprint: state.responses[0].ip_fingerprint }),
    ]));
  });

  it.each([
    ['satisfactionScore', 0],
    ['satisfactionScore', 6],
    ['usageFrequency', 'never'],
    ['supportContinue', 'maybe'],
    ['futureUseIntent', 'later'],
  ])('rejects invalid %s values', async (field, value) => {
    const body = { ...validBody, [field]: value };
    const response = await submitSurvey({ env: envFor(), request: makeRequest(body) } as never);
    expect(response.status).toBe(400);
  });

  it('rejects overlong text', async () => {
    const response = await submitSurvey({ env: envFor(), request: makeRequest({ ...validBody, improvementFeedback: 'x'.repeat(2001) }) } as never);
    expect(response.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const { supportContinue: _removed, ...missing } = validBody;
    const response = await submitSurvey({ env: envFor(), request: makeRequest(missing) } as never);
    expect(response.status).toBe(400);
  });

  it('rejects arbitrary extra fields', async () => {
    const response = await submitSurvey({ env: envFor(), request: makeRequest({ ...validBody, unexpected: true }) } as never);
    expect(response.status).toBe(400);
  });

  it('fails closed when Turnstile server configuration is missing', async () => {
    const response = await submitSurvey({
      env: { SURVEY_DB: makeDb() } as never,
      request: makeRequest(),
    } as never);
    expect(response.status).toBe(503);
  });

  it('does not expose a public GET response endpoint', async () => {
    const response = surveyMethod();
    expect(response.status).toBe(405);
  });

  it('blocks a different browser on the same network for 24 hours', async () => {
    const request = makeRequest({ ...validBody, anonymousId: '22222222-2222-4222-8222-222222222222' });
    const fingerprint = await createSurveyIpFingerprint(request, 'preview-fingerprint-secret');
    const state = makeStatefulDb([{ ip_fingerprint: fingerprint }]);
    const response = await submitSurvey({ env: envFor(state.db), request } as never);
    expect(response.status).toBe(429);
    expect(state.responses).toHaveLength(1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_type: 'network_cooldown', ip_fingerprint: fingerprint }),
    ]));
    const payload = await response.json() as { error?: { code?: string; message?: string } };
    expect(payload.error?.code).toBe('SURVEY_NETWORK_COOLDOWN');
    expect(payload.error?.message).not.toContain('IP');
    expect(JSON.stringify(payload)).not.toContain('203.0.113.10');
  });

  it('allows the same network after the 24-hour cooldown', async () => {
    const request = makeRequest({ ...validBody, anonymousId: '33333333-3333-4333-8333-333333333333' });
    const fingerprint = await createSurveyIpFingerprint(request, 'preview-fingerprint-secret');
    const state = makeStatefulDb([{ ip_fingerprint: fingerprint, created_at: new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString() }]);
    const response = await submitSurvey({ env: envFor(state.db), request } as never);
    expect(response.status).toBe(201);
    expect(state.responses).toHaveLength(2);
  });

  it('allows a different network fingerprint', async () => {
    const request = makeRequest({ ...validBody, anonymousId: '44444444-4444-4444-8444-444444444444' }, { 'cf-connecting-ip': '198.51.100.42' });
    const state = makeStatefulDb([{ ip_fingerprint: 'another-network-fingerprint' }]);
    const response = await submitSurvey({ env: envFor(state.db), request } as never);
    expect(response.status).toBe(201);
  });

  it('fails closed when the fingerprint secret is missing', async () => {
    const response = await submitSurvey({
      env: { SURVEY_DB: makeDb(), TURNSTILE_SECRET_KEY: 'turnstile-secret' } as never,
      request: makeRequest(),
    } as never);
    expect(response.status).toBe(503);
  });

  it('stores only an HMAC fingerprint and never the raw IP', async () => {
    const request = makeRequest();
    const state = makeStatefulDb();
    const response = await submitSurvey({ env: envFor(state.db), request } as never);
    expect(response.status).toBe(201);
    expect(state.responses[0].ip_fingerprint).toHaveLength(64);
    expect(state.responses[0].ip_fingerprint).not.toBe('203.0.113.10');
    expect(JSON.stringify(state.responses[0])).not.toContain('203.0.113.10');
  });

  it('does not log a raw IP when abuse telemetry fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failingDb = {
      prepare: vi.fn(() => { throw new Error('telemetry unavailable'); }),
    } as never;
    try {
      await recordSurveyAbuseEvent(failingDb, '203.0.113.10', 'schema_invalid');
      const logged = errorSpy.mock.calls.flat().map(String).join(' ');
      expect(logged).not.toContain('203.0.113.10');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('does not mark a normal negative answer as suspicious', async () => {
    const state = makeStatefulDb();
    const response = await submitSurvey({
      env: envFor(state.db),
      request: makeRequest({ ...validBody, satisfactionScore: 1, supportContinue: 'oppose', futureUseIntent: 'will_not' }),
    } as never);
    expect(response.status).toBe(201);
    expect(state.responses[0].is_suspicious).toBe(0);
    expect(state.responses[0].risk_flags).toBe('');
  });

  it('can mark an otherwise valid submission suspicious after technical abuse signals', async () => {
    const state = makeStatefulDb();
    state.events.push(
      { event_type: 'duplicate_browser', ip_fingerprint: 'pending', created_at: new Date().toISOString() },
      { event_type: 'duplicate_browser', ip_fingerprint: 'pending', created_at: new Date().toISOString() },
    );
    const request = makeRequest({ ...validBody, anonymousId: '55555555-5555-4555-8555-555555555555' });
    const fingerprint = await createSurveyIpFingerprint(request, 'preview-fingerprint-secret');
    state.events.forEach((event) => { event.ip_fingerprint = fingerprint; });
    const response = await submitSurvey({ env: envFor(state.db), request } as never);
    expect(response.status).toBe(201);
    expect(state.responses[0].is_suspicious).toBe(1);
    expect(state.responses[0].risk_flags).toContain('duplicate_browser_pattern');
  });

  it('derives risk flags only from technical signals', () => {
    expect(deriveSurveyRiskFlags({ total: 0, networkCooldown: 0, duplicateBrowser: 0, turnstileFailed: 0, schemaInvalid: 0 })).toEqual([]);
    expect(deriveSurveyRiskFlags({ total: 4, networkCooldown: 0, duplicateBrowser: 2, turnstileFailed: 0, schemaInvalid: 0 })).toEqual(['duplicate_browser_pattern', 'rapid_abuse_pattern']);
  });
});

describe('survey admin API', () => {
  it('rejects unauthenticated access to statistics', async () => {
    const response = await getSurveyAdmin({ env: envFor(), request: new Request('https://holybear.tw/api/admin/survey') } as never);
    expect(response.status).toBe(401);

    const csvResponse = await getSurveyAdmin({ env: envFor(), request: new Request('https://holybear.tw/api/admin/survey?format=csv') } as never);
    expect(csvResponse.status).toBe(401);
  });

  it('returns statistics and feedback only with the survey secret', async () => {
    const response = await getSurveyAdmin({
      env: envFor(),
      request: new Request('https://holybear.tw/api/admin/survey', { headers: { authorization: 'Bearer survey-admin-secret' } }),
    } as never);
    expect(response.status).toBe(200);
    expect((await response.json() as { totalResponses?: number }).totalResponses).toBe(2);
  });

  it('supports authenticated CSV export and single-response deletion', async () => {
    const response = await getSurveyAdmin({
      env: envFor(),
      request: new Request('https://holybear.tw/api/admin/survey?format=csv', { headers: { authorization: 'Bearer survey-admin-secret' } }),
    } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');

    const deleted = await deleteSurveyResponse({
      env: envFor(),
      params: { id: '1' },
      request: new Request('https://holybear.tw/api/admin/survey/1', { method: 'DELETE', headers: { authorization: 'Bearer survey-admin-secret' } }),
    } as never);
    expect(deleted.status).toBe(200);
  });

  it('returns trusted statistics separately from all accepted responses', async () => {
    const state = makeStatefulDb([
      { satisfaction_score: 5, is_suspicious: 0 },
      { satisfaction_score: 1, is_suspicious: 1, risk_flags: 'rapid_abuse_pattern' },
    ]);
    const trusted = await getSurveyAdmin({
      env: envFor(state.db),
      request: new Request('https://holybear.tw/api/admin/survey?view=trusted', { headers: { authorization: 'Bearer survey-admin-secret' } }),
    } as never);
    expect(trusted.status).toBe(200);
    const trustedPayload = await trusted.json() as { totalResponses: number; trustedResponses: number; suspiciousResponses: number; allStats: { totalResponses: number } };
    expect(trustedPayload.totalResponses).toBe(1);
    expect(trustedPayload.trustedResponses).toBe(1);
    expect(trustedPayload.suspiciousResponses).toBe(1);
    expect(trustedPayload.allStats.totalResponses).toBe(2);

    const all = await getSurveyAdmin({
      env: envFor(state.db),
      request: new Request('https://holybear.tw/api/admin/survey?view=all&filter=suspicious', { headers: { authorization: 'Bearer survey-admin-secret' } }),
    } as never);
    expect(all.status).toBe(200);
    const allPayload = await all.json() as { totalResponses: number; feedback: Array<{ isSuspicious: boolean; fingerprintPreview: string }> };
    expect(allPayload.totalResponses).toBe(2);
    expect(allPayload.feedback).toHaveLength(1);
    expect(allPayload.feedback[0].isSuspicious).toBe(true);
    expect(allPayload.feedback[0].fingerprintPreview.length).toBeLessThanOrEqual(9);
  });

  it('rejects unauthenticated deletion', async () => {
    const response = await deleteSurveyResponse({
      env: envFor(),
      params: { id: '1' },
      request: new Request('https://holybear.tw/api/admin/survey/1', { method: 'DELETE' }),
    } as never);
    expect(response.status).toBe(401);
  });
});
