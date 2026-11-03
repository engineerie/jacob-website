export function getPostType(value) {
  if (Array.isArray(value)) {
    if (value.length > 1) throw new Error('Type must contain only one value: Blog post, Published article, or Project.')
    value = value[0]
  }
  if (value == null || value === '') return 'Blog post'
  if (typeof value !== 'string') throw new Error('Type must be Blog post, Published article, or Project.')
  const normalized = value.trim().toLowerCase()
  if (normalized === 'blog post') return 'Blog post'
  if (normalized === 'published article') return 'Published article'
  if (normalized === 'project' || normalized === 'projects') return 'Project'
  throw new Error('Type must be Blog post, Published article, or Project.')
}

export function isPostType(value) {
  try { getPostType(value); return true } catch { return false }
}
