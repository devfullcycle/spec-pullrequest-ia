import Joi from 'joi';

// A mensagem padrão do Joi para `pattern` traz o valor recusado. Numa chave, isso
// levaria o segredo para o log, então a mensagem é trocada.
const pem = (label: 'PRIVATE KEY' | 'PUBLIC KEY') =>
  Joi.string()
    .pattern(new RegExp(`-----BEGIN ${label}-----[^]+-----END ${label}-----`))
    .messages({
      'string.pattern.base': `{{#label}} must be a PEM-encoded ${label.toLowerCase()}`,
    });

/**
 * Todas as variáveis de ambiente da API, com tipo, obrigatoriedade e valor
 * padrão. Os padrões são os de produção. A lista comentada está na seção 6 do
 * docs/lld.md.
 */
export const envSchema = Joi.object({
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_PRIVATE_KEY: pem('PRIVATE KEY').required(),
  JWT_PUBLIC_KEY: pem('PUBLIC KEY').required(),

  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .required(),
  MAIL_FROM: Joi.string().required(),
});
