import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmTable } from 'micromark-extension-gfm-table'
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table'
import { stringify } from 'yaml'
import { isProjectDate } from '../../shared/utils/project-period.mjs'
import { parseTimelineDate } from '../../shared/utils/timeline-date.mjs'

// Operate on Markdown nodes so examples in code fences remain untouched.
export function transformPostCharts(source, file = 'Post') {
  const tree = fromMarkdown(source, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] })
  const edits = []
  const fail = message => { throw new Error(`${file}: chart ${message}`) }
  for (const [index, node] of tree.children.entries()) {
    if (node.type !== 'html' || !/^<!--\s*chart:/.test(node.value)) continue
    const match = /^<!--\s*chart:\s*([\s\S]*?)\s*-->$/.exec(node.value.trim())
    if (!match) fail('comment must contain only chart instructions.')
    const options = Object.create(null)
    let rest = match[1].trim()
    while (rest) {
      const attribute = /^(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))(?:\s+|$)/.exec(rest)
      if (!attribute) fail('instructions must use key=value or key="value with spaces".')
      const [, key, double, single, plain] = attribute
      if (!['type', 'x', 'title', 'label', 'start', 'end', 'date', 'group'].includes(key) || key in options) fail(`has an unknown or duplicate option: ${key}.`)
      options[key] = double ?? single ?? plain
      rest = rest.slice(attribute[0].length)
    }
    if (!['line', 'area', 'bar', 'timeline'].includes(options.type)) fail('type must be line, area, bar or timeline.')
    const timeline = options.type === 'timeline'
    for (const key of Object.keys(options)) {
      if (!(timeline ? ['type', 'title', 'label', 'start', 'end', 'date', 'group'] : ['type', 'title', 'x']).includes(key)) fail(`${key} is not supported for ${options.type}.`)
    }
    const table = tree.children[index + 1]
    if (table?.type !== 'table' || source.slice(node.position.end.offset, table.position.start.offset).trim()) fail('comment must be followed by a Markdown table.')
    const cellText = cell => cell.children.map(child => {
      if (!['text', 'inlineCode'].includes(child.type)) fail('cells must contain plain text or inline code.')
      return child.value
    }).join('').trim()
    const [headers, ...rows] = table.children.map(row => row.children.map(cellText))
    if (headers.length < 2 || headers.some(header => !header) || new Set(headers).size !== headers.length) fail('table needs at least two unique, non-empty column names.')
    if (!rows.length) fail('table needs at least one data row.')
    if (timeline) {
      if (options.date && (options.start || options.end)) fail('timeline uses either date or start/end, not both.')
      const date = options.date || (!options.start && !options.end && !headers.includes('Start') && (headers.includes('Date') ? 'Date' : headers.includes('Year') ? 'Year' : undefined))
      const fields = date
        ? { label: options.label || 'Event', date }
        : { label: options.label || 'Activity', start: options.start || 'Start', end: options.end || 'End' }
      if (options.group) fields.group = options.group
      if (new Set(Object.values(fields)).size !== Object.values(fields).length) fail('timeline fields must use different columns.')
      for (const [key, column] of Object.entries(fields)) {
        if (!headers.includes(column)) fail(`timeline ${key} must match a column name (${headers.join(', ')}).`)
      }
      const labels = new Set()
      const data = rows.map((row, rowIndex) => {
        if (row.length !== headers.length) fail(`row ${rowIndex + 1} must have ${headers.length} cells.`)
        const datum = Object.fromEntries(headers.map((header, column) => [header, row[column]]))
        const name = datum[fields.label]
        if (!name || labels.has(name)) fail(`timeline row ${rowIndex + 1} needs a unique, non-empty label.`)
        labels.add(name)
        for (const key of date ? ['date'] : ['start', 'end']) {
          const value = datum[fields[key]]
          const valid = date ? parseTimelineDate(value) !== null : value && isProjectDate(value)
          if (!valid) fail(`timeline row ${rowIndex + 1}, ${fields[key]} must be a valid ${date ? 'YYYY, YYYY-MM or YYYY-MM-DD' : 'YYYY-MM-DD'} date.`)
        }
        if (!date && datum[fields.end] < datum[fields.start]) fail(`timeline row ${rowIndex + 1} ends before it starts.`)
        if (fields.group && !datum[fields.group]) fail(`timeline row ${rowIndex + 1} needs a non-empty group.`)
        return datum
      })
      const properties = { ...fields, title: options.title?.trim() || 'Timeline', headers, data }
      edits.push({ start: node.position.start.offset, end: table.position.end.offset, text: `::post-timeline\n---\n${stringify(properties, { lineWidth: 0 })}---\n::` })
      continue
    }
    if (!headers.includes(options.x)) fail(`x must match a column name (${headers.join(', ')}).`)
    const categories = headers.filter(header => header !== options.x)
    const labels = new Set()
    const data = rows.map((row, rowIndex) => {
      if (row.length !== headers.length) fail(`row ${rowIndex + 1} must have ${headers.length} cells.`)
      return Object.fromEntries(headers.map((header, column) => {
        const value = row[column]
        if (header === options.x) {
          if (!value || labels.has(value)) fail(`row ${rowIndex + 1} needs a unique, non-empty x value.`)
          labels.add(value)
          return [header, value]
        }
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) fail(`row ${rowIndex + 1}, ${header} must contain a number without units or separators.`)
        return [header, Number(value)]
      }))
    })
    const properties = { type: options.type, index: options.x, title: options.title?.trim() || categories.join(', '), headers, categories, data }
    edits.push({ start: node.position.start.offset, end: table.position.end.offset, text: `::post-chart\n---\n${stringify(properties, { lineWidth: 0 })}---\n::` })
  }
  for (const edit of edits.reverse()) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  return source
}
