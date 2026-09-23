export interface AiModelOption {
  id: string;
  label: string;
  provider: 'google' | 'openai' | 'compatible';
  estimatedWait: string;
}

export interface CompatibleAiServiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_GOOGLE_AI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_OPENAI_AI_MODEL = 'openai:gpt-5.6-terra:standard';
export const CUSTOM_COMPATIBLE_AI_MODEL = 'compatible:custom';
export const DEFAULT_AI_MODEL = DEFAULT_GOOGLE_AI_MODEL;

export const getRecommendedAiModel = (hasGeminiKey: boolean, hasOpenAiKey: boolean): string => {
  if (hasOpenAiKey) return DEFAULT_OPENAI_AI_MODEL;
  if (hasGeminiKey) return DEFAULT_GOOGLE_AI_MODEL;
  return DEFAULT_AI_MODEL;
};

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (推薦)', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', provider: 'google', estimatedWait: '15~45' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', provider: 'google', estimatedWait: '60~120' },
  { id: 'openai:gpt-6-astra:standard', label: 'GPT-6 Astra (旗艦)', provider: 'openai', estimatedWait: '60~180' },
  { id: 'openai:gpt-6-sol:standard', label: 'GPT-6 Sol', provider: 'openai', estimatedWait: '30~120' },
  { id: 'openai:gpt-6-luna:standard', label: 'GPT-6 Luna (快速省費)', provider: 'openai', estimatedWait: '15~60' },
  { id: 'openai:gpt-5.6-sol:standard', label: 'GPT-5.6 Sol (旗艦)', provider: 'openai', estimatedWait: '30~120' },
  { id: 'openai:gpt-5.6-sol:pro', label: 'GPT-5.6 Sol Pro (品質優先)', provider: 'openai', estimatedWait: '60~240' },
  { id: 'openai:gpt-5.6-sol:fast', label: 'GPT-5.6 Sol 快速模式', provider: 'openai', estimatedWait: '15~60' },
  { id: 'openai:gpt-5.6-terra:standard', label: 'GPT-5.6 Terra (平衡)', provider: 'openai', estimatedWait: '20~90' },
  { id: 'openai:gpt-5.6-luna:standard', label: 'GPT-5.6 Luna (快速省費)', provider: 'openai', estimatedWait: '15~60' },
  { id: CUSTOM_COMPATIBLE_AI_MODEL, label: '自訂相容服務', provider: 'compatible', estimatedWait: '15~120' },
];

export const getAiModelOption = (id: string): AiModelOption | undefined =>
  AI_MODEL_OPTIONS.find(option => option.id === id);

export const isOpenAiModel = (id: string): boolean => id.startsWith('openai:');

export const isCompatibleAiModel = (id: string): boolean => id === CUSTOM_COMPATIBLE_AI_MODEL;

export const getGeminiModelsToTry = (selectedId: string, options: AiModelOption[]): string[] => {
  const availableIds = options.filter(option => option.provider === 'google').map(option => option.id);
  const selected = availableIds.includes(selectedId) ? selectedId : availableIds[0] || DEFAULT_GOOGLE_AI_MODEL;
  const flashLite = availableIds.find(id => id !== selected && /-flash-lite(?:-preview)?$/.test(id));
  const otherModels = availableIds
    .filter(id => id !== selected && id !== flashLite)
    .slice(0, flashLite ? 2 : 3);
  return [...new Set([selected, ...otherModels, ...(flashLite ? [flashLite] : [])])];
};

const isGeminiTextModel = (id: string): boolean =>
  /^gemini-(\d+(?:\.\d+)?)-(flash(?:-lite)?|pro)(?:-preview)?$/.test(id) &&
  Number(id.match(/^gemini-([\d.]+)/)?.[1]) >= 3 && id !== 'gemini-3-pro-preview';

const isGptTextModel = (id: string): boolean =>
  /^gpt-(\d+(?:\.\d+)?)(?:-(astra|sol|terra|luna|mini|nano))?$/.test(id) &&
  Number(id.match(/^gpt-([\d.]+)/)?.[1]) >= 5.6;

const labelForModel = (id: string, provider: 'google' | 'openai'): string => {
  if (provider === 'openai') {
    return id.replace(/^gpt-/, 'GPT-').replace(/-(astra|sol|terra|luna|mini|nano)$/, (_, family: string) => ` ${family[0].toUpperCase()}${family.slice(1)}`);
  }
  const match = id.match(/^gemini-([\d.]+)-(flash-lite|flash|pro)(-preview)?$/);
  return match ? `Gemini ${match[1]} ${match[2] === 'flash-lite' ? 'Flash-Lite' : match[2] === 'flash' ? 'Flash' : 'Pro'}${match[3] ? ' Preview' : ''}` : id;
};

const modelRank = (id: string): number => Number(id.match(/^(?:gemini|gpt)-([\d.]+)/)?.[1]) || 0;

export const discoverAiModels = async (
  provider: 'google' | 'openai', apiKey: string, signal?: AbortSignal,
): Promise<AiModelOption[]> => {
  const ids: string[] = [];
  if (provider === 'google') {
    let pageToken = '';
    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, { headers: { 'x-goog-api-key': apiKey }, signal });
      if (!response.ok) throw new Error(`Gemini 模型清單讀取失敗 (${response.status})`);
      const payload = await response.json();
      for (const model of payload.models || []) {
        const id = String(model.name || '').replace(/^models\//, '');
        if (isGeminiTextModel(id) && model.supportedGenerationMethods?.includes('generateContent')) ids.push(id);
      }
      pageToken = payload.nextPageToken || '';
    } while (pageToken);
  } else {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }, signal,
    });
    if (!response.ok) throw new Error(`OpenAI 模型清單讀取失敗 (${response.status})`);
    const payload = await response.json();
    for (const model of payload.data || []) {
      if (typeof model.id === 'string' && isGptTextModel(model.id)) ids.push(model.id);
    }
  }
  return [...new Set(ids)]
    .sort((a, b) => modelRank(b) - modelRank(a) || a.localeCompare(b))
    .flatMap(id => {
      const option: AiModelOption = {
        id: provider === 'openai' ? `openai:${id}:standard` : id,
        label: labelForModel(id, provider), provider,
        estimatedWait: '20~120',
      };
      // Fast and Pro are request modes on the same model, not separate model IDs.
      return id === 'gpt-5.6-sol'
        ? [option, ...AI_MODEL_OPTIONS.filter(saved => saved.id === 'openai:gpt-5.6-sol:pro' || saved.id === 'openai:gpt-5.6-sol:fast')]
        : [option];
    });
};
