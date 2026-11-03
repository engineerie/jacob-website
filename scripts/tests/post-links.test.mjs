import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePostLinks, isPostLink } from '../../shared/utils/post-links.mjs'

test('supports the Obsidian list with named and unnamed links in order', () => {
  assert.deepEqual(normalizePostLinks({ links: [
    'https://research-architecture.org/Book-Series',
    '[Spector Books](https://www.spectorbooks.com/book/common-sensing)',
  ] }), [
    { label: 'research-architecture.org', url: 'https://research-architecture.org/Book-Series' },
    { label: 'Spector Books', url: 'https://www.spectorbooks.com/book/common-sensing' },
  ])
})

test('keeps legacy links working and lets an explicit links list replace them', () => {
  assert.deepEqual(normalizePostLinks({ link: 'https://www.example.com/source' }), [{ label: 'example.com', url: 'https://www.example.com/source' }])
  assert.deepEqual(normalizePostLinks({ link: 'https://example.com', links: null }), [{ label: 'example.com', url: 'https://example.com/' }])
  assert.deepEqual(normalizePostLinks({ link: 'https://example.com', links: [] }), [])
  assert.deepEqual(normalizePostLinks({ links: null }), [])
  assert.deepEqual(normalizePostLinks(), [])
})

test('deduplicates URLs, preserves labels as plain text and supports URL parentheses', () => {
  assert.deepEqual(normalizePostLinks({ links: [
    '[A guide \\[PDF\\]](https://example.com/Book_(Series))',
    'https://example.com/Book_(Series)',
    '[<script>plain text</script>](https://example.com)',
    '',
  ] }), [
    { label: 'A guide [PDF]', url: 'https://example.com/Book_(Series)' },
    { label: '<script>plain text</script>', url: 'https://example.com/' },
  ])
})

test('rejects invalid lists, malformed Markdown, unsafe protocols and ambiguous whitespace', () => {
  for (const links of ['https://example.com', {}, [42], ['javascript:alert(1)'], ['data:text/html,test'], ['[Broken](not-a-url)'], ['https://example.com/has spaces']]) {
    assert.throws(() => normalizePostLinks({ links }))
  }
  assert.equal(isPostLink('[Good](https://example.com)'), true)
  assert.equal(isPostLink('javascript:alert(1)'), false)
})
