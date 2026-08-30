function taipeiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
}

export function formatDateToYYYYMMDD(date: Date): string {
  const parts = taipeiParts(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatDateTime(date: Date): string {
  const parts = taipeiParts(date)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}
