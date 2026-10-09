import { Env, envSchema } from './env.schema.js';

/**
 * As variáveis de ambiente, validadas e convertidas pelo schema: os números
 * saem como número, e os valores padrão já vêm aplicados. É daqui que as
 * configurações por assunto leem, e nunca de `process.env` direto.
 *
 * A validação roda de novo a cada leitura, e não só na subida do
 * `ConfigModule`. Assim um valor trocado depois, como num teste que encurta um
 * prazo, também passa pelo schema antes de chegar ao código.
 */
export function validatedEnv(): Env {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value;
}
