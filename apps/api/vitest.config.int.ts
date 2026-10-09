import { defineConfig, mergeConfig } from 'vitest/config';
import { realDependenciesConfig } from './vitest.shared.js';

// Suíte de integração: `*.int-spec.ts`, ao lado do código, contra as dependências reais.
export default mergeConfig(
  realDependenciesConfig,
  defineConfig({ test: { include: ['src/**/*.int-spec.ts'] } }),
);
