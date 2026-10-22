import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeCharacter } from '../../.vitepress/theme/maplestory/services/geminiService';
import { redactAiSecrets } from '../../.vitepress/theme/maplestory/services/aiErrorPrivacy';

// Provider requests are intercepted locally; no real credentials or network calls.
const data = {
  basic: { character_name: '安全測試', world_name: '測試世界' },
  stat: { final_stat: [] },
};
const bossSnapshot = {};

describe('AI provider error privacy', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'dir').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const loggedErrors = () => JSON.stringify(vi.mocked(console.error).mock.calls);

  it('redacts repeated and encoded current keys without losing useful error details', () => {
    const key = 'test-only-key/+?';
    const result = redactAiSecrets(`502: ${key}; encoded=${encodeURIComponent(key)}; repeated=${key}`, [null, '', key]);
    expect(result).toBe('502: [REDACTED]; encoded=[REDACTED]; repeated=[REDACTED]');
    expect(redactAiSecrets('google-test openai-test custom-test', ['google-test', 'openai-test', 'custom-test']))
      .toBe('[REDACTED] [REDACTED] [REDACTED]');
  });

  it('redacts OpenAI error echoes in both the UI response and logs', async () => {
    const key = 'test-only-openai-credential';
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: `upstream failure: ${key}` } }, { status: 500 })));

    const result = await analyzeCharacter(data, bossSnapshot, '', key, { apiKey: '', baseUrl: '', model: '' }, 'openai:test-model:standard');

    expect(result).toContain('upstream failure: [REDACTED]');
    expect(result).not.toContain(key);
    expect(loggedErrors()).not.toContain(key);
  });

  it('redacts custom-provider echoes and omits raw response payloads from logs', async () => {
    const key = 'test-only-custom-credential';
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      error: { message: `upstream failure: ${key}` },
      debug: 'private-diagnostic-payload',
    }, { status: 500 })));

    const result = await analyzeCharacter(data, bossSnapshot, '', '', {
      apiKey: key, baseUrl: 'https://provider.invalid/v1', model: 'test-model',
    }, 'compatible:custom');

    expect(result).toContain('upstream failure: [REDACTED]');
    expect(result).not.toContain(key);
    expect(loggedErrors()).not.toContain(key);
    expect(loggedErrors()).not.toContain('private-diagnostic-payload');
  });

  it.each([
    ['http://url-user:url-password@provider.invalid/v1?key=url-query-credential', '必須使用 HTTPS'],
    ['https://url-user:url-password@provider.invalid/v1?key=url-query-credential', '不可包含帳號或密碼'],
  ])('rejects unsafe endpoint %s without exposing URL credentials or query data', async (endpoint, message) => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);

    const result = await analyzeCharacter(data, bossSnapshot, '', '', {
      apiKey: 'test-only-custom-credential', baseUrl: endpoint, model: 'test-model',
    }, 'compatible:custom');

    expect(request).not.toHaveBeenCalled();
    expect(result).toContain(message);
    expect(result).not.toContain('url-password');
    expect(result).not.toContain('url-query-credential');
    expect(loggedErrors()).not.toContain('url-password');
    expect(loggedErrors()).not.toContain('url-query-credential');
  });

  it('redacts Gemini SDK errors and does not log the raw error object', async () => {
    const key = 'test-only-gemini-credential';
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: `upstream failure: ${key}` } }, { status: 500 })));

    const result = await analyzeCharacter(data, bossSnapshot, key, '', { apiKey: '', baseUrl: '', model: '' }, 'gemini-test-model');

    expect(result).toContain('upstream failure: [REDACTED]');
    expect(result).not.toContain(key);
    expect(loggedErrors()).not.toContain(key);
    expect(console.dir).not.toHaveBeenCalled();
  });
});
