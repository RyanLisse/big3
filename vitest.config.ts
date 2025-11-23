import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: {
      console: 'readonly',
        process: 'readonly'
    },
    environment: 'node',
    include: [
      'test/**/*.{test,spec}.{js,ts}',
      'backend/test/**/*.{test,spec}.{js,ts}',
      'backend/agent/**/*.test.{js,ts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{js,ts}',
        'backend/agent/**/*.{js,ts}'
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.config.*',
        '**/node_modules/**'
      ]
    }
  }
});
