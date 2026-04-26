import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    plugins: {
      'feature-sliced': fsdPlugin,
    },
    rules: {
      'feature-sliced/layers-slices': 'error',     // Prevents importing from upper layers
      'feature-sliced/absolute-relative': 'error', // Enforces aliases for cross-layer imports
      'feature-sliced/public-api': 'error',        // Enforces importing only from index.ts files
    },
  },
])
