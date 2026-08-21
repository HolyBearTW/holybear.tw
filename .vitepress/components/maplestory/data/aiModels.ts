export interface AiModelOption {
  id: string;
  label: string;
  provider: 'google' | 'openai';
  estimatedWait: string;
}

export const DEFAULT_AI_MODEL = 'gemini-3.7-flash';

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (最新高速 / 推薦)', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (前代高速)', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', provider: 'google', estimatedWait: '20~90' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (免費極速)', provider: 'google', estimatedWait: '15~45' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (旗艦 / 需付費)', provider: 'google', estimatedWait: '60~120' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (免費極速)', provider: 'google', estimatedWait: '15~45' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (舊版 / 極速)', provider: 'google', estimatedWait: '30~120' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (舊版高階 / 需付費)', provider: 'google', estimatedWait: '60~120' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (穩定版)', provider: 'google', estimatedWait: '30~120' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (舊版高階 / 需付費)', provider: 'google', estimatedWait: '60~120' },
  { id: 'openai:gpt-5.6-sol:standard', label: 'GPT-5.6 Sol (旗艦)', provider: 'openai', estimatedWait: '30~120' },
  { id: 'openai:gpt-5.6-sol:pro', label: 'GPT-5.6 Sol Pro (品質優先)', provider: 'openai', estimatedWait: '60~240' },
  { id: 'openai:gpt-5.6-sol:fast', label: 'GPT-5.6 Sol 快速模式', provider: 'openai', estimatedWait: '15~60' },
  { id: 'openai:gpt-5.6-terra:standard', label: 'GPT-5.6 Terra (平衡)', provider: 'openai', estimatedWait: '20~90' },
  { id: 'openai:gpt-5.6-luna:standard', label: 'GPT-5.6 Luna (快速省費)', provider: 'openai', estimatedWait: '15~60' },
];

export const getAiModelOption = (id: string): AiModelOption | undefined =>
  AI_MODEL_OPTIONS.find(option => option.id === id);

export const isOpenAiModel = (id: string): boolean => id.startsWith('openai:');
