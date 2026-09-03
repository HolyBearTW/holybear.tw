import React from 'react';
import { mapleAssetOrNull } from '../assets';
import {
  CHARACTER_MAP_SCENE_CHANGE_EVENT,
  getCharacterMapSceneStorageKey,
  isCharacterMapSceneChange,
  readCharacterMapScene,
} from '../mapScenePreference';

interface CharacterAvatarProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  characterName: string;
  characterClass?: string;
  characterImage: string;
  mapClassName?: string;
}

export const useCharacterMapScene = (characterName: string, characterClass = '') => {
  const [mapId, setMapId] = React.useState(() => readCharacterMapScene(characterName, characterClass));

  React.useEffect(() => {
    setMapId(readCharacterMapScene(characterName, characterClass));
  }, [characterName, characterClass]);

  React.useEffect(() => {
    const handleSceneChange = (event: Event) => {
      if (isCharacterMapSceneChange(event, characterName)) setMapId(event.detail.mapId);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getCharacterMapSceneStorageKey(characterName)) {
        setMapId(readCharacterMapScene(characterName, characterClass));
      }
    };

    window.addEventListener(CHARACTER_MAP_SCENE_CHANGE_EVENT, handleSceneChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CHARACTER_MAP_SCENE_CHANGE_EVENT, handleSceneChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [characterName, characterClass]);

  return mapId;
};

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  characterName,
  characterClass = '',
  characterImage,
  className = '',
  mapClassName = 'absolute inset-0 z-0 h-full w-full object-cover',
  onLoad,
  onError,
  ...imageProps
}) => {
  const mapId = useCharacterMapScene(characterName, characterClass);
  const mapScene = mapleAssetOrNull(`maps/${mapId}.webp`);
  const [characterLoaded, setCharacterLoaded] = React.useState(false);
  const characterImageRef = React.useRef<HTMLImageElement>(null);

  React.useLayoutEffect(() => {
    const image = characterImageRef.current;
    setCharacterLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [characterImage]);

  return (
    <>
      {characterLoaded && mapScene && (
        <img
          src={mapScene}
          alt=""
          data-character-map-scene={mapId}
          data-character-name={characterName}
          aria-hidden="true"
          loading="eager"
          decoding="async"
          fetchPriority="low"
          className={mapClassName}
        />
      )}
      <img
        {...imageProps}
        ref={characterImageRef}
        src={characterImage}
        className={className}
        onLoad={(event) => {
          setCharacterLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setCharacterLoaded(true);
          onError?.(event);
        }}
      />
    </>
  );
};

export default CharacterAvatar;
