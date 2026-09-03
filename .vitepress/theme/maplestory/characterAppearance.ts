export interface CharacterAppearanceSettings {
  action: string;
  emotion: string;
  weaponMotion: string;
}

export const DEFAULT_CHARACTER_APPEARANCE: CharacterAppearanceSettings = {
  action: 'A00',
  emotion: 'E00',
  weaponMotion: 'W00',
};

const storageKey = (characterKey: string) =>
  `maplestory_character_appearance_${encodeURIComponent(characterKey.trim())}`;

const normalizeSettings = (value: unknown): CharacterAppearanceSettings => {
  const settings = value && typeof value === 'object'
    ? value as Partial<CharacterAppearanceSettings>
    : {};

  return {
    action: typeof settings.action === 'string' && /^A(?:0\d|[1-3]\d|4[01])$/.test(settings.action)
      ? settings.action
      : DEFAULT_CHARACTER_APPEARANCE.action,
    emotion: typeof settings.emotion === 'string' && /^E(?:0\d|1\d|2[0-4])$/.test(settings.emotion)
      ? settings.emotion
      : DEFAULT_CHARACTER_APPEARANCE.emotion,
    weaponMotion: typeof settings.weaponMotion === 'string' && /^W0[0-4]$/.test(settings.weaponMotion)
      ? settings.weaponMotion
      : DEFAULT_CHARACTER_APPEARANCE.weaponMotion,
  };
};

export const readCharacterAppearance = (characterKey: string): CharacterAppearanceSettings => {
  if (!characterKey || typeof window === 'undefined') return { ...DEFAULT_CHARACTER_APPEARANCE };
  try {
    const raw = window.localStorage.getItem(storageKey(characterKey));
    return raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_CHARACTER_APPEARANCE };
  } catch {
    return { ...DEFAULT_CHARACTER_APPEARANCE };
  }
};

export const storeCharacterAppearance = (
  characterKey: string,
  settings: CharacterAppearanceSettings,
) => {
  if (!characterKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(characterKey), JSON.stringify(normalizeSettings(settings)));
  } catch {
    // 儲存空間不可用時仍保留目前頁面中的外型設定。
  }
};

export const buildCharacterAppearanceUrl = (
  characterImage: string,
  settings: CharacterAppearanceSettings,
) => {
  try {
    const url = new URL(characterImage);
    url.searchParams.set('action', settings.action);
    url.searchParams.set('emotion', settings.emotion);
    url.searchParams.set('wmotion', settings.weaponMotion);
    return url.toString();
  } catch {
    return characterImage;
  }
};
