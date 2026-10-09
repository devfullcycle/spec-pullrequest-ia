import { defineConfig, mergeConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/** O que as três suítes têm em comum. Cada uma só acrescenta o próprio `include`. */
export const baseConfig = defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    // Desfaz sozinho, depois de cada teste, o que ele trocou com `vi.stubEnv`.
    unstubEnvs: true,
  },
});

/** Base das suítes que falam com o banco de testes e com o Mailpit. */
export const realDependenciesConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      globalSetup: ['./test/support/global-setup.ts'],
      setupFiles: ['./test/support/setup.ts'],
      // Os arquivos dividem o mesmo banco de testes, então rodam um por vez.
      fileParallelism: false,
    },
  }),
);
