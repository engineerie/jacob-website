import { createHash, randomUUID } from 'node:crypto'
import { readdir, readFile, writeFile, mkdir, rename, unlink, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { parse, stringify } from 'yaml'
import { normalizePostLinks } from '../../shared/utils/post-links.mjs'
import { getPostType } from '../../shared/utils/post-type.mjs'
import { getPostPublication } from '../../shared/utils/post-publication.mjs'
import { getProjectPeriod } from '../../shared/utils/project-period.mjs'
import { transformPostCharts } from './post-charts.mjs'

export const MANIFEST = '.publishing/manifest.json'
const IMAGE_DIR = 'public/images/obsidian/'
const POST_DIR = 'content/blog/'
const imageExtensions = /\.(jpe?g|png|webp|avif|tiff?|gif)$/i
const ignoredDirectories = new Set(['node_modules', '.git', '.obsidian', '.trash', '.nuxt', '.output'])
const hash = value => createHash('sha256').update(value).digest('hex')
const portable = value => value.split(path.sep).join('/')
const inside = (root, file) => file === root || file.startsWith(root + path.sep)
const slugify = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const pretty = value => value.replace(/[-_]+/g, ' ').replace(/^./, letter => letter.toUpperCase())

async function readOptional(file) {
  try { return await readFile(file) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

async function listFiles(root) {
  const files = []
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) continue
    const file = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(file))
    else if (entry.isFile()) files.push(file)
  }
  return files
}

function frontmatter(source, file) {
  source = source.replace(/^\uFEFF/, '')
  const match = /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(source)
  const metadata = match?.index === 0 ? parse(match[1]) || {} : {}
  if (typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${file}: frontmatter must be a YAML object.`)
  return { metadata, body: match?.index === 0 ? source.slice(match[0].length) : source }
}

function visit(node, callback, parent) {
  callback(node, parent)
  for (const child of node.children || []) visit(child, callback, node)
}

function textOf(node) {
  return node.value || (node.children || []).map(textOf).join('')
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(value)
}

function today(timeZone, now) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

function managedFile(file, kind) {
  const prefix = kind === 'post' ? POST_DIR : IMAGE_DIR
  if (typeof file !== 'string' || !file.startsWith(prefix) || file.includes('\\') || file.split('/').includes('..')) {
    throw new Error(`Invalid managed ${kind} path in publishing manifest.`)
  }
  if (kind === 'post' && !/^[a-z0-9-]+\.md$/.test(file.slice(prefix.length))) throw new Error('Invalid post filename in publishing manifest.')
  return file
}

function renderImage(properties) {
  return `\n\n::post-image\n---\n${stringify(properties, { lineWidth: 0 })}---\n::\n\n`
}

export async function exportPosts({
  projectRoot, vaultPath, publishedPath = 'Website/Published', widths = [480, 976],
  imageCrop = { width: 976, height: 440 },
  imageMode = 'dither', timeZone = 'Europe/London', dryRun = false, now = new Date(),
}) {
  if (!vaultPath) throw new Error('Set vaultPath in .publishing.local.json, or pass --vault <path>.')
  if (!['dither', 'color'].includes(imageMode)) throw new Error('imageMode must be dither or color.')
  if (imageCrop !== null && (!imageCrop || typeof imageCrop !== 'object'
    || !Number.isSafeInteger(imageCrop.width) || imageCrop.width < 1
    || !Number.isSafeInteger(imageCrop.height) || imageCrop.height < 1)) {
    throw new Error('imageCrop must contain positive integer width and height values, or be null.')
  }
  if (!Array.isArray(widths) || !widths.length || widths.some(width => !Number.isInteger(width) || width < 64 || width > 2400)) {
    throw new Error('Image widths must be integers between 64 and 2400.')
  }
  widths = [...new Set(widths)].sort((a, b) => a - b)
  const vault = await realpath(path.resolve(vaultPath))
  const published = await realpath(path.resolve(vault, publishedPath))
  if (!inside(vault, published) || published === vault) throw new Error('publishedPath must be a dedicated folder inside the vault.')
  projectRoot = path.resolve(projectRoot)
  if (inside(published, projectRoot) || inside(projectRoot, published)) throw new Error('The published folder and website project must be separate.')

  const previousBytes = await readOptional(path.join(projectRoot, MANIFEST))
  const previous = previousBytes ? JSON.parse(previousBytes) : { version: 1, posts: {}, images: {} }
  if (previous.version !== 1 || !previous.posts || !previous.images) throw new Error('Unsupported publishing manifest.')
  for (const post of Object.values(previous.posts)) managedFile(post.file, 'post')
  for (const image of Object.values(previous.images)) {
    for (const variant of image.variants) managedFile(variant.file, 'image')
  }

  const notes = []
  const slugs = new Map()
  const warnings = []
  const websitePosts = new Map()
  for (const [source, post] of Object.entries(previous.posts)) {
    const content = await readOptional(path.join(projectRoot, post.file))
    const metadata = content ? frontmatter(content.toString(), post.file).metadata : {}
    try { normalizePostLinks(metadata); getPostType(metadata.Type); getProjectPeriod(metadata) } catch (error) { throw new Error(`${post.file}: ${error.message}`) }
    if (metadata.sync !== undefined && !['obsidian', 'website'].includes(metadata.sync)) throw new Error(`${post.file}: sync must be obsidian or website.`)
    if (post.managed !== false && metadata.sync !== 'website') continue
    const images = post.images || Object.keys(previous.images).filter(key => previous.images[key].variants.some(variant => content?.includes('/' + variant.file.replace(/^public\//, ''))))
    websitePosts.set(source, { ...post, managed: false, images: content ? images : [], content })
    const slug = path.basename(post.file, '.md')
    slugs.set(slug, source)
    if (content) notes.push({
      source, file: path.join(published, source), slug, website: true,
      title: metadata.title || pretty(slug), date: metadata.date || post.date,
    })
  }
  const publicationDate = today(timeZone, now)
  for (const file of (await listFiles(published)).filter(file => /\.md$/i.test(file))) {
    const source = portable(path.relative(published, file))
    if (websitePosts.has(source)) continue
    const { metadata, body } = frontmatter(await readFile(file, 'utf8'), source)
    if (metadata.sync !== undefined && !['obsidian', 'website'].includes(metadata.sync)) throw new Error(`${source}: sync must be obsidian or website.`)
    if (metadata.draft !== undefined && typeof metadata.draft !== 'boolean') throw new Error(`${source}: draft must be true or false.`)
    if (metadata.draft === true) continue
    const tree = fromMarkdown(body)
    const heading = tree.children[0]?.type === 'heading' && tree.children[0].depth === 1 ? tree.children[0] : null
    const title = metadata.title || (heading ? textOf(heading) : path.basename(file, path.extname(file)))
    if (typeof title !== 'string' || !title.trim()) throw new Error(`${source}: title must be nonempty text.`)
    const slug = metadata.slug ?? slugify(source.replace(/\.md$/i, ''))
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${source}: supply a slug such as my-post.`)
    if (slugs.has(slug)) throw new Error(`Slug collision: ${source} and ${slugs.get(slug)} both use ${slug}. Set an explicit slug.`)
    slugs.set(slug, source)
    const date = metadata.date ?? previous.posts[source]?.date ?? publicationDate
    if (!validDate(date)) throw new Error(`${source}: date must be a quoted YYYY-MM-DD date.`)
    const mode = metadata.imageMode || imageMode
    if (!['dither', 'color'].includes(mode)) throw new Error(`${source}: imageMode must be dither or color.`)
    if (metadata.imageOverrides && (typeof metadata.imageOverrides !== 'object' || Array.isArray(metadata.imageOverrides))) throw new Error(`${source}: imageOverrides must be a filename-to-mode mapping.`)
    try { normalizePostLinks(metadata); getPostType(metadata.Type); getProjectPeriod(metadata) } catch (error) { throw new Error(`${source}: ${error.message}`) }
    notes.push({ file, source, metadata, body, tree, heading, title: title.trim(), slug, date, mode })
  }

  const outputs = new Map()
  const manifest = { version: 1, posts: {}, images: {} }
  const imageResults = new Map()
  const imageJobs = new Map()
  for (const [source, post] of websitePosts) {
    const { content, ...record } = post
    manifest.posts[source] = { ...record, ...(content ? { sha256: hash(content) } : {}) }
    if (content) outputs.set(post.file, content)
    for (const key of post.images) {
      const image = previous.images[key]
      if (!image) throw new Error(`${post.file}: generated image record is missing.`)
      manifest.images[key] = image
      for (const variant of image.variants) {
        const data = await readOptional(path.join(projectRoot, variant.file))
        if (!data) throw new Error(`${post.file}: image ${variant.file} is missing.`)
        outputs.set(variant.file, data)
      }
    }
  }
  let imageIndex
  async function resolveImage(reference, note) {
    let target
    try { target = decodeURIComponent(reference.split('#')[0]) } catch { throw new Error(`${note.source}: invalid image path ${reference}.`) }
    target = target.replace(/^\/+/, '')
    if (!imageExtensions.test(target)) throw new Error(`${note.source}: ${reference} is not a supported raster image. Use JPEG, PNG, WebP, AVIF, TIFF, or a still GIF.`)
    for (const candidate of [path.resolve(path.dirname(note.file), target), path.resolve(vault, target)]) {
      const resolved = await realpath(candidate).catch(error => { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error })
      if (!resolved) continue
      if (!inside(vault, resolved)) throw new Error(`${note.source}: image ${reference} points outside the vault.`)
      if ((await stat(resolved)).isFile()) return resolved
    }
    imageIndex ||= (await listFiles(vault)).filter(file => imageExtensions.test(file))
    const matches = imageIndex.filter(file => portable(path.relative(vault, file)) === target || (target.includes('/')
      ? portable(file).endsWith('/' + target) : path.basename(file) === target))
    if (matches.length !== 1) throw new Error(`${note.source}: ${matches.length ? 'ambiguous' : 'missing'} image ${reference}.${matches.length ? ' Use its full vault-relative path.' : ''}`)
    return matches[0]
  }

  async function processImage(reference, mode, note) {
    const file = await resolveImage(reference, note)
    const jobKey = `${file}\0${mode}`
    if (imageJobs.has(jobKey)) return imageJobs.get(jobKey)
    const promise = (async () => {
      const input = await readFile(file)
      const key = hash(Buffer.concat([input, Buffer.from(JSON.stringify({ widths, imageCrop, mode, tones: 4, versions: sharp.versions }))]))
      const cached = previous.images[key]
      if (cached && (await Promise.all(cached.variants.map(async variant => {
        const data = await readOptional(path.join(projectRoot, variant.file))
        return data && hash(data) === variant.sha256 ? [variant.file, data] : null
      }))).every(Boolean)) {
        for (const variant of cached.variants) outputs.set(variant.file, await readFile(path.join(projectRoot, variant.file)))
        manifest.images[key] = cached
        const result = { ...cached, key, cached: true, name: path.basename(file) }
        imageResults.set(key, result)
        return result
      }
      const metadata = await sharp(input, { limitInputPixels: 60_000_000 }).metadata()
      if ((metadata.pages || 1) > 1) throw new Error(`${note.source}: ${reference} is animated or multi-page. Export a still image first.`)
      const naturalWidth = (metadata.orientation || 1) >= 5 ? metadata.height : metadata.width
      const naturalHeight = (metadata.orientation || 1) >= 5 ? metadata.width : metadata.height
      const cropWidth = imageCrop ? Math.max(1, Math.min(naturalWidth, Math.floor(naturalHeight * imageCrop.width / imageCrop.height))) : naturalWidth
      const cropHeight = imageCrop ? Math.max(1, Math.min(naturalHeight, Math.round(cropWidth * imageCrop.height / imageCrop.width))) : naturalHeight
      const crop = imageCrop ? {
        left: Math.floor((naturalWidth - cropWidth) / 2),
        top: Math.floor((naturalHeight - cropHeight) / 2),
        width: cropWidth, height: cropHeight,
      } : null
      const targets = [...new Set(widths.map(width => Math.min(width, cropWidth)))]
      const variants = []
      for (const width of targets) {
        let pipeline = sharp(input, { limitInputPixels: 60_000_000 }).rotate()
        if (crop) pipeline = pipeline.extract(crop)
        pipeline = pipeline.resize({ width, withoutEnlargement: true })
        if (mode === 'dither') pipeline = pipeline.flatten({ background: '#ffffff' }).greyscale()
        const { data: png, info } = await pipeline.png(mode === 'dither'
          ? { palette: true, colours: 4, dither: 1, compressionLevel: 9, effort: 7 }
          : { compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
        const webp = await sharp(png).webp({ lossless: true, effort: 4 }).toBuffer()
        const [data, extension] = webp.length < png.length ? [webp, 'webp'] : [png, 'png']
        const output = `${IMAGE_DIR}${key.slice(0, 24)}-${info.width}.${extension}`
        outputs.set(output, data)
        variants.push({ file: output, width: info.width, height: info.height, bytes: data.length, sha256: hash(data) })
      }
      const record = { mode, sourceBytes: input.length, variants }
      manifest.images[key] = record
      const result = { ...record, key, cached: false, name: path.basename(file) }
      imageResults.set(key, result)
      return result
    })()
    imageJobs.set(jobKey, promise)
    return promise
  }

  function noteLink(reference, note) {
    const [target, fragment] = reference.split('#')
    if (fragment?.startsWith('^')) throw new Error(`${note.source}: Obsidian block references are not supported. Link to a heading instead.`)
    const decoded = decodeURIComponent(target).replace(/\.md$/i, '').replace(/^\/+/, '')
    const candidates = notes.filter(other => {
      const source = other.source.replace(/\.md$/i, '')
      return source === decoded || path.resolve(path.dirname(note.file), decoded + '.md') === other.file || (!decoded.includes('/') && path.basename(source) === decoded)
    })
    if (!decoded) candidates.push(note)
    if (candidates.length !== 1) throw new Error(`${note.source}: linked note ${reference} is ${candidates.length ? 'ambiguous' : 'not in Website/Published (or is a draft)'}.`)
    return { url: `/blog/${candidates[0].slug}${fragment ? '#' + slugify(fragment) : ''}`, title: candidates[0].title }
  }

  for (const note of notes) {
    if (note.website) continue
    const usedImages = new Set()
    const edits = []
    const protectedRanges = []
    const images = []
    const links = []
    const definitions = new Map()
    const imageReferences = []
    const linkReferenceIds = new Set()
    visit(note.tree, (node, parent) => {
      if (['code', 'inlineCode', 'html'].includes(node.type)) protectedRanges.push([node.position.start.offset, node.position.end.offset])
      if (node.type === 'definition') definitions.set(node.identifier, node)
      if (node.type === 'linkReference') linkReferenceIds.add(node.identifier)
      if (node.type === 'link') links.push(node)
      if (node.type === 'image') {
        if (parent?.type === 'link') throw new Error(`${note.source}: use a plain image embed and put its source link in a caption instead of wrapping it in a link.`)
        images.push({ reference: node.url, alt: node.alt, caption: node.title, start: node.position.start.offset, end: node.position.end.offset })
      }
      if (node.type === 'imageReference') imageReferences.push(node)
    })
    const inCode = offset => protectedRanges.some(([start, end]) => offset >= start && offset < end)
    for (const node of imageReferences) {
      const definition = definitions.get(node.identifier)
      if (!definition) throw new Error(`${note.source}: missing image definition ${node.identifier}.`)
      images.push({ reference: definition.url, alt: node.alt, caption: definition.title, start: node.position.start.offset, end: node.position.end.offset })
      if (!/^https?:\/\//i.test(definition.url) && !linkReferenceIds.has(node.identifier) && !edits.some(edit => edit.start === definition.position.start.offset)) {
        edits.push({ start: definition.position.start.offset, end: definition.position.end.offset, text: '' })
      }
    }
    for (const match of note.body.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) {
      if (inCode(match.index) || (match.index && note.body[match.index - 1] === '\\')) continue
      const [reference, alias] = match[2].split('|')
      if (match[1]) {
        const size = alias && /^\d+(?:x\d+)?$/.test(alias) ? Number(alias.split('x')[0]) : undefined
        images.push({ reference, alt: size ? undefined : alias, caption: size ? undefined : alias, displayWidth: size, start: match.index, end: match.index + match[0].length })
      } else {
        const target = noteLink(reference, note)
        edits.push({ start: match.index, end: match.index + match[0].length, text: `[${(alias || target.title).replace(/[\[\]\\]/g, '\\$&')}](${target.url})` })
      }
    }
    let number = 0
    for (const image of images.sort((a, b) => a.start - b.start)) {
      if (/^https?:\/\//i.test(image.reference)) {
        warnings.push(`${note.source}: remote image ${image.reference} is not processed; download it into the vault for optimization.`)
        continue
      }
      if (/^[a-z]+:/i.test(image.reference)) throw new Error(`${note.source}: unsupported image URL ${image.reference}.`)
      const mode = note.metadata.imageOverrides?.[image.reference] || note.metadata.imageOverrides?.[path.basename(image.reference)] || note.mode
      if (!['dither', 'color'].includes(mode)) throw new Error(`${note.source}: image override must be dither or color.`)
      const result = await processImage(image.reference, mode, note)
      usedImages.add(result.key)
      const largest = result.variants.at(-1)
      const url = file => '/' + file.replace(/^public\//, '')
      const alt = image.alt ?? pretty(path.basename(image.reference, path.extname(image.reference)))
      if (image.alt === undefined) warnings.push(`${note.source}: add descriptive alt text for ${image.reference}; using “${alt}” for now.`)
      const properties = {
        src: url(largest.file), alt, width: largest.width, height: largest.height,
        srcset: result.variants.map(variant => `${url(variant.file)} ${variant.width}w`).join(', '),
        loading: number++ === 0 ? 'eager' : 'lazy',
      }
      if (image.displayWidth) properties.displayWidth = Math.min(image.displayWidth, largest.width)
      if (image.caption) properties.caption = image.caption
      edits.push({ start: image.start, end: image.end, text: renderImage(properties) })
    }
    for (const node of links) {
      if (!/^(?:[a-z]+:|\/|#)/i.test(node.url) && /\.md(?:#.*)?$/i.test(node.url)) {
        const target = noteLink(node.url, note)
        edits.push({ start: node.position.start.offset, end: node.position.end.offset, text: `[${textOf(node).replace(/[\[\]\\]/g, '\\$&')}](${target.url})` })
      }
    }
    if (note.heading && textOf(note.heading).trim() === note.title) edits.push({ start: note.heading.position.start.offset, end: note.heading.position.end.offset, text: '' })
    let body = note.body
    let nextStart = Infinity
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      if (edit.end > nextStart) throw new Error(`${note.source}: overlapping embeds or links cannot be exported.`)
      body = body.slice(0, edit.start) + edit.text + body.slice(edit.end)
      nextStart = edit.start
    }
    body = transformPostCharts(body, note.source)
    const metadata = { ...note.metadata, title: note.title, date: note.date, draft: false }
    if ('publication' in metadata || 'Publication' in metadata) metadata.publication = getPostPublication(metadata)
    delete metadata.Publication
    delete metadata.imageMode
    delete metadata.imageOverrides
    const content = `---\n${stringify(metadata, { lineWidth: 0 })}---\n\n${body.trim()}\n`
    const file = `${POST_DIR}${note.slug}.md`
    outputs.set(file, Buffer.from(content))
    manifest.posts[note.source] = { file, date: note.date, sha256: hash(content), images: [...usedImages] }
  }

  const previousPosts = new Map(Object.values(previous.posts).map(post => [post.file, post]))
  for (const [file, post] of previousPosts) {
    if ([...websitePosts.values()].some(websitePost => websitePost.file === file)) continue
    const existing = await readOptional(path.join(projectRoot, file))
    if (existing && hash(existing) !== post.sha256) throw new Error(`${file} was edited outside Obsidian. Move those changes back to the source note, or add sync: website to its frontmatter to manage this post in the website project.`)
  }
  for (const post of Object.values(manifest.posts)) {
    if (!previousPosts.has(post.file) && await readOptional(path.join(projectRoot, post.file))) throw new Error(`${post.file} already exists and is not owned by the exporter. Choose another slug.`)
  }
  const previousFiles = new Set([
    ...previousPosts.keys(),
    ...Object.values(previous.images).flatMap(image => image.variants.map(variant => variant.file)),
  ])
  const removed = [...previousFiles].filter(file => !outputs.has(file))
  outputs.set(MANIFEST, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))
  const changed = []
  for (const [file, data] of outputs) {
    const absolute = path.join(projectRoot, file)
    const existing = await readOptional(absolute)
    if (existing?.equals(data)) continue
    changed.push(file)
    if (dryRun) continue
    await mkdir(path.dirname(absolute), { recursive: true })
    const temporary = `${absolute}.${randomUUID()}.tmp`
    await writeFile(temporary, data)
    await rename(temporary, absolute)
  }
  for (const file of removed) {
    if (!dryRun) await unlink(path.join(projectRoot, file)).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
  return {
    posts: notes.map(note => ({ source: note.source, url: `/blog/${note.slug}`, date: note.date, sync: note.website ? 'website' : 'obsidian' })),
    images: [...imageResults.values()], warnings, changed, removed, dryRun,
  }
}
