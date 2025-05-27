// 支援 "2024-05-27 14:20:00"、"2024/05/27 14:20:00"、"2024-05-27T14:20:00+08:00"
export function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  // 讓大部分常見格式都能被 JS Date 正確解析
  let safeString = dateString.replace(/-/g, '/').replace('T', ' ').replace(/(\+\d{2}:?\d{2})$/, '') // 消除時區造成的 NaN
  let date = new Date(safeString)
  if (isNaN(date.getTime())) date = new Date(dateString) // 再嘗試一次原格式
  if (isNaN(date.getTime())) return dateString // 還是 NaN 就原字串

  // 時區處理（台灣時區）
  const twDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const yyyy = twDate.getUTCFullYear()
  const mm = String(twDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(twDate.getUTCDate()).padStart(2, '0')
  const hh = String(twDate.getUTCHours()).padStart(2, '0')
  const min = String(twDate.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}
