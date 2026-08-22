// 匯入/匯出存檔解析，格式不可更動。
import { fieldDefs } from '@maplecombat/constants/fields'
import type { BuffExportState } from '@maplecombat/stores/buffs'
import type { CompactStateWorkspaceV1 } from '@maplecombat/stores/stateSlots'

export interface SaveDataV1 {
  app?: string
  version?: number
  savedAt?: string
  selectedJob: string
  selectedJobName: string
  effSelectedJob: string
  values: Record<string, unknown>
  buffState?: BuffExportState
  workspace?: CompactStateWorkspaceV1
}

/** 剝除 BOM / ```json 圍欄 / 前後雜訊後解析 JSON */
export function parseImportedData(text: string): unknown {
  let cleaned = String(text || '')
    .trim()
    .replace(/^﻿/, '')
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  return JSON.parse(cleaned)
}

/** v0 扁平格式正規化為 v1 巢狀 values 格式 */
export function normalizeSavedData(saveData: unknown): SaveDataV1 {
  if (!saveData || typeof saveData !== 'object') {
    throw new Error('讀不到 JSON 物件')
  }
  const data = saveData as Record<string, unknown>

  if (data.values && typeof data.values === 'object') return data as unknown as SaveDataV1

  const values: Record<string, unknown> = {}
  fieldDefs.forEach((def) => {
    if (Object.prototype.hasOwnProperty.call(data, def.id)) {
      values[def.id] = data[def.id]
    }
  })
  if (Object.keys(values).length === 0) {
    throw new Error('找不到可匯入的欄位資料')
  }

  return {
    selectedJob: String(data.selectedJob || data.job || 'normal'),
    selectedJobName: String(data.selectedJobName || data.jobName || ''),
    effSelectedJob: String(data.effSelectedJob || 'normal'),
    values,
  }
}

function downloadBrowserFile(fileName: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/** 嵌入網站版只走瀏覽器下載，避免把 Tauri 桌面 runtime 打進延遲載入區塊。 */
export async function exportSaveData(saveData: SaveDataV1): Promise<void> {
  const contents = JSON.stringify(saveData, null, 2)
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const fileName = `combat-power-save-${timestamp}.json`
  downloadBrowserFile(fileName, contents)
}
