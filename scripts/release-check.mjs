#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageDirectory = join(root, 'packages/brain')
const packageName = '@encapsa-dev/brain'
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const publishCommand = `pnpm --filter ${packageName} publish --access public`
const publishLifecycle = process.argv.includes('--publish-lifecycle')

if (process.argv.slice(2).some(argument => argument !== '--publish-lifecycle')) {
  throw new Error('Usage: pnpm release:check')
}

let activeCommand
let demoServer
let temporaryDirectory
let interrupted
const forceKillTimers = new WeakMap()

function stopProcessGroup(child, signal = 'SIGTERM') {
  if (!child?.pid) return
  try {
    process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

function terminateProcessGroup(child, signal = 'SIGTERM') {
  if (!child?.pid) return
  stopProcessGroup(child, signal)
  if (signal === 'SIGKILL' || child.exitCode !== null || child.signalCode !== null || forceKillTimers.has(child)) return
  const timer = setTimeout(() => stopProcessGroup(child, 'SIGKILL'), 5000)
  timer.unref()
  forceKillTimers.set(child, timer)
  child.once('close', () => {
    clearTimeout(timer)
    forceKillTimers.delete(child)
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = signal
    terminateProcessGroup(activeCommand, signal)
    terminateProcessGroup(demoServer, signal)
  })
}

function ensureNotInterrupted() {
  if (interrupted) throw new Error(`Interrupted by ${interrupted}`)
}

async function run(command, arguments_, { capture = false, env = process.env, timeoutMs = 0, trim = true } = {}) {
  ensureNotInterrupted()
  console.log(`\n> ${command} ${arguments_.join(' ')}`)
  const child = spawn(command, arguments_, {
    cwd: root,
    env,
    detached: process.platform !== 'win32',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  activeCommand = child
  let stdout = ''
  let stderr = ''
  let timedOut = false
  if (capture) {
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
  }
  const timeout = timeoutMs && setTimeout(() => {
    timedOut = true
    terminateProcessGroup(child)
  }, timeoutMs)
  try {
    const { code, signal } = await new Promise((resolveResult, reject) => {
      child.once('error', reject)
      child.once('close', (exitCode, exitSignal) => resolveResult({ code: exitCode, signal: exitSignal }))
    })
    if (timedOut) throw new Error(`${command} ${arguments_.join(' ')} timed out`)
    if (code !== 0) {
      throw new Error(`${command} ${arguments_.join(' ')} failed (${signal ?? `exit ${code}`})${stderr ? `: ${stderr.trim()}` : ''}`)
    }
    return trim ? stdout.trim() : stdout
  } finally {
    if (timeout) clearTimeout(timeout)
    if (activeCommand === child) activeCommand = undefined
  }
}

const runPnpm = (arguments_, options) => run(pnpm, arguments_, options)
const runGit = (arguments_, options) => run('git', arguments_, { capture: true, ...options })

async function validateReleaseMetadata() {
  const nodeMajor = Number(process.versions.node.split('.')[0])
  assert.equal(nodeMajor, 24, 'Use Node 24 for release checks (for example: nvm use 24)')

  const workspace = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))
  assert.equal(workspace.private, true, 'The demo workspace must stay private')
  assert.equal(manifest.name, packageName)
  assert.equal(manifest.license, 'BSD-3-Clause')
  assert.equal(manifest.publishConfig?.access, 'public')
  assert.equal(manifest.scripts?.prepublishOnly, 'node ../../scripts/release-check.mjs --publish-lifecycle')
  const expectedPnpm = workspace.packageManager?.match(/^pnpm@(.+)$/)?.[1]
  assert.ok(expectedPnpm, 'The workspace must pin pnpm')
  assert.equal(await runPnpm(['--version'], { capture: true }), expectedPnpm, `Use pnpm ${expectedPnpm}`)

  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    if (await readFile(join(root, file), 'utf8') !== await readFile(join(packageDirectory, file), 'utf8')) {
      if (publishLifecycle) throw new Error(`${file} differs between the workspace and package; review the generated package copy before publishing`)
      console.log(`${file} differs between the workspace and package. Prepack will sync it; review the generated copy and rerun this check.`)
    }
  }
  const changelog = await readFile(join(root, 'CHANGELOG.md'), 'utf8')
  const firstSection = changelog.match(/^## (.+)$/m)?.[1]
  const firstRelease = firstSection?.match(/^\[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/)
  assert.equal(firstRelease?.[1], manifest.version, `The first dated CHANGELOG entry must be ${manifest.version}`)
  assert.equal(new Date(`${firstRelease[2]}T00:00:00.000Z`).toISOString().slice(0, 10), firstRelease[2], 'Invalid release date in CHANGELOG')
  console.log(`Release candidate: ${manifest.name}@${manifest.version} (${firstRelease[2]})`)
  return manifest
}

async function ensureVersionIsAvailable(manifest) {
  const output = await runPnpm(['view', packageName, 'versions', '--json'], { capture: true, timeoutMs: 60000 })
  const published = JSON.parse(output)
  const versions = Array.isArray(published) ? published : [published]
  assert.ok(versions.every(version => typeof version === 'string'), 'Unexpected npm version listing')
  assert.ok(!versions.includes(manifest.version), `${packageName}@${manifest.version} is already published; bump and review a new version`)
}

async function findAvailablePort() {
  const server = createServer()
  await new Promise((resolveListening, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListening)
  })
  const { port } = server.address()
  await new Promise((resolveClosed, reject) => server.close(error => error ? reject(error) : resolveClosed()))
  return port
}

async function startDemoServer(logPath) {
  const port = await findAvailablePort()
  const logFile = openSync(logPath, 'w')
  try {
    demoServer = spawn(pnpm, ['start', '--port', String(port), '--hostname', '127.0.0.1'], {
      cwd: root,
      detached: process.platform !== 'win32',
      stdio: ['ignore', logFile, logFile],
      env: { ...process.env, PORT: String(port) },
    })
  } finally {
    closeSync(logFile)
  }
  let startError
  demoServer.once('error', error => { startError = error })
  const url = `http://127.0.0.1:${port}`
  console.log(`\n> pnpm start --port ${port} --hostname 127.0.0.1`)
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    ensureNotInterrupted()
    if (startError) throw new Error(`Could not start the demo server: ${startError.message}`)
    if (demoServer.exitCode !== null || demoServer.signalCode !== null) {
      throw new Error(`Demo server exited before it became ready; log: ${logPath}`)
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return url
    } catch {
      // The production server may still be starting.
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 500))
  }
  throw new Error(`Demo server did not become ready within 60 seconds; log: ${logPath}`)
}

async function stopDemoServer() {
  if (!demoServer) return
  const child = demoServer
  demoServer = undefined
  terminateProcessGroup(child)
  if (child.exitCode !== null || child.signalCode !== null) return
  let timer
  const stopped = await Promise.race([
    new Promise(resolveStopped => child.once('close', () => resolveStopped(true))),
    new Promise(resolveTimedOut => { timer = setTimeout(() => resolveTimedOut(false), 6000) }),
  ])
  clearTimeout(timer)
  if (!stopped) stopProcessGroup(child, 'SIGKILL')
}

async function inspectTarball(manifest, destination) {
  const tarballs = (await readdir(destination)).filter(file => file.endsWith('.tgz'))
  assert.equal(tarballs.length, 1, 'Expected exactly one library tarball')
  const tarball = join(destination, tarballs[0])
  const listing = await run('tar', ['-tzf', tarball], { capture: true })
  const paths = listing.split('\n').map(path => {
    assert.ok(path.startsWith('package/'), `Unexpected tarball path: ${path}`)
    return path.slice('package/'.length)
  })
  const permittedTopLevel = new Set(['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md'])
  assert.ok(paths.every(path => path.startsWith('dist/') || permittedTopLevel.has(path)), 'The tarball contains files outside dist and public package metadata')

  const packedManifest = JSON.parse(await run('tar', ['-xOzf', tarball, 'package/package.json'], { capture: true }))
  assert.equal(packedManifest.name, manifest.name)
  assert.equal(packedManifest.version, manifest.version)
  assert.equal(packedManifest.license, 'BSD-3-Clause')
  assert.equal(packedManifest.private, undefined, 'The library tarball must be publishable')
  assert.equal(packedManifest.dependencies?.[packageName], undefined, 'The library cannot depend on itself')
  assert.deepEqual(packedManifest.exports, manifest.exports, 'The tarball exports differ from the reviewed manifest')

  const exportTargets = new Set([manifest.main, manifest.types])
  function addExportTargets(value) {
    if (typeof value === 'string') exportTargets.add(value)
    else for (const nested of Object.values(value)) addExportTargets(nested)
  }
  addExportTargets(manifest.exports)
  for (const target of exportTargets) {
    assert.ok(target.startsWith('./'), `Unexpected export target: ${target}`)
    assert.ok(paths.includes(target.slice(2)), `Missing packed export: ${target}`)
  }
  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    assert.ok(paths.includes(file), `Missing ${file} in the tarball`)
    const rootFile = await readFile(join(root, file), 'utf8')
    const packed = await run('tar', ['-xOzf', tarball, `package/${file}`], { capture: true, trim: false })
    assert.equal(packed, rootFile, `Packed ${file} differs from the reviewed root file`)
    assert.equal(await readFile(join(packageDirectory, file), 'utf8'), rootFile, `The package copy of ${file} differs from the reviewed root file`)
  }
  console.log(`Inspected ${tarballs[0]}: ${paths.length} files and ${exportTargets.size} export targets`)
}

async function main() {
  const manifest = await validateReleaseMetadata()
  const initialBranch = await runGit(['branch', '--show-current'])
  const initialStatus = await runGit(['status', '--porcelain=v1', '--untracked-files=all'])
  const initialDiff = await runGit(['diff', '--binary', 'HEAD'])
  if (publishLifecycle) {
    assert.equal(initialBranch, 'main', 'Publish from the reviewed main branch')
    assert.equal(initialStatus, '', 'Publish from a clean checkout; commit and review generated files first')
  }
  await ensureVersionIsAvailable(manifest)

  await runPnpm(['install', '--frozen-lockfile'])
  await runPnpm(['build:package'])
  await runPnpm(['typecheck'])
  await runPnpm(['lint'])
  await runPnpm(['test'])
  await runPnpm(['exec', 'playwright', 'install', 'chromium'])
  await runPnpm(['verify:consumer'])
  await runPnpm(['build'])

  temporaryDirectory = await mkdtemp(join(tmpdir(), 'brain-release-'))
  try {
    const url = await startDemoServer(join(temporaryDirectory, 'demo-server.log'))
    await runPnpm(['test:browser'], { env: { ...process.env, BRAIN_TEST_URL: url } })
  } finally {
    await stopDemoServer()
  }

  await runPnpm(['--filter', packageName, 'pack', '--pack-destination', temporaryDirectory])
  await inspectTarball(manifest, temporaryDirectory)
  await runGit(['diff', 'HEAD', '--check'], { capture: false })
  assert.equal(await runGit(['status', '--porcelain=v1', '--untracked-files=all']), initialStatus, 'Release checks changed repository files; review and commit generated output, then rerun')
  assert.equal(await runGit(['diff', '--binary', 'HEAD']), initialDiff, 'Release checks changed tracked content; review and commit generated output, then rerun')

  if (publishLifecycle) {
    console.log(`\nAll release checks passed for ${manifest.name}@${manifest.version}. The active pnpm publish will continue.`)
  } else {
    console.log(`\nAll release checks passed for ${manifest.name}@${manifest.version}.`)
    console.log('After the release PR is reviewed and merged, confirm PR and main CI passed, then rerun pnpm release:check from a clean main checkout.')
    console.log(`Publish with: ${publishCommand}`)
  }
}

let passed = false
try {
  await main()
  passed = true
} catch (error) {
  console.error(`\nRelease check failed: ${error.message}`)
  if (temporaryDirectory) console.error(`Diagnostic files: ${temporaryDirectory}`)
  process.exitCode = interrupted === 'SIGINT' ? 130 : interrupted === 'SIGTERM' ? 143 : 1
} finally {
  await stopDemoServer()
  if (passed && temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
}
