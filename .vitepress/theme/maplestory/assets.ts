const assetModules = import.meta.glob('./assets/**/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const mapleAsset = (path: string): string => {
  const normalizedPath = path.replace(/^\/+/, '');
  const asset = assetModules[`./assets/${normalizedPath}`];

  if (!asset) throw new Error(`Unknown MapleStory asset: ${normalizedPath}`);
  return asset;
};
