import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat, unlink, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { exportPosts, MANIFEST } from '../lib/obsidian-export.mjs'
import { git, stagePublishedFiles } from '../lib/publishing-git.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'obsidian-publishing-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const vaultPath = path.join(root, 'vault')
  const projectRoot = path.join(root, 'site')
  const published = path.join(vaultPath, 'Website/Published')
  await mkdir(published, { recursive: true })
  await mkdir(projectRoot)
  const note = (name, text) => writeFile(path.join(published, name), text)
  const sync = (options = {}) => exportPosts({ vaultPath, projectRoot, now: new Date('2026-11-03T12:00:00Z'), ...options })
  return { root, vaultPath, projectRoot, published, note, sync }
}

async function image(file) {
  const width = 120, height = 70
  const data = Buffer.alloc(width * height * 3)
  for (let index = 0; index < data.length; index += 3) {
    data[index] = (index * 3) % 256
    data[index + 1] = (index * 7) % 256
    data[index + 2] = (index * 11) % 256
  }
  await sharp(data, { raw: { width, height, channels: 3 } }).png().toFile(file)
}

test('exports Obsidian embeds, Markdown/reference images, titles and links; preserves originals and caches outputs', async (t) => {
  const f = await fixture(t)
  const sourceImage = path.join(f.vaultPath, 'Forest image.png')
  await image(sourceImage)
  const original = await readFile(sourceImage)
  await f.note('Second note.md', '# Second note\n\nA published destination.\n')
  await f.note('First note.md', `---\nlink: https://example.com/source\n---\n\n# First note\n\n![[Forest image.png]]\n\n![A forest](../../Forest%20image.png "Image credit")\n\n![Another view][photo]\n\n[photo]: ../../Forest%20image.png\n\n[[Second note|Read more]]\n\n[Also read](Second%20note.md)\n\n\`![[do-not-resolve.png]]\`\n\n\`\`\`md\n![[also-do-not-resolve.png]]\n\`\`\`\n`)
  const result = await f.sync()
  assert.equal(result.posts.length, 2)
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].variants.length, 1, 'never upscale a smaller source')
  const output = await readFile(path.join(f.projectRoot, 'content/blog/first-note.md'), 'utf8')
  assert.match(output, /title: First note/)
  assert.match(output, /date: ["']?2026-11-03/)
  assert.match(output, /link: https:\/\/example.com\/source/)
  assert.equal((output.match(/::post-image/g) || []).length, 3)
  assert.match(output, /loading: eager/)
  assert.equal((output.match(/loading: lazy/g) || []).length, 2)
  assert.match(output, /caption: Image credit/)
  assert.match(output, /\[Read more\]\(\/blog\/second-note\)/)
  assert.match(output, /\[Also read\]\(\/blog\/second-note\)/)
  assert.match(output, /`!\[\[do-not-resolve.png\]\]`/)
  assert.match(output, /!\[\[also-do-not-resolve.png\]\]/)
  assert.doesNotMatch(output, /^# First note$/m, 'page title is rendered once')
  assert.deepEqual(await readFile(sourceImage), original)
  const variant = result.images[0].variants[0]
  const pixels = await sharp(path.join(f.projectRoot, variant.file)).removeAlpha().toColourspace('srgb').raw().toBuffer()
  const colors = new Set()
  for (let index = 0; index < pixels.length; index += 3) {
    assert.equal(pixels[index], pixels[index + 1])
    assert.equal(pixels[index], pixels[index + 2])
    colors.add(pixels[index])
  }
  assert.ok(colors.size <= 4, `expected four-tone grayscale, received ${colors.size} colors`)
  const before = (await stat(path.join(f.projectRoot, variant.file))).mtimeMs
  const second = await f.sync({ now: new Date('2027-02-01T12:00:00Z') })
  assert.equal(second.images[0].cached, true)
  assert.deepEqual(second.changed, [])
  assert.equal(second.posts[0].date, '2026-11-03', 'first publication date remains stable')
  assert.equal((await stat(path.join(f.projectRoot, variant.file))).mtimeMs, before)
})

test('missing or ambiguous images fail without partially updating an existing export', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', 'Original text.')
  await f.sync()
  const before = await readFile(path.join(f.projectRoot, 'content/blog/note.md'), 'utf8')
  await f.note('Note.md', 'Updated text.\n\n![[missing.png]]')
  await assert.rejects(f.sync(), /missing image/)
  assert.equal(await readFile(path.join(f.projectRoot, 'content/blog/note.md'), 'utf8'), before)
  for (const directory of ['A', 'B']) {
    await mkdir(path.join(f.vaultPath, directory))
    await image(path.join(f.vaultPath, directory, 'same.png'))
  }
  await f.note('Note.md', '![[same.png]]')
  await assert.rejects(f.sync(), /ambiguous image/)
})

test('dry run writes nothing, draft changes unpublish only managed content, and hand-authored files survive', async (t) => {
  const f = await fixture(t)
  await image(path.join(f.vaultPath, 'photo.png'))
  await f.note('Note.md', '![[photo.png|A descriptive image]]')
  await f.sync({ dryRun: true })
  assert.deepEqual(await readdir(f.projectRoot), [])
  await mkdir(path.join(f.projectRoot, 'content/blog'), { recursive: true })
  await writeFile(path.join(f.projectRoot, 'content/blog/manual.md'), 'Hand-authored post')
  const first = await f.sync()
  await f.note('Note.md', '---\ndraft: true\n---\n\n![[private-or-missing.png]]')
  const next = await f.sync()
  assert.equal(next.posts.length, 0)
  assert.ok(next.removed.includes('content/blog/note.md'))
  assert.ok(next.removed.includes(first.images[0].variants[0].file))
  assert.equal(await readFile(path.join(f.projectRoot, 'content/blog/manual.md'), 'utf8'), 'Hand-authored post')
})

test('protects manual edits, slug collisions, private links and images outside the vault', async (t) => {
  const f = await fixture(t)
  await f.note('A note.md', '---\nslug: same\n---\nText')
  await f.note('Another.md', '---\nslug: same\n---\nText')
  await assert.rejects(f.sync(), /Slug collision/)
  await unlink(path.join(f.published, 'Another.md'))
  await mkdir(path.join(f.projectRoot, 'content/blog'), { recursive: true })
  await writeFile(path.join(f.projectRoot, 'content/blog/same.md'), 'Manual')
  await assert.rejects(f.sync(), /not owned/)
  await unlink(path.join(f.projectRoot, 'content/blog/same.md'))
  await f.sync()
  await writeFile(path.join(f.projectRoot, 'content/blog/same.md'), 'Manual edit to exported post')
  await assert.rejects(f.sync(), /edited outside Obsidian/)
  await f.note('A note.md', '[[Private note]]')
  await assert.rejects(f.sync(), /not in Website\/Published/)
  const outside = path.join(f.root, 'outside.png')
  await image(outside)
  await symlink(outside, path.join(f.vaultPath, 'outside.png'))
  await f.note('A note.md', '![[outside.png]]')
  await assert.rejects(f.sync(), /outside the vault/)
})

test('supports color exceptions and validates date and image mode metadata', async (t) => {
  const f = await fixture(t)
  await image(path.join(f.vaultPath, 'chart.png'))
  await f.note('Chart.md', '---\ndate: "2026-10-20"\nimageOverrides:\n  chart.png: color\n---\n\n![[chart.png|A color chart]]')
  const result = await f.sync()
  assert.equal(result.images[0].mode, 'color')
  assert.equal(result.posts[0].date, '2026-10-20')
  const output = await readFile(path.join(f.projectRoot, 'content/blog/chart.md'), 'utf8')
  assert.doesNotMatch(output, /imageOverrides/)
  const imageFile = path.join(f.projectRoot, result.images[0].variants[0].file)
  const { channels } = await sharp(imageFile).metadata()
  assert.ok(channels >= 3)
  await f.note('Chart.md', '---\ndate: "2026-02-31"\n---\nText')
  await assert.rejects(f.sync(), /date must be/)
  await f.note('Chart.md', '---\nimageMode: potato\n---\nText')
  await assert.rejects(f.sync(), /imageMode must be/)
})

test('does not expose the vault path and rejects unsafe manifest cleanup paths', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', 'A note.')
  await f.sync()
  const manifestPath = path.join(f.projectRoot, MANIFEST)
  const text = await readFile(manifestPath, 'utf8')
  assert.ok(!text.includes(f.vaultPath))
  const manifest = JSON.parse(text)
  manifest.posts['Note.md'].file = '../../unrelated.md'
  await writeFile(manifestPath, JSON.stringify(manifest))
  await assert.rejects(f.sync(), /Invalid managed/)
})

test('retains remote reference images and does not interpret escaped embeds', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', '![A remote image][remote]\n\n[remote]: https://example.com/photo.jpg\n\n\\![[example.png]]')
  const result = await f.sync()
  const output = await readFile(path.join(f.projectRoot, 'content/blog/note.md'), 'utf8')
  assert.match(output, /\[remote\]: https:\/\/example.com\/photo.jpg/)
  assert.match(output, /\\!\[\[example.png\]\]/)
  assert.equal(result.warnings.length, 1)
})

test('publishing stages previously previewed exports and retired tracked files without staging unrelated edits', async (t) => {
  const f = await fixture(t)
  git(f.projectRoot, ['init', '-b', 'master'])
  git(f.projectRoot, ['config', 'user.name', 'Publishing test'])
  git(f.projectRoot, ['config', 'user.email', 'publishing-test@example.invalid'])
  await writeFile(path.join(f.projectRoot, 'README.md'), 'Original')
  git(f.projectRoot, ['add', 'README.md'])
  git(f.projectRoot, ['commit', '-m', 'Initial test site'])
  await f.note('Note.md', 'First publication.')
  await f.sync()
  await f.sync()
  await writeFile(path.join(f.projectRoot, 'README.md'), 'Uncommitted unrelated edit')
  const staged = await stagePublishedFiles(f.projectRoot)
  assert.ok(staged.includes('content/blog/note.md'))
  assert.ok(staged.includes(MANIFEST))
  assert.ok(!staged.includes('README.md'))
  await assert.rejects(stagePublishedFiles(f.projectRoot), /existing staged changes/)
  git(f.projectRoot, ['commit', '-m', 'Publish test note'])
  await unlink(path.join(f.published, 'Note.md'))
  await f.sync()
  await f.sync()
  const removed = await stagePublishedFiles(f.projectRoot)
  assert.ok(removed.includes('content/blog/note.md'), 'stages deletion even when it was previewed before publishing')
  assert.ok(!removed.includes('README.md'))
})

test('website handover preserves custom content and legacy images when the original changes, becomes a draft or is removed', async (t) => {
  const f = await fixture(t)
  await image(path.join(f.vaultPath, 'photo.png'))
  await f.note('Note.md', '![[photo.png|Forest detail]]\n\nOriginal text.')
  const first = await f.sync()
  const outputPath = path.join(f.projectRoot, 'content/blog/note.md')
  const original = await readFile(outputPath, 'utf8')
  const manifestPath = path.join(f.projectRoot, MANIFEST)
  const legacy = JSON.parse(await readFile(manifestPath, 'utf8'))
  delete legacy.posts['Note.md'].images
  await writeFile(manifestPath, JSON.stringify(legacy))
  const enhanced = original.replace('draft: false', 'draft: false\nsync: website') + '\nCustom website text.\n\n::interactive-chart\n---\ndata: [2, 4, 8]\n---\n::\n'
  await writeFile(outputPath, enhanced)
  await f.note('Note.md', '---\ndraft: true\n---\n\n![[now-missing.png]]\n\nChanged in Obsidian.')
  const next = await f.sync()
  assert.equal(next.posts[0].sync, 'website')
  assert.equal(await readFile(outputPath, 'utf8'), enhanced)
  let manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(manifest.posts['Note.md'].managed, false)
  assert.equal(manifest.posts['Note.md'].images.length, 1)
  for (const variant of first.images[0].variants) assert.equal((await stat(path.join(f.projectRoot, variant.file))).size, variant.bytes)
  await unlink(path.join(f.published, 'Note.md'))
  await unlink(path.join(f.vaultPath, 'photo.png'))
  await f.sync()
  assert.equal(await readFile(outputPath, 'utf8'), enhanced)
  const withoutFlag = enhanced.replace('sync: website\n', '')
  await writeFile(outputPath, withoutFlag)
  await f.sync()
  assert.equal(await readFile(outputPath, 'utf8'), withoutFlag, 'recorded handover does not silently revert')
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(manifest.posts['Note.md'].managed, false)
})

test('automatic notes can link to a website-managed post and do not reclaim its URL', async (t) => {
  const f = await fixture(t)
  await f.note('First.md', 'First text.')
  await f.sync()
  const output = path.join(f.projectRoot, 'content/blog/first.md')
  await writeFile(output, (await readFile(output, 'utf8')).replace('draft: false', 'draft: false\nsync: website'))
  await f.sync()
  await unlink(path.join(f.published, 'First.md'))
  await f.note('Second.md', 'Read [[First]].')
  await f.sync()
  assert.match(await readFile(path.join(f.projectRoot, 'content/blog/second.md'), 'utf8'), /\[First\]\(\/blog\/first\)/)
  await f.note('Other.md', '---\nslug: first\n---\nA different note.')
  await assert.rejects(f.sync(), /Slug collision/)
})

test('a manually deleted website-managed post is not recreated from Obsidian', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', 'A note.')
  await f.sync()
  const output = path.join(f.projectRoot, 'content/blog/note.md')
  await writeFile(output, (await readFile(output, 'utf8')).replace('draft: false', 'draft: false\nsync: website'))
  await f.sync()
  await unlink(output)
  await f.sync()
  const last = await f.sync()
  assert.equal(last.posts.length, 0)
  await assert.rejects(readFile(output), { code: 'ENOENT' })
})

test('preserves multiple source links and rejects invalid ones before changing an export', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', '---\nlinks:\n  - https://research-architecture.org/Book-Series\n  - "[Spector Books](https://www.spectorbooks.com/book/common-sensing)"\n---\n\nArticle text.')
  await f.sync()
  const file = path.join(f.projectRoot, 'content/blog/note.md')
  const before = await readFile(file, 'utf8')
  assert.match(before, /links:/)
  assert.match(before, /\[Spector Books\]\(https:\/\/www.spectorbooks.com\/book\/common-sensing\)/)
  await f.note('Note.md', '---\nlinks:\n  - "[Bad](javascript:alert(1))"\n---\n\nChanged.')
  await assert.rejects(f.sync(), /Note.md: Links must/)
  assert.equal(await readFile(file, 'utf8'), before)
})

test('preserves the Obsidian Type list and rejects ambiguous types before changing an export', async (t) => {
  const f = await fixture(t)
  await f.note('Note.md', '---\nType:\n  - Published article\n---\n\nAn article.')
  await f.sync()
  const file = path.join(f.projectRoot, 'content/blog/note.md')
  const before = await readFile(file, 'utf8')
  assert.match(before, /Type:\n  - Published article/)
  await f.note('Note.md', '---\nType:\n  - Blog post\n  - Published article\n---\n\nChanged.')
  await assert.rejects(f.sync(), /Note.md: Type must contain only one/)
  assert.equal(await readFile(file, 'utf8'), before)
})
