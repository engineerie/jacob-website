import { spawnSync } from 'node:child_process'
import { projectRoot, syncPosts } from './sync-posts.mjs'
import { stagePublishedFiles } from './lib/publishing-git.mjs'

function run(command, args, capture = false, allowFailure = false) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) throw new Error(`${command} ${args.join(' ')} failed. Nothing was pushed.`)
  return result
}

async function publish() {
  if (process.argv.length > 2) throw new Error('Usage: pnpm posts:publish (configure the vault in .publishing.local.json).')
  const remote = run('git', ['remote', 'get-url', 'origin'], true, true)
  if (remote.status !== 0) throw new Error('Connect the GitHub repository as origin first. You can still run pnpm posts:sync locally.')
  if (!/github\.com[:/]/.test(remote.stdout)) throw new Error('The origin remote must be your GitHub repository.')
  const branch = run('git', ['branch', '--show-current'], true).stdout.trim()
  if (!['main', 'master'].includes(branch)) throw new Error('Publish from main or master so the GitHub Pages workflow runs.')
  if (run('git', ['diff', '--cached', '--name-only'], true).stdout.trim()) throw new Error('Finish or unstage your existing staged changes before publishing posts.')
  await syncPosts([])
  run('pnpm', ['test:publishing'])
  run('pnpm', ['generate'])
  const paths = await stagePublishedFiles(projectRoot)
  if (paths.length) {
    run('git', ['commit', '-m', 'Update published posts'])
  }
  run('git', ['push', '-u', 'origin', branch])
  console.log('Pushed to GitHub. The Pages workflow will build and deploy the site.')
}

publish().catch(error => { console.error(`Publish failed: ${error.message}`); process.exitCode = 1 })
