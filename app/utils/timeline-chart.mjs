import { barX, dot, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'

const day = 86_400_000
// Dates have already been validated by the Markdown exporter. Expand partial
// historical dates only for positioning; keep their authored labels below.
const timestamp = value => {
  const full = value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value
  return Date.parse(`${full}T00:00:00Z`)
}
export const timelineColor = index => `var(--ui-chart-${index % 2 + 1})`
export const formatTimelineDate = value => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(value))

export function timelineRows({ data, label, start, end, date, group }) {
  return data.map(row => ({
    label: row[label], start: timestamp(row[date || start]), end: date ? timestamp(row[date]) : timestamp(row[end]) + day,
    dateLabel: date ? row[date] : undefined,
    startLabel: row[start], endLabel: row[end], group: group ? row[group] : 'Activities',
  }))
}

export function buildTimelineDefinition(props) {
  const rows = timelineRows(props)
  const groups = [...new Set(rows.map(row => row.group))]
  const groupedEvents = Boolean(props.date && props.group)
  const lane = groupedEvents ? 'group' : 'label'
  const lanes = [...new Set(rows.map(row => row[lane]))]
  const first = Math.min(...rows.map(row => row.start))
  const last = Math.max(...rows.map(row => row.end))
  const padding = props.date ? Math.max((last - first) * 0.04, last === first ? 183 * day : day) : 0
  const minimum = first - padding
  const maximum = last + padding
  // Calendar boundaries, not arbitrary numeric timestamp ticks. Cap the density
  // for long spans while retaining UTC dates and proportional elapsed time.
  const ticks = []
  const cursor = new Date(minimum)
  cursor.setUTCDate(1)
  const months = (new Date(maximum).getUTCFullYear() - cursor.getUTCFullYear()) * 12 + new Date(maximum).getUTCMonth() - cursor.getUTCMonth()
  const annual = months > 24
  const step = annual ? 12 * Math.max(1, Math.ceil(months / 72)) : Math.max(1, Math.ceil(months / 6))
  if (annual) { cursor.setUTCMonth(0); cursor.setUTCFullYear(Math.ceil(cursor.getUTCFullYear() / (step / 12)) * (step / 12)) }
  while (cursor.getTime() <= maximum) {
    if (cursor.getTime() >= minimum) ticks.push(cursor.getTime())
    cursor.setUTCMonth(cursor.getUTCMonth() + step)
  }
  if (ticks.length < 2) {
    ticks.splice(0, ticks.length, minimum)
    const lastDay = maximum - day
    if (lastDay > minimum) ticks.push(lastDay)
  }
  const dateFormat = new Intl.DateTimeFormat('en-GB', annual ? { year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })
  return defineChart({
    marks: props.date
      ? [dot(rows, { x: 'start', y: lane, color: 'group', key: 'label', r: 5 })]
      : [barX(rows, { x1: 'start', x2: 'end', y: 'label', color: 'group', key: 'label', maxThickness: 12, radius: 3 })],
    margin: { left: groupedEvents ? 92 : 168, right: 24, top: 16, bottom: 44 },
    theme: { foreground: 'var(--ui-text-muted)', muted: 'var(--ui-text-dimmed)', grid: 'var(--ui-border)', background: 'var(--ui-bg)' },
    scales: {
      x: { scale: () => scaleLinear().domain([minimum, maximum]),
        grid: { stroke: 'var(--ui-border)', strokeWidth: 1 },
        axis: { line: false, ticks: { values: ticks, line: false, padding: 14, format: value => dateFormat.format(new Date(Number(value))) }, tickLabels: { fontSize: 11, thin: { minGap: 24 } } } },
      y: { scale: () => scaleBand().domain(lanes).padding(0.45),
        axis: { line: false, ticks: { line: false, padding: 12 }, tickLabels: { fontSize: 12 } } },
    },
    color: { scale: scaleOrdinal().domain(groups).range(groups.map((_, index) => timelineColor(index))) },
    focus: groupedEvents ? 'nearest' : 'nearest-y', focusRing: false,
  })
}
