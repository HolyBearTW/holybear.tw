import { describe, expect, it } from 'vitest'
import {
  getJobEquipmentMap,
  getJobBackgroundMap,
  getJobFallbackVillageMap,
  MAP_SCENE_OPTIONS,
} from '../.vitepress/theme/maplestory/constants'

describe('MapleStory job village scenes', () => {
  it('uses the stable Warrior Village scene for Akatsuki jobs', () => {
    expect(getJobBackgroundMap('劍豪')).toBe('102000000')
    expect(getJobBackgroundMap('陰陽師')).toBe('102000000')
    expect(getJobFallbackVillageMap('劍豪')).toBe('102000000')
    expect(getJobFallbackVillageMap('陰陽師')).toBe('102000000')
  })

  it('keeps the original Akatsuki scene as the equipment default', () => {
    expect(getJobEquipmentMap('劍豪')).toBe('807000000')
    expect(getJobEquipmentMap('陰陽師')).toBe('807000000')
  })

  it('keeps the original Akatsuki equipment scene available', () => {
    expect(MAP_SCENE_OPTIONS.some(([mapId]) => mapId === '807000000')).toBe(true)
  })
})
