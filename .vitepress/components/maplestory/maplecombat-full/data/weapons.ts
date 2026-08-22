import type { WeaponDatabase } from '@maplecombat/core/types'

// 武器資料，數值不可更動。
// prettier-ignore
export const weaponDatabase: WeaponDatabase = {
  fortune: { name: '命運', base: 349, defaultScroll: 72, hideSubFields: true,  stars16_24: [16, 16, 17, 17, 18, 19, 20, 36, 37], flames: [0, 25, 49, 74, 108, 148, 196, 251] },
  genesis: { name: '創世', base: 318, defaultScroll: 72, hideSubFields: true,  stars16_24: [13, 13, 14, 14, 15, 16, 17, 34, 35], flames: [0, 20, 39, 58, 84, 116, 153, 196] },
  arcane:  { name: '神秘', base: 276, defaultScroll: 0,  hideSubFields: false, stars16_24: [13, 13, 14, 14, 15, 16, 17, 34, 35], flames: [0, 17, 34, 50, 73, 101, 133, 170] },
  absolab: { name: '航海', base: 192, defaultScroll: 0,  hideSubFields: false, stars16_24: [9, 9, 10, 11, 12, 13, 14, 32, 33],  flames: [0, 10, 20, 29, 43, 59, 77, 99] },
  fafnir:  { name: '深淵', base: 160, defaultScroll: 0,  hideSubFields: false, stars16_24: [8, 9, 9, 10, 11, 12, 13, 31, 32],   flames: [0, 7, 13, 20, 29, 39, 52, 66] },
}

// 神之子專用（火花攻擊加成級距不同）。
// prettier-ignore
export const zeroWeaponDatabase: WeaponDatabase = {
  fortune: { name: '命運', base: 349, defaultScroll: 72, hideSubFields: true,  stars16_24: [16, 16, 17, 17, 18, 19, 20, 36, 37], flames: [0, 25, 54, 89, 131, 179, 215, 251] },
  genesis: { name: '創世', base: 318, defaultScroll: 72, hideSubFields: true,  stars16_24: [13, 13, 14, 14, 15, 16, 17, 34, 35], flames: [0, 20, 42, 70, 102, 140, 168, 196] },
  arcane:  { name: '神秘', base: 276, defaultScroll: 0,  hideSubFields: false, stars16_24: [13, 13, 14, 14, 15, 16, 17, 34, 35], flames: [0, 17, 37, 61, 89, 122, 146, 170] },
  absolab: { name: '航海', base: 192, defaultScroll: 0,  hideSubFields: false, stars16_24: [9, 9, 10, 11, 12, 13, 14, 32, 33],  flames: [0, 10, 22, 35, 52, 71, 85, 99] },
  fafnir:  { name: '深淵', base: 160, defaultScroll: 0,  hideSubFields: false, stars16_24: [8, 9, 9, 10, 11, 12, 13, 31, 32],   flames: [0, 7, 15, 24, 35, 47, 57, 66] },
}
