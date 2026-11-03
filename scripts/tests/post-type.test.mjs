import test from 'node:test'
import assert from 'node:assert/strict'
import { getPostType, isPostType } from '../../shared/utils/post-type.mjs'

test('supports Obsidian list properties and plain text properties', () => {
  assert.equal(getPostType(['Published article']), 'Published article')
  assert.equal(getPostType(['Blog post']), 'Blog post')
  assert.equal(getPostType('Published article'), 'Published article')
  assert.equal(getPostType(' published ARTICLE '), 'Published article')
  assert.equal(getPostType(['Project']), 'Project')
  assert.equal(getPostType('projects'), 'Project')
})

test('older posts without a Type keep the blog icon', () => {
  for (const value of [undefined, null, [], '']) assert.equal(getPostType(value), 'Blog post')
})

test('rejects unknown types and multiple simultaneous classifications', () => {
  for (const value of ['Video', ['Blog post', 'Published article'], 42, {}]) {
    assert.equal(isPostType(value), false)
    assert.throws(() => getPostType(value), /Type must/)
  }
})
