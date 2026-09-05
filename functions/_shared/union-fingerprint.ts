interface ChampionMember {
  champion_name?: string;
  champion_grade?: string;
  champion_class?: string;
}

interface UnionPosition {
  x?: number | string;
  y?: number | string;
}

interface UnionBlock {
  block_type?: string;
  block_class?: string;
  block_level?: string | number;
  block_control_point?: UnionPosition;
  block_position?: UnionPosition[];
}

interface UnionInnerStat {
  stat_field_id?: string;
  stat_field_effect?: string;
}

interface UnionRaiderPreset {
  union_raider_stat?: string[];
  union_occupied_stat?: string[];
  union_inner_stat?: UnionInnerStat[];
  union_block?: UnionBlock[];
}

export interface UnionRaiderResponse extends UnionRaiderPreset {
  union_raider_preset_1?: UnionRaiderPreset;
  union_raider_preset_2?: UnionRaiderPreset;
  union_raider_preset_3?: UnionRaiderPreset;
  union_raider_preset_4?: UnionRaiderPreset;
  union_raider_preset_5?: UnionRaiderPreset;
}

export interface UnionChampionResponse {
  union_champion?: ChampionMember[];
}

const normalizeText = (value: unknown) => String(value ?? '').normalize('NFC');

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
};

const stableStringify = (value: unknown) => JSON.stringify(stableValue(value));

const normalizePosition = (position?: UnionPosition) => ({
  x: Number(position?.x || 0),
  y: Number(position?.y || 0),
});

const normalizeRaiderPreset = (preset?: UnionRaiderPreset) => {
  const blocks = (preset?.union_block || [])
    .map((block) => ({
      type: normalizeText(block.block_type),
      class: normalizeText(block.block_class),
      level: normalizeText(block.block_level),
      control: normalizePosition(block.block_control_point),
      positions: (block.block_position || [])
        .map(normalizePosition)
        .sort((left, right) => left.x - right.x || left.y - right.y),
    }))
    .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));

  // Small or empty layouts are too common to be a safe account-level signal.
  if (blocks.length < 8) return null;
  return {
    stats: (preset?.union_raider_stat || []).map(normalizeText).sort(),
    occupiedStats: (preset?.union_occupied_stat || []).map(normalizeText).sort(),
    innerStats: (preset?.union_inner_stat || [])
      .map((item) => ({
        id: normalizeText(item.stat_field_id),
        effect: normalizeText(item.stat_field_effect),
      }))
      .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right))),
    blocks,
  };
};

export const canonicalizeRaiderPresets = (payload: UnionRaiderResponse) => {
  const presets = [1, 2, 3, 4, 5]
    .map((number) => normalizeRaiderPreset(
      payload[`union_raider_preset_${number}` as keyof UnionRaiderResponse] as UnionRaiderPreset | undefined,
    ))
    .filter((preset): preset is NonNullable<ReturnType<typeof normalizeRaiderPreset>> => Boolean(preset));

  // Some older responses expose only the active preset at the response root.
  if (presets.length === 0) {
    const activePreset = normalizeRaiderPreset(payload);
    if (activePreset) presets.push(activePreset);
  }
  return [...new Set(presets.map(stableStringify))].sort();
};

export const canonicalizeChampionRoster = (payload: UnionChampionResponse) => {
  const members = (payload.union_champion || [])
    .map((member) => ({
      name: String(member.champion_name || '').trim().normalize('NFC').toLocaleLowerCase(),
      grade: String(member.champion_grade || '').trim().normalize('NFC'),
      class: String(member.champion_class || '').trim().normalize('NFC'),
    }))
    .filter((member) => member.name)
    .sort((left, right) => left.name.localeCompare(right.name));
  return members.length >= 2 ? JSON.stringify({ members }) : null;
};

const hashCanonical = async (canonical: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return {
    canonical,
    fingerprint: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
};

export const hashRaiderPresets = async (payload: UnionRaiderResponse) => (
  Promise.all(canonicalizeRaiderPresets(payload).map(hashCanonical))
);

export const hashChampionRoster = async (payload: UnionChampionResponse) => {
  const canonical = canonicalizeChampionRoster(payload);
  if (!canonical) return null;
  return hashCanonical(canonical);
};
