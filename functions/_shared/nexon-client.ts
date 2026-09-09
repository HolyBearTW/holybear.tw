import type { Env } from './env';
import type { CharacterWrite } from './models';
import { getRuntimeConfig, requireSecret } from './runtime-config';
import { parseNexonCharacter } from './character-policy.mjs';
import { acquireNexonRateSlot, NexonRateLimitError } from './nexon-rate-limit';

const NEXON_BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';

interface NexonOcidResponse {
  ocid: string;
}

interface NexonBasicResponse {
  date?: string;
  character_name?: string;
  world_name?: string;
  character_class?: string;
  character_level?: number;
  character_image?: string;
  character_guild_name?: string | null;
}

interface NexonStatResponse {
  date?: string;
  final_stat?: Array<{ stat_name?: string; stat_value?: string }>;
}

export class NexonRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly retryable: boolean,
    public readonly code = 'nexon_request_failed',
    public readonly nexonCode: string | null = null,
  ) {
    super(message);
  }
}

export interface NexonRequestMetric {
  path: string;
  attempt: number;
  latencyMs: number;
  status: number | null;
  ok: boolean;
  errorKind?: 'timeout' | 'network' | 'rate_limit';
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryAfterMilliseconds = (response: Response, fallback: number) => {
  const raw = response.headers.get('retry-after');
  const seconds = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(seconds) ? Math.min(60_000, Math.max(0, seconds * 1000)) : fallback;
};

export const fetchNexonJson = async <T>(
  env: Env,
  path: string,
  onRequest?: () => void,
  onMetric?: (metric: NexonRequestMetric) => void,
): Promise<T> => {
  const apiKey = requireSecret(env.NEXON_API_KEY, 'NEXON_API_KEY');
  const config = getRuntimeConfig(env);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < config.nexonRetryLimit; attempt += 1) {
    const startedAt = Date.now();
    let status: number | null = null;
    let ok = false;
    let errorKind: NexonRequestMetric['errorKind'];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.nexonRequestTimeoutMs);
    try {
      await acquireNexonRateSlot(env);
      onRequest?.();
      const response = await fetch(`${NEXON_BASE_URL}${path}`, {
        headers: { 'x-nxopen-api-key': apiKey, accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      status = response.status;
      if (response.ok) {
        const payload = await response.json<T>();
        ok = true;
        return payload;
      }

      const errorPayload = await response.clone().json().catch(() => null) as {
        error?: { name?: unknown; message?: unknown };
      } | null;
      const nexonCode = typeof errorPayload?.error?.name === 'string'
        ? errorPayload.error.name
        : null;
      const nexonMessage = typeof errorPayload?.error?.message === 'string'
        ? errorPayload.error.message
        : null;
      const retryable = response.status === 429 || response.status >= 500
        || nexonCode === 'OPENAPI00009'
        || nexonCode === 'OPENAPI00010'
        || nexonCode === 'OPENAPI00011';
      if (!retryable) {
        const code = response.status === 400 || response.status === 404
          ? 'character_not_found'
          : 'nexon_request_rejected';
        throw new NexonRequestError(
          nexonMessage || `NEXON API 回應失敗 (${response.status})`,
          response.status,
          false,
          code,
          nexonCode,
        );
      }
      lastError = new NexonRequestError(
        nexonMessage || `NEXON API 暫時無法使用 (${response.status})`,
        response.status,
        true,
        'nexon_request_failed',
        nexonCode,
      );
      const fallback = Math.min(30_000, 500 * (2 ** attempt));
      await wait(retryAfterMilliseconds(response, fallback));
    } catch (error) {
      if (error instanceof NexonRequestError && !error.retryable) throw error;
      if (error instanceof NexonRateLimitError) throw error;
      errorKind = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network';
      lastError = error;
      if (attempt + 1 < config.nexonRetryLimit) {
        await wait(Math.min(30_000, 500 * (2 ** attempt)));
      }
    } finally {
      clearTimeout(timeout);
      onMetric?.({ path, attempt, latencyMs: Math.max(0, Date.now() - startedAt), status, ok, errorKind });
    }
  }

  if (lastError instanceof NexonRequestError) throw lastError;
  throw new NexonRequestError('NEXON API 連線逾時或網路錯誤', null, true);
};

export const resolveNexonCharacter = async (
  env: Env,
  characterName: string,
  knownOcid?: string | null,
  onRequest?: () => void,
  expectedWorld?: string,
  onMetric?: (metric: NexonRequestMetric) => void,
): Promise<CharacterWrite> => {
  const requestedAt = new Date().toISOString();
  const requestedName = characterName.trim().normalize('NFC');
  if (!requestedName) throw new NexonRequestError('角色名稱不可為空', null, false, 'invalid_character_name');
  const ocid = knownOcid || (await fetchNexonJson<NexonOcidResponse>(
    env,
    `/id?character_name=${encodeURIComponent(requestedName)}`,
    onRequest,
    onMetric,
  )).ocid;
  if (!ocid) throw new NexonRequestError('NEXON API 未回傳 OCID', null, false, 'missing_ocid');

  const [basic, stat] = await Promise.all([
    fetchNexonJson<NexonBasicResponse>(env, `/character/basic?ocid=${encodeURIComponent(ocid)}`, onRequest, onMetric),
    fetchNexonJson<NexonStatResponse>(env, `/character/stat?ocid=${encodeURIComponent(ocid)}`, onRequest, onMetric),
  ]);
  const observedAt = new Date().toISOString();
  const character = parseNexonCharacter(ocid, basic, stat, requestedAt, observedAt);
  if (expectedWorld && (character.worldName !== expectedWorld
    || character.characterName !== requestedName)) {
    if (knownOcid) return resolveNexonCharacter(env, requestedName, null, onRequest, expectedWorld, onMetric);
    throw new NexonRequestError('Official character identity does not match the guild roster', null, false, 'guild_member_identity_mismatch');
  }
  return character;
};

export const runWithConcurrency = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  delayMs: number,
  task: (input: Input) => Promise<Output>,
) => {
  const results: Array<PromiseSettledResult<Output>> = new Array(inputs.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      if (delayMs > 0 && index > 0) await wait(delayMs);
      try {
        results[index] = { status: 'fulfilled', value: await task(inputs[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
};
