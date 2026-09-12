export type JobArtwork =
  | string
  | {
      default?: string
      male?: string
      female?: string
    }

export type JobArtworkMapping = Partial<Record<string, JobArtwork>>
export type ArtworkGender = 'male' | 'female'

const ARTWORK_PUBLIC_PATH = '/maplestory/class-artwork'

/**
 * Artwork assignments are intentionally keyed by the Chinese job names used by
 * the TW site. The filenames are user-curated and must not be inferred from the
 * English class wording at runtime.
 */
export const JOB_ARTWORK_MAPPING: JobArtworkMapping = {
  英雄: { male: 'ClassArtwork_Hero_(NEXT,_Male).png' },
  聖騎士: 'ClassArtwork_Paladin_(MapleStory_M).png',
  黑騎士: { male: 'ClassArtwork_Dark_Knight_(Destiny,_Male).png' },
  '大魔導士（冰、雷）': { female: 'ClassArtwork_Arch_Mage_(Ice,_Lightning)_(Destiny,_Female).png' },
  '大魔導士（火、毒）': { female: 'ClassArtwork_Arch_Mage_(Fire,_Poison)_(Destiny,_Female).png' },
  主教: { female: 'ClassArtwork_Bishop_(Destiny,_Female).png' },
  箭神: {
    male: 'ClassArtwork_Bowman_(Maple_Island_Revamp,_Male).png',
    female: 'ClassArtwork_Bowman_(Awake,_Female).png',
  },
  神射手: { female: 'ClassArtwork_Marksman_(Destiny,_Female).png' },
  開拓者: 'ClassArtwork_Pathfinder_(MapleStory_N).png',
  夜使者: { male: 'ClassArtwork_Night_Lord_(Destiny,_Male).png' },
  暗影神偷: { female: 'ClassArtwork_Shadower_(Destiny,_Female).png' },
  影武者: { male: 'ClassArtwork_Dual_Blade_(2020,_Male).png' },
  槍神: { female: 'ClassArtwork_Corsair_(Destiny,_Female).png' },
  拳霸: { male: 'ClassArtwork_Buccaneer_(Destiny,_Male).png' },
  重砲指揮官: 'ClassArtwork_Cannoneer_(MapleStory_N).png',
  聖魂劍士: 'ClassArtwork_Dawn_Warrior_(MapleStory_M).png',
  烈焰巫師: 'ClassArtwork_Blaze_Wizard_(MapleStory_M).png',
  破風使者: 'ClassArtwork_Wind_Archer_(MapleStory_M).png',
  暗夜行者: 'ClassArtwork_Night_Walker_(MapleStory_M).png',
  閃雷悍將: 'ClassArtwork_Thunder_Breaker_(MapleStory_M).png',
  米哈逸: 'ClassArtwork_Mihile_(Ignition).png',
  狂狼勇士: 'ClassArtwork_Aran_(Milestone).png',
  龍魔導士: {
    default: 'ClassArtwork_Evan_(MapleStory_M).png',
    male: 'ClassArtwork_Evan_(Chaos,_Male).png',
  },
  夜光: 'ClassArtwork_Luminous_(Nova).png',
  精靈遊俠: 'ClassArtwork_Mercedes_(Nova).png',
  幻影俠盜: 'ClassArtwork_Phantom_(Nova).png',
  隱月: 'ClassArtwork_Shade_(Milestone).png',
  爆拳槍神: {
    male: 'ClassArtwork_Blaster_(Male).png',
    female: 'ClassArtwork_Blaster_(Female).png',
  },
  煉獄巫師: { female: 'ClassArtwork_Battle_Mage_(Black_Heaven,_Female).png' },
  狂豹獵人: 'ClassArtwork_Wild_Hunter_(2025).png',
  機甲戰神: { female: 'ClassArtwork_Mechanic_(Black_Heaven,_Female).png' },
  惡魔殺手: 'ClassArtwork_Demon_Slayer_(Awake).png',
  惡魔復仇者: 'ClassArtwork_Demon_Avenger_(Awake).png',
  傑諾: {
    male: 'ClassArtwork_Xenon_(Male).png',
    female: 'ClassArtwork_Xenon_(Female).png',
  },
  凱撒: 'ClassArtwork_Kaiser.png',
  凱殷: 'ClassArtwork_Kain.png',
  卡蒂娜: 'ClassArtwork_Cadena.png',
  天使破壞者: 'ClassArtwork_Angelic_Buster_(2023).png',
  阿戴爾: 'ClassArtwork_Adele_(MapleStory_N).png',
  伊利恩: 'ClassArtwork_Illium.png',
  卡莉: 'ClassArtwork_Khali.png',
  亞克: 'ClassArtwork_Ark_(MapleStory_N).png',
  蓮: 'ClassArtwork_Ren.png',
  菈菈: 'ClassArtwork_Lara_(2).png',
  虎影: 'ClassArtwork_Hoyoung_(MapleStory_N).png',
  凱內西斯: 'ClassArtwork_Kinesis_(2025).png',
  神之子: 'ClassArtwork_Zero.png',
  劍豪: {
    default: 'ClassArtwork_Hayato_(2026).png',
    female: 'ClassArtwork_Hayato_(2015,_Female).png',
  },
  陰陽師: {
    default: 'ClassArtwork_Kanna_(2026).png',
    male: 'ClassArtwork_Kanna_(Male).png',
  },
  琳恩: 'ClassArtwork_Lynn.png',
  墨玄: { male: 'ClassArtwork_Mo_Xuan_(Dreamer,_Male).png' },

  // Future/special mappings retained outside the current calculator job list.
  初心者: 'ClassArtwork_Beginner_(Original).png',
  蕾媞: 'ClassArtwork_Lethe.png',
  皮卡啾: 'ClassArtwork_Pink_Bean_(2021).png',
  雪吉拉: 'ClassArtwork_Yeti.png',
}

const JOB_ARTWORK_ALIASES: Record<string, string> = {
  冰雷: '大魔導士（冰、雷）',
  大魔導士冰雷: '大魔導士（冰、雷）',
  火毒: '大魔導士（火、毒）',
  大魔導士火毒: '大魔導士（火、毒）',
  拉拉: '菈菈',
  da: '惡魔復仇者',
  xenon: '傑諾',
}

export const normalizeJobArtworkName = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[()（）\s、,，.．_-]/g, '')

const normalizedJobLookup = Object.keys(JOB_ARTWORK_MAPPING).reduce<Record<string, string>>(
  (lookup, jobName) => {
    lookup[normalizeJobArtworkName(jobName)] = jobName
    return lookup
  },
  {},
)

Object.entries(JOB_ARTWORK_ALIASES).forEach(([alias, jobName]) => {
  normalizedJobLookup[normalizeJobArtworkName(alias)] = jobName
})

export const getJobArtwork = (jobName: unknown): JobArtwork | undefined => {
  const canonicalName = normalizedJobLookup[normalizeJobArtworkName(jobName)]
  return canonicalName ? JOB_ARTWORK_MAPPING[canonicalName] : undefined
}

export const normalizeArtworkGender = (value: unknown): ArtworkGender | undefined => {
  const normalized = String(value ?? '').trim().toLocaleLowerCase()
  if (['male', 'm', '男', '男性'].includes(normalized)) return 'male'
  if (['female', 'f', '女', '女性'].includes(normalized)) return 'female'
  return undefined
}

const stableArtworkHash = (value: string): number => {
  let hash = 0x811c9dc5
  for (const character of Array.from(value)) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export const resolveJobArtworkFileName = (
  jobName: unknown,
  characterGender?: unknown,
  stableCharacterKey?: unknown,
): string | undefined => {
  const artwork = getJobArtwork(jobName)
  if (!artwork) return undefined
  if (typeof artwork === 'string') return artwork

  const gender = normalizeArtworkGender(characterGender)
  if (gender && artwork[gender]) return artwork[gender]
  if (artwork.default) return artwork.default

  const genderedArtwork = [artwork.male, artwork.female].filter(
    (filename): filename is string => Boolean(filename),
  )
  if (genderedArtwork.length === 1) return genderedArtwork[0]
  if (genderedArtwork.length === 2) {
    const stableKey = String(stableCharacterKey ?? jobName ?? '')
    return genderedArtwork[stableArtworkHash(stableKey) % genderedArtwork.length]
  }
  return undefined
}

export const resolveJobArtworkUrl = (
  jobName: unknown,
  characterGender?: unknown,
  stableCharacterKey?: unknown,
): string | undefined => {
  const filename = resolveJobArtworkFileName(jobName, characterGender, stableCharacterKey)
  // These curated filenames use URL-safe ASCII punctuation. Keep commas literal:
  // Vite treats an encoded comma (%2C) as an SPA fallback and returns HTML.
  return filename ? `${ARTWORK_PUBLIC_PATH}/${filename}` : undefined
}
