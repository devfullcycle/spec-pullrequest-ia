import Joi from 'joi';
import { createPrivateKey, createPublicKey } from 'node:crypto';

/** As variáveis de ambiente da API depois de validadas e convertidas. */
export interface Env {
  PORT: number;
  DATABASE_URL: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  SMTP_URL: string;
  MAIL_FROM: string;
  SMTP_TIMEOUT_MS: number;
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

  JWT_PRIVATE_KEY: rsaKey('private').required(),
  JWT_PUBLIC_KEY: rsaKey('public').required(),

  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .required(),
  MAIL_FROM: Joi.string().required(),
  SMTP_TIMEOUT_MS: Joi.number().integer().min(1).default(10_000),
});
