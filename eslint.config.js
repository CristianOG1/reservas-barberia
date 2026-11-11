import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `tests/coverage` es el reporte generado por `pnpm test:coverage`: no es
  // codigo del proyecto y no se versiona.
  globalIgnores(['dist', '.agents', 'tests/coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Las pruebas y los archivos de configuracion de Vitest corren en Node:
    // necesitan `process` y el resto de variables de Node. El resto (describe,
    // it, expect, vi) se importan de 'vitest' en cada archivo, asi que no hace
    // falta declararlas como globales.
    files: ['tests/**/*.{js,jsx}', 'vitest.config.js', 'vitest.integration.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
])
