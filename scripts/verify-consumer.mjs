import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = mkdtempSync(join(tmpdir(), 'brain-package-proof-'))
const packageDir = join(root, 'packages/brain'), consumer = join(sandbox, 'consumer')
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: 'inherit', timeout: 180000 })
run('pnpm', ['--filter', '@encapsa-dev/brain', 'build'])
const dryRun = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageDir, encoding: 'utf8', timeout: 30000 })
const [{ files }] = JSON.parse(dryRun)
const paths = files.map(file => file.path)
if (!paths.includes('dist/styles.css') || !paths.includes('dist/core/index.d.ts') || !paths.includes('dist/react/index.d.ts')) throw new Error('Missing public CSS or declarations')
if (paths.some(path => /(?:^src\/|fixture|\.map$|\.env|node_modules|tests\/)/.test(path))) throw new Error('Unexpected source or private material in tarball')
run('npm', ['pack', '--ignore-scripts', '--pack-destination', sandbox], packageDir)
const tarball = join(sandbox, readdirSync(sandbox).find(file => file.endsWith('.tgz')))
cpSync(join(root, 'examples/vite-react'), consumer, { recursive: true, filter: path => !path.includes('node_modules') && !path.includes('/dist') && !path.endsWith('pnpm-lock.yaml') })
const manifest = JSON.parse(readFileSync(join(consumer, 'package.json'), 'utf8'))
manifest.dependencies['@encapsa-dev/brain'] = `file:${tarball}`
writeFileSync(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2))
run('pnpm', ['install', '--ignore-workspace', '--config.auto-install-peers=false', '--config.strict-peer-dependencies=false'], consumer)
for (const dependency of ['three', '@react-three/fiber', '@types/three']) if (existsSync(join(consumer, 'node_modules', dependency))) throw new Error('Optional graphics dependency unexpectedly installed')
run('pnpm', ['build'], consumer)
const proof = `import assert from 'node:assert/strict'; import React from 'react'; import { renderToString } from 'react-dom/server'; import { validateGraph } from '@encapsa-dev/brain/core'; import { BrainExplorer } from '@encapsa-dev/brain/react'; import { normalizeForgeGenerationReceipt } from '@encapsa-dev/brain/adapters/forge'; assert.equal(typeof window, 'undefined'); assert.equal(typeof document, 'undefined'); const graph={schemaVersion:'1',scopeKey:'test',revision:'r1',completeness:'complete',nodes:[],edges:[]}; assert.deepEqual(validateGraph(graph),[]); assert.equal(typeof normalizeForgeGenerationReceipt,'function'); const html=renderToString(React.createElement(BrainExplorer,{graph,renderer:'svg'})); assert.ok(html.includes('Brain Explorer')); assert.ok(!html.includes('<canvas')); console.log('Packed core/adapters/React SSR proof passed without optional graphics peers.');`
writeFileSync(join(consumer, 'ssr-proof.mjs'), proof)
run('node', ['ssr-proof.mjs'], consumer)
writeFileSync(join(root, 'docs/consumer-proof.json'), JSON.stringify({ consumer, tarball, packageFiles: paths, optionalGraphicsInstalled: false, viteBuild: 'passed', strictDeclarationsWithoutGraphicsTypes: 'passed', packedSsrImports: 'passed', node: process.version }, null, 2))
console.log(`Clean packed consumer verified at ${consumer}`)
