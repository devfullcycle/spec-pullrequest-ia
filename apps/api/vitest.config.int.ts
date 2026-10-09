import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Suíte de integração: `*.int-spec.ts`, ao lado do código, contra as dependências reais.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.int-spec.ts'],
    globalSetup: ['./test/support/global-setup.ts'],
    setupFiles: ['./test/support/setup.ts'],
    // Os arquivos dividem o mesmo banco de testes, então rodam um por vez.
    fileParallelism: false,
  },
});
