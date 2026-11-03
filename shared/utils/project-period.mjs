export function isProjectDate(value) {
  if (value == null || value === '') return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(value)
}

export function getProjectPeriod({ start, end } = {}) {
  if (!isProjectDate(start)) throw new Error('start must be a YYYY-MM-DD date.')
  if (!isProjectDate(end)) throw new Error('end must be a YYYY-MM-DD date.')
  if (!start) {
    if (end) throw new Error('A project end date requires a start date.')
    return null
  }
  if (end && end < start) throw new Error('A project end date cannot be before its start date.')
  const format = value => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'))
  return { start, end: end || null, startLabel: format(start), endLabel: end ? format(end) : 'Present' }
}
