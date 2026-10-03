import { defineConfig } from 'tsup'

const external = ['react', 'react-dom', 'react/jsx-runtime', 'three', '@react-three/fiber']
export default defineConfig([
  {
    entry: { 'core/index': 'src/core/index.ts', 'adapters/forge/index': 'src/adapters/forge/index.ts', 'layout.worker': 'src/layout/layout.worker.ts' },
    format: ['esm'], target: 'es2022', dts: true, splitting: false, sourcemap: false, external,
  },
  {
    entry: { index: 'src/index.ts', 'react/index': 'src/react/index.ts', 'webgl/index': 'src/renderers/webgl/index.tsx' },
    format: ['esm'], target: 'es2022', dts: true, splitting: true, sourcemap: false, external,
    banner: { js: '"use client";' },
  },
])
