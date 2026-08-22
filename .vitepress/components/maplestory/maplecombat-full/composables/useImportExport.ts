// 匯入/儲存檔案邏輯 — 供 CompactToolbar 使用。
import { ref } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import { exportSaveData, parseImportedData } from '@maplecombat/services/saveData'

export function useImportExport() {
  const store = useCharacterStore()
  const fileInput = ref<HTMLInputElement | null>(null)

  async function onExport() {
    try {
      await exportSaveData(store.collectSaveData())
    } catch (error) {
      alert(`儲存失敗：${error}`)
    }
  }

  function onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files && input.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        store.applySaveData(parseImportedData(String(reader.result)))
        alert('資料匯入完成')
      } catch (error) {
        alert(`匯入失敗：${(error as Error).message}`)
      } finally {
        input.value = ''
      }
    }
    reader.onerror = () => {
      alert('讀取檔案失敗，請再試一次。')
      input.value = ''
    }
    reader.readAsText(file)
  }

  return { fileInput, onExport, onImportFileChange }
}
