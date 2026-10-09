import Joi from 'joi';
import { createPrivateKey, createPublicKey } from 'node:crypto';

/** As variáveis de ambiente da API depois de validadas e convertidas. */
export interface Env {
  PORT: number;
  DATABASE_URL: string;
  DATABASE_CONNECT_TIMEOUT_MS: number;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  SMTP_URL: string;
  MAIL_FROM: string;
  SMTP_TIMEOUT_MS: number;
  SMTP_IDLE_TIMEOUT_MS: number;
  WEB_ORIGIN: string;
  EMAIL_VERIFICATION_TTL_SECONDS: number;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
}

/**
 * Chave RSA em PEM (PKCS#8, SPKI ou PKCS#1), conferida pelo mesmo leitor que vai
 * usá-la para assinar. A mensagem de erro é fixa, e nunca repete o valor
 * recusado, para o segredo não ir parar no log.
 */
const rsaKey = (kind: 'private' | 'public') =>
  Joi.string()
    .custom((value: string, helpers) => {
      try {
        // `createPublicKey` aceita uma chave privada e deriva a pública dela.
        if (kind === 'public' && value.includes('PRIVATE KEY')) {
          return helpers.error('rsaKey.invalid');
        }
        const key =
          kind === 'private' ? createPrivateKey(value) : createPublicKey(value);
        if (key.asymmetricKeyType !== 'rsa') {
          return helpers.error('rsaKey.invalid');
        }
      } catch {
        return helpers.error('rsaKey.invalid');
      }
      return value;
    })
    .messages({
      'rsaKey.invalid': `{{#label}} must be a PEM-encoded RSA ${kind} key`,
    });

/** Remetente dos e-mails: o endereço sozinho ou no formato `Nome <endereço>`. */
const mailSender = Joi.string()
  .custom((value: string, helpers) => {
    const address = /^[^<>]*<([^<>]*)>$/.exec(value.trim())?.[1] ?? value;
    // O domínio do ambiente local (`.local`) não é um TLD registrado.
    const { error } = Joi.string()
      .email({ tlds: { allow: false } })
      .validate(address.trim());
    return error ? helpers.error('mailSender.invalid') : value;
  })
  .messages({
    'mailSender.invalid':
      '{{#label}} must be an e-mail address, alone or as "Name <address>"',
  });

/** Origem do frontend: esquema, host e porta, sem caminho (`https://app.exemplo.com`). */
const webOrigin = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .custom((value: string, helpers) =>
    new URL(value).origin === value
      ? value
      : helpers.error('webOrigin.invalid'),
  )
  .messages({
    'webOrigin.invalid':
      '{{#label}} must be an origin, without path or trailing slash',
  });

/**
 * Confere que as duas chaves do JWT formam um par: a pública derivada da
 * privada tem de ser a que foi configurada. Sem isso, uma troca de chave pela
 * metade deixaria a API assinando tokens que ela mesma recusa.
 */
function matchingJwtKeys(env: Env, helpers: Joi.CustomHelpers<Env>) {
  const toDer = (pem: string) =>
    createPublicKey(pem).export({ type: 'spki', format: 'der' });
  try {
    if (!toDer(env.JWT_PRIVATE_KEY).equals(toDer(env.JWT_PUBLIC_KEY))) {
      return helpers.error('jwtKeys.mismatch');
    }
  } catch {
    // Uma chave ausente ou ilegível já foi apontada pela regra da própria variável.
  }
  return env;
}

/**
 * Todas as variáveis de ambiente da API, com tipo, obrigatoriedade e valor
 * padrão. Os padrões são os de produção. A lista comentada está na seção 6 do
 * docs/lld.md.
 */
export const envSchema = Joi.object<Env>({
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  DATABASE_CONNECT_TIMEOUT_MS: Joi.number().integer().min(1).default(10_000),

  JWT_PRIVATE_KEY: rsaKey('private').required(),
  JWT_PUBLIC_KEY: rsaKey('public').required(),

  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .required(),
  MAIL_FROM: mailSender.required(),
  SMTP_TIMEOUT_MS: Joi.number().integer().min(1).default(10_000),
  SMTP_IDLE_TIMEOUT_MS: Joi.number().integer().min(1).default(60_000),

  WEB_ORIGIN: webOrigin.required(),

  EMAIL_VERIFICATION_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(24 * 60 * 60),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(30 * 24 * 60 * 60),
})
  .custom(matchingJwtKeys)
  .messages({
    'jwtKeys.mismatch':
      '"JWT_PUBLIC_KEY" must be the public key of "JWT_PRIVATE_KEY"',
  });
