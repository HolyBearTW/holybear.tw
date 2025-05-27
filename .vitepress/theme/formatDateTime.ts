export function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  // 如果只給年月日，不顯示時間
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString) || /^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
    return dateString.replace(/\//g, '-')
  }
  // 讓大部分常見格式都能被 JS Date 正確解析
  let safeString = dateString.replace(/-/g, '/').replace('T', ' ').replace(/(\+\d{2}:?\d{2})$/, '')
  let date = new Date(safeString)
  if (isNaN(date.getTime())) date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  // 台灣時區（+8小時）
  const twDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const yyyy = twDate.getUTCFullYear()
  const mm = String(twDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(twDate.getUTCDate()).padStart(2, '0')
  const hh = String(twDate.getUTCHours()).padStart(2, '0')
  const min = String(twDate.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}
