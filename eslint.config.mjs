import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      '.ultra.cache.json',
      'tmp/**',
      'test-results/**',
      'playwright-report/**',
      '.encore/**',
      '*.tsbuildinfo'
    ]
  },
  {
    files: ['src/**/*.{js,ts,mjs}', 'test/**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
      'prefer-const': 'error'
    }
  }
];