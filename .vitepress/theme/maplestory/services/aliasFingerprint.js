const normalizeText = (value) => String(value ?? '').normalize('NFC');

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
};

const stableStringify = (value) => JSON.stringify(stableValue(value));

const normalizePosition = (position) => ({
  x: Number(position?.x || 0),
  y: Number(position?.y || 0),
});

const normalizeBlock = (block) => ({
  type: normalizeText(block?.block_type),
  class: normalizeText(block?.block_class),
  level: normalizeText(block?.block_level),
  control: normalizePosition(block?.block_control_point),
  positions: (block?.block_position || [])
    .map(normalizePosition)
    .sort((left, right) => left.x - right.x || left.y - right.y),
});

const normalizeRaiderPreset = (preset) => {
  const blocks = (preset?.union_block || [])
    .map(normalizeBlock)
    .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));

  // Tiny or empty presets are too common to safely identify an account.
  if (blocks.length < 8) return null;

  return {
    stats: (preset?.union_raider_stat || []).map(normalizeText).sort(),
    occupiedStats: (preset?.union_occupied_stat || []).map(normalizeText).sort(),
    innerStats: (preset?.union_inner_stat || [])
      .map((item) => ({
        id: normalizeText(item?.stat_field_id),
        effect: normalizeText(item?.stat_field_effect),
      }))
      .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right))),
    blocks,
  };
};

const normalizeChampion = (champion) => {
  const members = (champion?.union_champion || [])
    .map((item) => ({
      name: normalizeText(item?.champion_name),
      grade: normalizeText(item?.champion_grade),
      class: normalizeText(item?.champion_class),
      badges: (item?.champion_badge_info || []).map((badge) => normalizeText(badge?.stat)).sort(),
    }))
    .filter((item) => item.name)
    .sort((left, right) => left.name.localeCompare(right.name));

  if (members.length === 0) return null;
  return {
    members,
    totalBadges: (champion?.champion_badge_total_info || [])
      .map((badge) => normalizeText(badge?.stat))
      .sort(),
  };
};

/**
 * Returns versioned, canonical account-level inputs. The selected preset and
 * timestamps are intentionally excluded so selecting a different preset does
 * not break an otherwise unchanged account match.
 */
export function createAliasSignatureInputs(unionRaider, unionChampion) {
  const signatures = [];
  const presets = [1, 2, 3, 4, 5]
    .map((number) => normalizeRaiderPreset(unionRaider?.[`union_raider_preset_${number}`]))
    .filter(Boolean);

  // Older/partial responses may expose only the active preset.
  if (presets.length === 0) {
    const activePreset = normalizeRaiderPreset(unionRaider);
    if (activePreset) presets.push(activePreset);
  }

  for (const preset of presets) {
    signatures.push(`raider-v1:${stableStringify(preset)}`);
  }

  const normalizedChampion = normalizeChampion(unionChampion);
  if (normalizedChampion) {
    signatures.push(`champion-v1:${stableStringify(normalizedChampion)}`);
  }

  return [...new Set(signatures)].sort();
}
