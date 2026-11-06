import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from 'yaml'
import { transformPostCharts } from '../lib/post-charts.mjs'
import { createChartScene, renderChartSvg } from '@tanstack/charts'
import { buildTimelineDefinition, timelineRows } from '../../app/utils/timeline-chart.mjs'

const table = '| Year | Readers | Subscribers |\n| --- | --- | --- |\n| 2024 | 1200 | 0 |\n| 2025 | 2600 | -2.5 |'
test('converts each supported chart type with multiple numeric series', () => {
  for (const type of ['line', 'area', 'bar']) {
    const result = transformPostCharts(`<!-- chart: type=${type} x=Year title="Annual readership" -->\n\n${table}`)
    const props = parse(result.split('---\n')[1])
    assert.equal(props.type, type)
    assert.equal(props.title, 'Annual readership')
    assert.deepEqual(props.categories, ['Readers', 'Subscribers'])
    assert.deepEqual(props.data[1], { Year: '2025', Readers: 2600, Subscribers: -2.5 })
  }
})
test('preserves ordinary tables and fenced chart examples', () => {
  const source = `${table}\n\n\`\`\`md\n<!-- chart: type=line x=Year -->\n\n${table}\n\`\`\``
  assert.equal(transformPostCharts(source), source)
})
test('reports malformed chart data with source context', () => {
  for (const source of [
    `<!-- chart: type=pie x=Year -->\n\n${table}`,
    `<!-- chart: type=line x=Missing -->\n\n${table}`,
    `<!-- chart: type=line x=Year -->\n\n${table.replace('1200', 'unknown')}`,
    '<!-- chart: type=line x=Year -->\n\nNo table here.',
  ]) assert.throws(() => transformPostCharts(source, 'Example.md'), /Example.md: chart/)
})

const timelineTable = '| Activity | Start | End | Phase |\n| --- | --- | --- | --- |\n| Site visits | 2027-01-01 | 2027-01-10 | Research |\n| Interviews | 2027-01-05 | 2027-01-24 | Research |\n| Workshop | 2027-01-25 | 2027-01-25 | Writing |'
const timelineProps = source => parse(transformPostCharts(source).split('---\n')[1])
test('exports timeline date ranges, optional groups and single-day activities', () => {
  const source = `<!-- chart: type=timeline group=Phase title="Research schedule" -->\n\n${timelineTable}`
  assert.match(transformPostCharts(source), /^::post-timeline/)
  const props = timelineProps(source)
  assert.equal(props.label, 'Activity')
  assert.equal(props.group, 'Phase')
  assert.equal(props.data[0].Start, '2027-01-01', 'dates remain portable YAML strings')
  assert.equal(timelineRows(props)[2].end - timelineRows(props)[2].start, 86400000)
  const scene = createChartScene(buildTimelineDefinition(props), { width: 640, height: 260 })
  const svg = renderChartSvg(scene, { ariaLabel: props.title })
  assert.match(svg, /Site visits/)
  assert.match(svg, /var\(--ui-chart-1\)/)
  assert.match(svg, /var\(--ui-chart-2\)/)
  const points = scene.points
  assert.equal(points.length, 3)
  assert.equal(points[0].x1Value, Date.parse('2027-01-01T00:00:00Z'))
  assert.equal(points[0].x2Value, Date.parse('2027-01-11T00:00:00Z'))
  assert.ok(points[0].y < points[1].y && points[1].y < points[2].y, 'lanes retain table order')
  const widths = [...svg.matchAll(/<rect[^>]*fill="var\(--ui-chart-\d\)"[^>]*width="([\d.]+)"/g)].map(match => Number(match[1]))
  assert.equal(widths.length, 3)
  assert.ok(Math.abs(widths[0] / widths[2] - 10) < 0.01, 'bar width represents elapsed days, including single-day ranges')
})
test('supports custom timeline columns, extra text and examples in code fences', () => {
  const source = '<!-- chart: type=timeline label=Task start=From end=Until -->\n\n| Task | From | Until | Notes |\n| --- | --- | --- | --- |\n| Planning | 2028-02-29 | 2028-03-02 | Initial phase |'
  const props = timelineProps(source)
  assert.equal(props.data[0].Notes, 'Initial phase')
  assert.equal(props.group, undefined)
  const fenced = `\`\`\`md\n${source}\n\`\`\``
  assert.equal(transformPostCharts(fenced), fenced)
})
test('rejects invalid timeline dates, ranges, labels and mappings', () => {
  for (const source of [
    timelineTable.replace('2027-01-01', '2027-02-30'),
    timelineTable.replace('2027-01-10', '2026-12-31'),
    timelineTable.replace('Interviews', 'Site visits'),
    timelineTable.replace('2027-01-01', ''),
  ]) assert.throws(() => transformPostCharts(`<!-- chart: type=timeline -->\n\n${source}`, 'Timeline.md'), /Timeline.md: chart/)
  assert.throws(() => transformPostCharts(`<!-- chart: type=timeline start=Missing -->\n\n${timelineTable}`), /must match a column/)
  assert.throws(() => transformPostCharts(`<!-- chart: type=timeline label=Start -->\n\n${timelineTable}`), /different columns/)
  assert.throws(() => transformPostCharts(`<!-- chart: type=line start=Start x=Activity -->\n\n${timelineTable}`), /not supported/)
})

test('historical events preserve date precision and scale proportionally across decades', () => {
  const source = '<!-- chart: type=timeline date=Year group=Theme -->\n\n| Year | Event | Theme |\n| --- | --- | --- |\n| 1903 | First act | Law |\n| 1950 | Mid-century | Practice |\n| 1993 | Policy reform | Law |'
  const props = timelineProps(source)
  assert.equal(props.date, 'Year')
  assert.equal(props.start, undefined)
  const scene = createChartScene(buildTimelineDefinition(props), { width: 640, height: 260 })
  assert.equal(scene.points.length, 3)
  assert.equal(scene.points[0].datum.dateLabel, '1903')
  const [a, b, c] = scene.points
  assert.equal(a.y, c.y, 'events in the same group share a lane')
  assert.notEqual(a.y, b.y, 'different groups use separate lanes')
  assert.equal(c.datum.label, 'Policy reform', 'individual event labels survive grouping')
  assert.equal(buildTimelineDefinition(props).focus, 'nearest', 'hover selects by date and lane, not lane alone')
  assert.ok(Math.abs((b.x - a.x) / (c.x - a.x) - (b.datum.start - a.datum.start) / (c.datum.start - a.datum.start)) < 0.00001)
  assert.match(renderChartSvg(scene, { ariaLabel: 'History' }), /<circle/)
})

test('historical events support partial dates, shared dates and a single event', () => {
  const make = date => `<!-- chart: type=timeline -->\n\n| Date | Event |\n| --- | --- |\n| ${date} | A milestone |`
  for (const date of ['1903', '1993-06', '1994-01-01']) {
    const props = timelineProps(make(date))
    const scene = createChartScene(buildTimelineDefinition(props), { width: 640, height: 200 })
    assert.equal(scene.points[0].datum.dateLabel, date)
    assert.ok(Number.isFinite(scene.points[0].x))
  }
  const sameDate = timelineProps(make('1903') + '\n| 1903 | Another milestone |')
  assert.equal(createChartScene(buildTimelineDefinition(sameDate), { width: 640, height: 200 }).points.length, 2)
  for (const date of ['1903-13', '1903-02-29', 'circa 1903', '']) assert.throws(() => timelineProps(make(date)), /valid YYYY/)
})
