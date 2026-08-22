/** 欄位數值表：key 即 localStorage / 匯出 JSON 鍵名（baseMain、percentAtk、effDmg…） */
export type FieldValues = Record<string, number>

/** Buff 注入的加成 delta（key 同欄位 id） */
export type BuffDelta = Record<string, number>

/** 職業分類，對應 localStorage 的 selectedJob */
export type JobCategory = 'normal' | 'xenon' | 'da' | 'dual' | 'overseas'

/** 戰鬥力結果：一般職業單值；傑諾/惡魔復仇者為高低區間 */
export type PowerResult =
  | { type: 'single'; value: number }
  | { type: 'range'; high: number; low: number }

/** 武器套裝 key（命運/創世/神秘/航海/深淵） */
export type WeaponSetKey = 'fortune' | 'genesis' | 'arcane' | 'absolab' | 'fafnir'

export interface WeaponSetData {
  name: string
  base: number
  defaultScroll: number
  hideSubFields: boolean
  /** 16~24 星各星攻擊加成（index 0 = 16星） */
  stars16_24: number[]
  /** 火花等級 0~7 攻擊加成 */
  flames: number[]
}

export type WeaponDatabase = Record<WeaponSetKey, WeaponSetData>

/** 職業 stat 標籤（主屬/副屬/副屬2 對應的顯示名稱，如 STR/DEX/LUK/HP） */
export interface JobStatLabels {
  main: string
  sub: string
  secondSub: string
}
