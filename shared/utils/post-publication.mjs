export function getPostPublication(post) {
  const value = post?.publication ?? post?.Publication
  return (Array.isArray(value) ? value : [value])
    .filter(item => typeof item === 'string')
    .map(item => item.trim()).filter(Boolean).join(', ')
}
