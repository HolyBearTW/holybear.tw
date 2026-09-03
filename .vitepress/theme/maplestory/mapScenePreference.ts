import { getJobBackgroundMap, MAP_SCENE_OPTIONS } from './constants';

export const CHARACTER_MAP_SCENE_CHANGE_EVENT = 'maplestory-character-map-scene-change';

interface CharacterMapSceneChangeDetail {
  characterName: string;
  mapId: string;
}

const validMapIds = new Set(MAP_SCENE_OPTIONS.map(([mapId]) => mapId));

const normalizeCharacterName = (characterName: string) => characterName.trim();

const storageKey = (characterName: string) =>
  `maplestory_character_map_scene_${encodeURIComponent(normalizeCharacterName(characterName))}`;

const resolveMapId = (mapId: string | null | undefined, characterClass: string) => (
  mapId && validMapIds.has(mapId) ? mapId : getJobBackgroundMap(characterClass)
);

export const readCharacterMapScene = (characterName: string, characterClass: string): string => {
  const normalizedName = normalizeCharacterName(characterName);
  if (!normalizedName || typeof window === 'undefined') return resolveMapId(null, characterClass);

  try {
    return resolveMapId(window.localStorage.getItem(storageKey(normalizedName)), characterClass);
  } catch {
    return resolveMapId(null, characterClass);
  }
};

export const storeCharacterMapScene = (characterName: string, mapId: string) => {
  const normalizedName = normalizeCharacterName(characterName);
  if (!normalizedName || !validMapIds.has(mapId) || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(normalizedName), mapId);
  } catch {
    // 儲存空間不可用時，仍透過頁面事件同步目前開啟的頭像。
  }

  window.dispatchEvent(new CustomEvent<CharacterMapSceneChangeDetail>(CHARACTER_MAP_SCENE_CHANGE_EVENT, {
    detail: { characterName: normalizedName, mapId },
  }));
};

export const resetCharacterMapScene = (characterName: string, characterClass: string) => {
  const normalizedName = normalizeCharacterName(characterName);
  if (!normalizedName || typeof window === 'undefined') return;
  const mapId = resolveMapId(null, characterClass);

  try {
    window.localStorage.removeItem(storageKey(normalizedName));
  } catch {
    // 儲存空間不可用時，仍透過頁面事件同步目前開啟的頭像。
  }

  window.dispatchEvent(new CustomEvent<CharacterMapSceneChangeDetail>(CHARACTER_MAP_SCENE_CHANGE_EVENT, {
    detail: { characterName: normalizedName, mapId },
  }));
};

export const isCharacterMapSceneChange = (
  event: Event,
  characterName: string,
): event is CustomEvent<CharacterMapSceneChangeDetail> => {
  if (!(event instanceof CustomEvent)) return false;
  return event.detail?.characterName === normalizeCharacterName(characterName)
    && validMapIds.has(event.detail?.mapId);
};

export const getCharacterMapSceneStorageKey = storageKey;
