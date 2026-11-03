import test from 'node:test'
import assert from 'node:assert/strict'
import { getProjectPeriod, isProjectDate } from '../../shared/utils/project-period.mjs'

test('formats completed project spans with machine-readable dates', () => {
  assert.deepEqual(getProjectPeriod({ start: '2024-01-15', end: '2026-10-31' }), {
    start: '2024-01-15', end: '2026-10-31', startLabel: 'Jan 2024', endLabel: 'Oct 2026',
  })
  assert.equal(isProjectDate('2024-02-29'), true)
})

test('supports ongoing projects and leaves unspecified spans empty', () => {
  assert.equal(getProjectPeriod({ start: '2024-01-01' }).endLabel, 'Present')
  assert.equal(getProjectPeriod({ start: '2024-01-01', end: null }).end, null)
  assert.equal(getProjectPeriod({ start: '2024-01-01', end: '' }).endLabel, 'Present')
  assert.equal(getProjectPeriod({}), null)
})

test('rejects impossible dates, end-only spans and reversed spans', () => {
  for (const value of ['2026-02-29', '2024-02-30', 'yesterday', 2024]) assert.equal(isProjectDate(value), false)
  assert.throws(() => getProjectPeriod({ end: '2026-01-01' }), /requires a start/)
  assert.throws(() => getProjectPeriod({ start: '2026-01-01', end: '2025-12-31' }), /cannot be before/)
  assert.throws(() => getProjectPeriod({ start: '2026-13-01' }), /start must/)
})
