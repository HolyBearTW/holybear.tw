const STORAGE_PREFIX = 'holybear:maplecombat:'
let storageScope = 'default'

export function setMapleCombatStorageScope(scope: string): void {
  storageScope = encodeURIComponent(String(scope || 'default'))
}

const scopedKey = (key: string) => `${STORAGE_PREFIX}${storageScope}:${key}`

/**
 * MapleCombat 原版以短鍵名寫入 localStorage；嵌入全站後必須加命名空間，
 * 避免 selectedJob、activeView 等通用名稱和網站其他功能互相覆蓋。
 */
export const mapleCombatStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(scopedKey(key))
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(scopedKey(key), value)
  },
}
