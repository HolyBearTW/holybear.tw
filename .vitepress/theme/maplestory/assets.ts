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

/** Resolve an optional generated asset without making the whole dashboard fail
 * while a newly added map is still waiting for its local WebP export. */
export const mapleAssetOrNull = (path: string): string | null => {
  const normalizedPath = path.replace(/^\/+/, '');
  return assetModules[`./assets/${normalizedPath}`] ?? null;
};
