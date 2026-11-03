/** Parse the supported frontmatter formats without fetching remote page titles. */
export function normalizePostLinks({ links, link } = {}) {
  function entry(value) {
    if (typeof value !== 'string') throw new Error('Each link must be a URL or a quoted "[Name](https://example.com)" string.')
    value = value.trim()
    if (!value) return null
    const named = /^\[((?:\\.|[^\]\\])+)\]\((.+)\)$/.exec(value)
    const address = (named ? named[2] : value).trim()
    let url
    try { url = new URL(address) } catch { throw new Error(`Invalid link: ${value}`) }
    if (!['https:', 'http:'].includes(url.protocol) || /\s/.test(address)) throw new Error(`Links must use a valid http or https URL: ${value}`)
    const label = named ? named[1].replace(/\\([\[\]\\])/g, '$1').trim() : url.hostname.replace(/^www\./, '')
    if (!label) throw new Error('A named link must have a nonempty label.')
    return { label, url: url.href }
  }

  const legacy = link == null ? null : entry(link)
  if (links !== undefined && links !== null && !Array.isArray(links)) throw new Error('links must be a YAML list of URLs or quoted Markdown links.')
  const entries = links == null ? (legacy ? [legacy] : []) : links.map(entry).filter(Boolean)
  const seen = new Set()
  return entries.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

export function isPostLink(value) {
  try { normalizePostLinks({ links: [value] }); return true } catch { return false }
}
