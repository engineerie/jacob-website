import { spawnSync } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { MANIFEST } from './obsidian-export.mjs'

export function git(projectRoot, args, allowFailure = false) {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`)
  return result
}

export async function stagePublishedFiles(projectRoot) {
  if (git(projectRoot, ['diff', '--cached', '--name-only']).stdout.trim()) throw new Error('Finish or unstage existing staged changes before publishing posts.')
  const current = JSON.parse(await readFile(path.join(projectRoot, MANIFEST), 'utf8'))
  const committed = git(projectRoot, ['show', `HEAD:${MANIFEST}`], true)
  const previous = committed.status === 0 ? JSON.parse(committed.stdout) : { posts: {}, images: {} }
  const ownedFiles = manifest => [
    ...Object.values(manifest.posts).map(post => post.file),
    ...Object.values(manifest.images).flatMap(image => image.variants.map(variant => variant.file)),
  ]
  const paths = []
  for (const file of new Set([MANIFEST, ...ownedFiles(current), ...ownedFiles(previous)])) {
    if (file !== MANIFEST && !/^(?:content\/blog\/[a-z0-9-]+\.md|public\/images\/obsidian\/[a-z0-9.-]+)$/.test(file)) throw new Error('Unexpected generated path in publishing manifest.')
    const exists = await access(path.join(projectRoot, file)).then(() => true, () => false)
    if (exists || git(projectRoot, ['ls-files', '--error-unmatch', '--', file], true).status === 0) paths.push(file)
  }
  if (paths.length) git(projectRoot, ['add', '--', ...paths])
  return git(projectRoot, ['diff', '--cached', '--name-only']).stdout.trim().split('\n').filter(Boolean)
}
