import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getJobArtwork,
  JOB_ARTWORK_MAPPING,
  resolveJobArtworkFileName,
  resolveJobArtworkUrl,
} from '../.vitepress/theme/maplestory/jobArtwork'

const artworkDirectory = join(process.cwd(), 'public', 'maplestory', 'class-artwork')

const mappedFilenames = Object.values(JOB_ARTWORK_MAPPING).flatMap((artwork) => {
  if (typeof artwork === 'string') return [artwork]
  return [artwork.default, artwork.male, artwork.female].filter(
    (filename): filename is string => Boolean(filename),
  )
})

describe('MapleStory job artwork mapping', () => {
  it('covers every official job listed by the calculator', () => {
    const jobsSource = readFileSync(
      join(process.cwd(), '.vitepress', 'theme', 'maplestory', 'maplecombat-full', 'data', 'jobs.ts'),
      'utf8',
    )
    const officialJobs = [...jobsSource.matchAll(/\{ name: '([^']+)'/g)].map((match) => match[1])

    expect(officialJobs).toHaveLength(51)
    expect(officialJobs.filter((jobName) => !getJobArtwork(jobName))).toEqual([])
  })

  it('retains all future and special mappings', () => {
    expect(['初心者', '蕾媞', '皮卡啾', '雪吉拉'].filter((jobName) => !getJobArtwork(jobName))).toEqual([])
  })

  it('uses the manually confirmed Bowman files for 箭神', () => {
    expect(resolveJobArtworkFileName('箭神', 'male', 'same-character')).toBe(
      'ClassArtwork_Bowman_(Maple_Island_Revamp,_Male).png',
    )
    expect(resolveJobArtworkFileName('箭神', 'female', 'same-character')).toBe(
      'ClassArtwork_Bowman_(Awake,_Female).png',
    )
  })

  it('normalizes API punctuation and aliases', () => {
    expect(resolveJobArtworkFileName('大魔導士(冰、雷)', '女')).toBe(
      'ClassArtwork_Arch_Mage_(Ice,_Lightning)_(Destiny,_Female).png',
    )
    expect(resolveJobArtworkFileName('拉拉')).toBe('ClassArtwork_Lara_(2).png')
  })

  it('resolves matching gender, default, and single-gender fallbacks in order', () => {
    expect(resolveJobArtworkFileName('龍魔導士', 'male')).toBe('ClassArtwork_Evan_(Chaos,_Male).png')
    expect(resolveJobArtworkFileName('龍魔導士', 'female')).toBe('ClassArtwork_Evan_(MapleStory_M).png')
    expect(resolveJobArtworkFileName('英雄', 'female')).toBe('ClassArtwork_Hero_(NEXT,_Male).png')
    expect(resolveJobArtworkFileName('大魔導士(火、毒)', 'male')).toBe(
      'ClassArtwork_Arch_Mage_(Fire,_Poison)_(Destiny,_Female).png',
    )
    expect(resolveJobArtworkFileName('不存在的職業', 'male')).toBeUndefined()
  })

  it('uses a stable fallback when gender is unavailable for a dual-artwork job', () => {
    const first = resolveJobArtworkFileName('傑諾', undefined, 'stable-ocid')
    expect(resolveJobArtworkFileName('傑諾', undefined, 'stable-ocid')).toBe(first)
    expect([
      'ClassArtwork_Xenon_(Male).png',
      'ClassArtwork_Xenon_(Female).png',
    ]).toContain(first)
  })

  it('references every imported source image exactly once and only existing files', () => {
    expect(new Set(mappedFilenames).size).toBe(61)
    expect(mappedFilenames).toHaveLength(61)
    expect(mappedFilenames.filter((filename) => !existsSync(join(artworkDirectory, filename)))).toEqual([])
  })

  it('returns a public URL without eagerly importing the image', () => {
    expect(resolveJobArtworkUrl('阿戴爾')).toBe(
      '/maplestory/class-artwork/ClassArtwork_Adele_(MapleStory_N).png',
    )
    expect(resolveJobArtworkUrl('夜使者')).toBe(
      '/maplestory/class-artwork/ClassArtwork_Night_Lord_(Destiny,_Male).png',
    )
  })
})
