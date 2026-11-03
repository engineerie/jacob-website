import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { exportPosts } from './lib/obsidian-export.mjs'

export const projectRoot = fileURLToPath(new URL('..', import.meta.url))

export async function syncPosts(args = process.argv.slice(2)) {
  let config = {}
  try { config = JSON.parse(await readFile(path.join(projectRoot, '.publishing.local.json'), 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  config.vaultPath = process.env.OBSIDIAN_VAULT || config.vaultPath
  let dryRun = false
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    if (flag === '--dry-run') dryRun = true
    else if (flag === '--vault' && args[index + 1]) config.vaultPath = args[++index]
    else if (flag === '--help') {
      console.log('Usage: pnpm posts:sync [--vault /path/to/vault] [--dry-run]\nConfigure .publishing.local.json using publishing.config.example.json.')
      return null
    } else throw new Error(`Unknown or incomplete option: ${flag}`)
  }
  if (config.vaultPath?.startsWith('~/')) config.vaultPath = path.join(os.homedir(), config.vaultPath.slice(2))
  const result = await exportPosts({ ...config, projectRoot, dryRun })
  console.log(`${dryRun ? 'Dry run: ' : ''}${result.posts.length} post(s), ${result.images.length} image(s); ${result.changed.length} file(s) ${dryRun ? 'would change' : 'updated'}, ${result.removed.length} retired.`)
  for (const post of result.posts) console.log(`  ${post.source} → ${post.url}${post.sync === 'website' ? ' (website-managed)' : ''}`)
  for (const image of result.images) {
    const variants = image.variants.map(variant => `${variant.width}px: ${(variant.bytes / 1024).toFixed(1)} KB`).join(', ')
    console.log(`  ${image.name}: ${(image.sourceBytes / 1024).toFixed(1)} KB original → ${variants} (${image.mode}${image.cached ? ', cached' : ''})`)
  }
  for (const warning of result.warnings) console.warn(`  Note: ${warning}`)
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncPosts().catch(error => { console.error(`Export failed: ${error.message}`); process.exitCode = 1 })
}
