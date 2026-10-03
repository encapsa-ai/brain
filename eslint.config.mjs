import js from '@eslint/js'
import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['node_modules/**', '.next/**', '**/dist/**', 'examples/**/node_modules/**', 'user_read_only_context/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx,js,mjs}'], languageOptions: { globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', globalThis: 'readonly', URL: 'readonly', performance: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', AbortController: 'readonly', ResizeObserver: 'readonly', IntersectionObserver: 'readonly', MutationObserver: 'readonly' } }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }], '@typescript-eslint/no-explicit-any': 'error', 'no-undef': 'off', 'no-empty': ['error', { allowEmptyCatch: true }], 'prefer-const': 'error' } }
)
