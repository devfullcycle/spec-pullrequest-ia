import { defineConfig, mergeConfig } from 'vitest/config';
import { realDependenciesConfig } from './vitest.shared.js';

// Suíte de ponta a ponta: `*.e2e-spec.ts`, em `test/`, pela porta HTTP da aplicação inteira.
export default mergeConfig(
  realDependenciesConfig,
  defineConfig({ test: { include: ['test/**/*.e2e-spec.ts'] } }),
);
