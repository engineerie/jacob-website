import { isProjectDate } from './project-period.mjs'

// Anchor coarse historical dates for positioning, preserving the original text
// separately so a year is never presented as an asserted January 1 event.
export function parseTimelineDate(value) {
  if (typeof value !== 'string' || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return null
  const full = value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value
  return isProjectDate(full) ? Date.parse(`${full}T00:00:00Z`) : null
}
