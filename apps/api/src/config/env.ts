import { Env, envSchema } from './env.schema.js';

const SCHEMA_VARIABLES = Object.keys(envSchema.describe().keys as object);

let lastValidation: { fingerprint: string; value: Env } | undefined;

/**
 * As variáveis de ambiente, validadas e convertidas pelo schema: os números
 * saem como número, e os valores padrão já vêm aplicados. É daqui que as
 * configurações por assunto leem, e nunca de `process.env` direto.
 *
 * É também a função que o `ConfigModule` chama na subida. Toda leitura confere
 * os valores atuais: um valor trocado depois, como num teste que encurta um
 * prazo, passa pelo schema antes de chegar ao código. Enquanto nada muda, o
 * resultado da última validação é reaproveitado, para as chaves do JWT não
 * serem lidas de novo a cada configuração.
 */
export function validatedEnv(
  source: Record<string, unknown> = process.env,
): Env {
  const fingerprint = JSON.stringify(
    SCHEMA_VARIABLES.map((variable) => source[variable]),
  );
  if (lastValidation?.fingerprint === fingerprint) {
    return lastValidation.value;
  }

  const { error, value } = envSchema.validate(source, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  lastValidation = { fingerprint, value };
  return value;
}
