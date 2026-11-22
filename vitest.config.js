import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // Compile JSX like Next.js does (no React import needed).
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
