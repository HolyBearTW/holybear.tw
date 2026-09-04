import type { Env } from './env';
import type { CharacterWrite } from './models';
import { getRuntimeConfig, requireSecret } from './runtime-config';

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
  ) {
    super(message);
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryAfterMilliseconds = (response: Response, fallback: number) => {
  const raw = response.headers.get('retry-after');
  const seconds = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(seconds) ? Math.min(60_000, Math.max(0, seconds * 1000)) : fallback;
};

export const fetchNexonJson = async <T>(env: Env, path: string): Promise<T> => {
  const apiKey = requireSecret(env.NEXON_API_KEY, 'NEXON_API_KEY');
  const config = getRuntimeConfig(env);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < config.nexonRetryLimit; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.nexonRequestTimeoutMs);
    try {
      const response = await fetch(`${NEXON_BASE_URL}${path}`, {
        headers: { 'x-nxopen-api-key': apiKey, accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.ok) return await response.json<T>();

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) {
        const code = response.status === 400 || response.status === 404
          ? 'character_not_found'
          : 'nexon_request_rejected';
        throw new NexonRequestError(`NEXON API 回應失敗 (${response.status})`, response.status, false, code);
      }
      lastError = new NexonRequestError(`NEXON API 暫時無法使用 (${response.status})`, response.status, true);
      const fallback = Math.min(30_000, 500 * (2 ** attempt));
      await wait(retryAfterMilliseconds(response, fallback));
    } catch (error) {
      if (error instanceof NexonRequestError && !error.retryable) throw error;
      lastError = error;
      if (attempt + 1 < config.nexonRetryLimit) {
        await wait(Math.min(30_000, 500 * (2 ** attempt)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof NexonRequestError) throw lastError;
  throw new NexonRequestError('NEXON API 連線逾時或網路錯誤', null, true);
};

const combatPowerFromStat = (stat: NexonStatResponse) => {
  const value = stat.final_stat?.find((item) => (
    item.stat_name === '戰鬥力' || item.stat_name === 'Combat Power'
  ))?.stat_value;
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

export const resolveNexonCharacter = async (
  env: Env,
  characterName: string,
  knownOcid?: string | null,
): Promise<CharacterWrite> => {
  const requestedName = characterName.trim().normalize('NFC');
  if (!requestedName) throw new NexonRequestError('角色名稱不可為空', null, false, 'invalid_character_name');
  const ocid = knownOcid || (await fetchNexonJson<NexonOcidResponse>(
    env,
    `/id?character_name=${encodeURIComponent(requestedName)}`,
  )).ocid;
  if (!ocid) throw new NexonRequestError('NEXON API 未回傳 OCID', null, false, 'missing_ocid');

  const [basic, stat] = await Promise.all([
    fetchNexonJson<NexonBasicResponse>(env, `/character/basic?ocid=${encodeURIComponent(ocid)}`),
    fetchNexonJson<NexonStatResponse>(env, `/character/stat?ocid=${encodeURIComponent(ocid)}`),
  ]);
  const observedAt = new Date().toISOString();
  return {
    ocid,
    characterName: String(basic.character_name || requestedName).normalize('NFC'),
    worldName: String(basic.world_name || ''),
    jobName: String(basic.character_class || ''),
    level: Number(basic.character_level) || 0,
    combatPower: combatPowerFromStat(stat),
    characterImage: String(basic.character_image || ''),
    guildName: basic.character_guild_name || null,
    observedAt,
    nexonUpdatedAt: observedAt,
  };
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
