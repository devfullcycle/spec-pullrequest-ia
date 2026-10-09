import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Suíte de unidade: `*.spec.ts`, ao lado do código. Não usa banco nem e-mail.
export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    // A suíte pode ficar sem nenhum teste e, mesmo assim, tem de passar.
    passWithNoTests: true,
  },
});
