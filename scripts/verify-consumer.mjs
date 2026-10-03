import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = mkdtempSync(join(tmpdir(), 'brain-consumers-'))
const packageDir = join(root, 'packages/brain')
const workspaceManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: 'inherit', timeout: 300000 })
run('pnpm', ['--filter', '@encapsa-dev/brain', 'pack', '--pack-destination', sandbox])
const tarball = join(sandbox, readdirSync(sandbox).find(file => file.endsWith('.tgz')))
const paths = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n').map(path => {
  assert.ok(path.startsWith('package/'), `Unexpected tarball path: ${path}`)
  return path.slice('package/'.length)
})
for (const path of ['dist/styles.css', 'dist/index.js', 'dist/core/index.d.ts', 'dist/react/index.d.ts', 'LICENSE', 'README.md', 'CHANGELOG.md']) assert.ok(paths.includes(path), `Missing ${path}`)
assert.ok(!paths.some(path => /(?:^src\/|fixture|\.map$|\.env|node_modules|tests\/|^app\/)/.test(path)), 'Unexpected material in tarball')
const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const packedPackageJson = JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' }))
assert.equal(packedPackageJson.name, packageJson.name)
assert.equal(packedPackageJson.version, packageJson.version)
assert.equal(packageJson.license, 'BSD-3-Clause')
assert.ok(!packageJson.dependencies?.['@encapsa-dev/brain'], 'Self dependency')
assert.equal(workspaceManifest.private, true)
assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), readFileSync(join(packageDir, 'README.md'), 'utf8'))

const matrix = [
  { name: 'react18-svg', react: '18.3.1', types: '^18.3.1' },
  { name: 'react19-svg', react: '19.2.4', types: '^19.2.0' },
  { name: 'react18-webgl', react: '18.3.1', types: '^18.3.1', fiber: '8.18.0' },
  { name: 'react19-webgl', react: '19.2.4', types: '^19.2.0', fiber: '9.8.1' },
]
const results = []
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
try {
  for (const entry of matrix) {
    const consumer = join(sandbox, entry.name)
    cpSync(join(root, 'examples/vite-react'), consumer, { recursive: true, filter: path => !path.includes('node_modules') && !path.includes('/dist') && !path.endsWith('pnpm-lock.yaml') })
    const manifest = JSON.parse(readFileSync(join(consumer, 'package.json'), 'utf8'))
    manifest.packageManager = workspaceManifest.packageManager
    manifest.dependencies = { '@encapsa-dev/brain': `file:${tarball}`, react: entry.react, 'react-dom': entry.react, ...(entry.fiber ? { three: '0.186.1', '@react-three/fiber': entry.fiber } : {}) }
    manifest.devDependencies['@types/react'] = entry.types
    manifest.devDependencies['@types/react-dom'] = entry.react.startsWith('18') ? '^18.3.0' : '^19.2.0'
    if (entry.fiber) manifest.devDependencies['@types/three'] = '0.185.0'
    writeFileSync(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2))
    writeFileSync(join(consumer, 'src/main.tsx'), `
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrainExplorer, BrainPreview } from '@encapsa-dev/brain'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'
${entry.fiber ? "const loadWebGLRenderer = () => import('@encapsa-dev/brain/webgl')" : ''}
const graph: BrainGraph = {schemaVersion:'1',scopeKey:'consumer',revision:'r1',completeness:'complete',nodes:[
{id:'a',kind:'page',label:'Architecture',sourceNamespace:'test'},
{id:'b',kind:'skill',label:'Review',sourceNamespace:'test'}
],edges:[{id:'ab',source:'a',target:'b',kind:'references',directed:true,evidence:{origin:'synthetic'}}]}
function App() {
  const [expanded, setExpanded] = useState(false)
  return <main><h1>Packaged ${entry.name} consumer</h1>
    <BrainPreview graph={graph} onExpand={() => setExpanded(true)} style={{width:208,height:168}} />
    {expanded && <div style={{height:600}}><BrainExplorer graph={graph} variant="embedded" showContextTray={false} renderer="${entry.fiber ? 'auto' : 'svg'}"
      ${entry.fiber ? 'loadWebGLRenderer={loadWebGLRenderer}' : ''} /></div>}
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
`)
    run('pnpm', ['install', '--ignore-workspace', '--config.auto-install-peers=false', '--config.strict-peer-dependencies=true'], consumer)
    if (!entry.fiber) for (const dependency of ['three', '@react-three/fiber', '@types/three']) assert.ok(!existsSync(join(consumer, 'node_modules', dependency)), 'Optional graphics package installed')
    run('pnpm', ['build'], consumer)
    const proof = `import assert from 'node:assert/strict'; import React from 'react'; import { renderToString } from 'react-dom/server'; import { validateGraph } from '@encapsa-dev/brain/core'; import { BrainExplorer } from '@encapsa-dev/brain/react'; import { normalizeForgeGenerationReceipt } from '@encapsa-dev/brain/adapters/forge'; assert.equal(typeof window,'undefined'); const graph={schemaVersion:'1',scopeKey:'test',revision:'r1',completeness:'complete',nodes:[],edges:[]}; assert.deepEqual(validateGraph(graph),[]); assert.equal(typeof normalizeForgeGenerationReceipt,'function'); assert.ok(renderToString(React.createElement(BrainExplorer,{graph,renderer:'svg'})).includes('Brain Explorer'));`
    writeFileSync(join(consumer, 'ssr-proof.mjs'), proof)
    run('node', ['ssr-proof.mjs'], consumer)
    const dist = join(consumer, 'dist')
    const server = createServer((req, res) => {
      const pathname = new URL(req.url, 'http://localhost').pathname
      const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
      if (!file.startsWith(`${dist}/`) || !existsSync(file)) { res.writeHead(404).end(); return }
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[extname(file)] ?? 'application/octet-stream')
      res.end(readFileSync(file))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}`)
      await page.getByRole('button', { name: 'Expand brain', exact: true }).click()
      await page.locator('.brain-embedded[data-ready=true]').waitFor()
      await page.locator(`.brain-embedded .brain-viewport[data-active-renderer=${entry.fiber ? 'webgl' : 'svg'}]`).waitFor({ timeout: 20000 })
      await page.getByRole('textbox', { name: 'Search loaded context', exact: true }).fill('Architecture')
      await page.keyboard.press('Enter')
      await page.getByRole('heading', { name: 'Architecture', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Rotate right', exact: true }).click()
      assert.deepEqual(errors, [], 'Browser runtime errors')
      results.push({ ...entry, build: 'passed', ssr: 'passed', browserSelectionAndRotation: 'passed', optionalGraphicsInstalled: !!entry.fiber })
    } finally {
      await page.close()
      await new Promise(resolve => server.close(resolve))
    }
  }
} finally {
  await browser.close()
}
mkdirSync(join(root, '.consumer-proof'), { recursive: true })
writeFileSync(join(root, '.consumer-proof/results.json'), JSON.stringify({ version: packageJson.version, node: process.version, packageFiles: paths, matrix: results }, null, 2))
console.log(`Packed consumer matrix passed: ${results.map(result => result.name).join(', ')}`)
