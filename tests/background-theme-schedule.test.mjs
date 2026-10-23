import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BACKGROUND_THEME_BOOTSTRAP,
  resolveBackgroundThemeSelection,
  THEME_RESET_VERSION,
  THEME_RESET_VERSION_KEY,
  THEME_STORAGE_KEY,
} from '../.vitepress/theme/background/themes.ts'

const startsAt = Date.parse('2026-10-24T00:00:00+08:00')
const endsAt = Date.parse('2026-11-01T00:00:00+08:00')

class ThemeStorage {
  values = new Map([
    [THEME_STORAGE_KEY, 'coretower'],
    [THEME_RESET_VERSION_KEY, THEME_RESET_VERSION],
  ])
  removals = 0
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
  removeItem(key) { this.removals++; this.values.delete(key) }
}

const select = (storage, now) => resolveBackgroundThemeSelection(BACKGROUND_THEME_BOOTSTRAP, storage, now)

test('Taiwan campaign boundaries include the final second of October 31', () => {
  assert.equal(select(null, startsAt - 1).theme, 'sunsetskycity')
  assert.equal(select(null, startsAt).theme, 'halloween')
  assert.equal(select(null, Date.parse('2026-10-31T23:59:59.999+08:00')).theme, 'halloween')
  assert.equal(select(null, endsAt).theme, 'sunsetskycity')
  assert.equal(select(null, Date.parse('2026-10-31T15:59:59.999Z')).theme, 'halloween')
  assert.equal(select(null, Date.parse('2026-10-31T16:00:00.000Z')).theme, 'sunsetskycity')
})

test('start and expiry each clear the preference once, preserving later manual choices', () => {
  const storage = new ThemeStorage()
  const active = select(storage, startsAt)
  assert.equal(active.theme, 'halloween')
  assert.equal(active.nextChangeAt, endsAt)
  assert.equal(storage.removals, 1)
  storage.setItem(THEME_STORAGE_KEY, 'none')
  assert.equal(select(storage, startsAt + 1000).theme, 'none')
  assert.equal(select(storage, endsAt - 1).theme, 'none')
  assert.equal(storage.removals, 1)

  const expired = select(storage, endsAt)
  assert.equal(expired.theme, 'sunsetskycity')
  assert.notEqual(expired.resetVersion, active.resetVersion)
  assert.equal(expired.nextChangeAt, null)
  assert.equal(storage.removals, 2)
  storage.setItem(THEME_STORAGE_KEY, 'halloween')
  assert.equal(select(storage, endsAt + 1000).theme, 'halloween')
  assert.equal(storage.removals, 2)
})

test('a returning visitor who skips the campaign still receives the expiry reset', () => {
  const storage = new ThemeStorage()
  assert.equal(select(storage, endsAt + 86400000).theme, 'sunsetskycity')
  assert.equal(storage.getItem(THEME_STORAGE_KEY), 'sunsetskycity')
  assert.equal(storage.removals, 1)
  storage.setItem(THEME_STORAGE_KEY, 'tech')
  assert.equal(select(storage, endsAt + 2 * 86400000).theme, 'tech')
  assert.equal(storage.removals, 1)
})

test('invalid and missing preferences use the current phase default', () => {
  const storage = new ThemeStorage()
  select(storage, startsAt)
  storage.setItem(THEME_STORAGE_KEY, 'removed-theme')
  assert.equal(select(storage, startsAt + 1).theme, 'halloween')
  assert.equal(storage.getItem(THEME_STORAGE_KEY), 'halloween')
  storage.values.delete(THEME_STORAGE_KEY)
  assert.equal(select(storage, startsAt + 2).theme, 'halloween')
  assert.equal(storage.removals, 1)
})

test('scheduled defaults remain available when browser storage is blocked', () => {
  const unavailable = { getItem() { throw new Error('blocked') } }
  assert.equal(select(unavailable, startsAt).theme, 'halloween')
  assert.equal(select(unavailable, endsAt).theme, 'sunsetskycity')
})

test('the serialized head resolver chooses phases at visitor runtime, not build time', () => {
  const bootConfig = JSON.parse(JSON.stringify(BACKGROUND_THEME_BOOTSTRAP))
  const boot = new Function('config', 'storage', 'now', `return (${resolveBackgroundThemeSelection.toString()})(config, storage, now)`)
  const storage = new ThemeStorage()
  assert.equal(boot(bootConfig, storage, startsAt).theme, 'halloween')
  storage.setItem(THEME_STORAGE_KEY, 'gaming')
  assert.equal(boot(bootConfig, storage, endsAt - 1).theme, 'gaming')
  assert.equal(boot(bootConfig, storage, endsAt).theme, 'sunsetskycity')
  assert.equal(storage.removals, 2)
})
