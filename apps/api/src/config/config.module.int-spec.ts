import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
import { appConfig } from './app.config.js';
import { authConfig } from './auth.config.js';
import { AppConfigModule } from './config.module.js';
import { databaseConfig } from './database.config.js';
import { mailConfig } from './mail.config.js';

const REQUIRED_VARIABLES = [
  'DATABASE_URL',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'SMTP_URL',
  'MAIL_FROM',
];

// As variáveis válidas já estão no ambiente, carregadas do `.env` pela base de
// testes. Cada teste tira ou estraga uma delas. O arquivo `.env` é ignorado
// aqui para que a variável removida falte de verdade, como faltaria em produção.
function boot(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppConfigModule.forRoot({ ignoreEnvFile: true })],
  }).compile();
}

/** A mensagem de erro da subida, quando ela aponta a variável. */
function invalid(variable: string): RegExp {
  return new RegExp(`Config validation error: [^]*"${variable}"`);
}

describe('Variáveis de ambiente na subida', () => {
  it('entrega as variáveis válidas já convertidas e agrupadas por assunto', async () => {
    vi.stubEnv('PORT', '4321');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@postgres:5432/db');
    vi.stubEnv('SMTP_URL', 'smtp://mailpit:1025');
    vi.stubEnv('MAIL_FROM', 'Remetente <remetente@example.com>');

    const moduleRef = await boot();

    expect(moduleRef.get(appConfig.KEY)).toEqual({ port: 4321 });
    expect(moduleRef.get(databaseConfig.KEY)).toEqual({
      url: 'postgresql://user:pass@postgres:5432/db',
      connectTimeoutMs: 10_000,
    });
    expect(moduleRef.get(mailConfig.KEY)).toEqual({
      smtpUrl: 'smtp://mailpit:1025',
      from: 'Remetente <remetente@example.com>',
      timeoutMs: 10_000,
    });
    const auth = moduleRef.get(authConfig.KEY);
    expect(auth.jwtPrivateKey).toContain('-----BEGIN PRIVATE KEY-----');
    expect(auth.jwtPublicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('usa a porta 3000 quando PORT não é definida', async () => {
    vi.stubEnv('PORT', undefined);

    const moduleRef = await boot();

    expect(moduleRef.get(appConfig.KEY).port).toBe(3000);
  });

  it.each(REQUIRED_VARIABLES)(
    'não sobe sem %s, e o erro diz qual variável falta',
    async (variable) => {
      vi.stubEnv(variable, undefined);

      await expect(boot()).rejects.toThrow(`"${variable}" is required`);
    },
  );

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['DATABASE_URL', 'mysql://user:pass@mysql:3306/db'],
    ['SMTP_URL', 'mailpit:1025'],
    ['MAIL_FROM', ''],
    ['MAIL_FROM', 'Gerenciador de Arquivos'],
    ['MAIL_FROM', 'Nome <nao-responda@>'],
    ['DATABASE_CONNECT_TIMEOUT_MS', '0'],
    ['DATABASE_CONNECT_TIMEOUT_MS', 'logo'],
    ['SMTP_TIMEOUT_MS', '0'],
    ['SMTP_TIMEOUT_MS', 'logo'],
    ['JWT_PRIVATE_KEY', 'não é uma chave'],
    ['JWT_PUBLIC_KEY', 'não é uma chave'],
  ])(
    'não sobe com %s inválida (%j), e o erro diz qual é a variável',
    async (variable, value) => {
      vi.stubEnv(variable, value);

      await expect(boot()).rejects.toThrow(invalid(variable));
    },
  );

  it('aceita MAIL_FROM só com o endereço, sem o nome', async () => {
    vi.stubEnv('MAIL_FROM', 'nao-responda@example.com');

    const moduleRef = await boot();

    expect(moduleRef.get(mailConfig.KEY).from).toBe('nao-responda@example.com');
  });

  it('aponta todas as variáveis com problema de uma vez', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    vi.stubEnv('SMTP_URL', undefined);

    const failure = boot();

    await expect(failure).rejects.toThrow('"DATABASE_URL" is required');
    await expect(failure).rejects.toThrow('"SMTP_URL" is required');
  });

  it('não expõe o valor de uma chave do JWT inválida na mensagem de erro', async () => {
    vi.stubEnv('JWT_PRIVATE_KEY', 'valor-secreto-que-nao-e-pem');

    await expect(boot()).rejects.not.toThrow('valor-secreto-que-nao-e-pem');
  });

  describe('chaves do JWT', () => {
    it('aceita um par RSA no formato PKCS#1', async () => {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      });
      vi.stubEnv('JWT_PRIVATE_KEY', privateKey);
      vi.stubEnv('JWT_PUBLIC_KEY', publicKey);

      const moduleRef = await boot();

      expect(moduleRef.get(authConfig.KEY)).toEqual({
        jwtPrivateKey: privateKey,
        jwtPublicKey: publicKey,
      });
    });

    it.each([
      ['JWT_PRIVATE_KEY', 'PRIVATE KEY'],
      ['JWT_PUBLIC_KEY', 'PUBLIC KEY'],
    ])(
      'recusa %s com cara de PEM e conteúdo que não é uma chave',
      async (variable, label) => {
        vi.stubEnv(
          variable,
          `-----BEGIN ${label}-----\nbmFvIGUgdW1hIGNoYXZl\n-----END ${label}-----`,
        );

        await expect(boot()).rejects.toThrow(invalid(variable));
      },
    );

    it('recusa um par que não é RSA, porque o token é assinado com RS256', async () => {
      const { privateKey, publicKey } = generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      vi.stubEnv('JWT_PRIVATE_KEY', privateKey);
      vi.stubEnv('JWT_PUBLIC_KEY', publicKey);

      const failure = boot();

      await expect(failure).rejects.toThrow(/"JWT_PRIVATE_KEY"/);
      await expect(failure).rejects.toThrow(/"JWT_PUBLIC_KEY"/);
    });

    it('recusa uma chave pública que não é o par da privada', async () => {
      const other = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      vi.stubEnv('JWT_PUBLIC_KEY', other.publicKey);

      await expect(boot()).rejects.toThrow(invalid('JWT_PUBLIC_KEY'));
    });

    it('recusa a chave privada no lugar da pública', async () => {
      vi.stubEnv('JWT_PUBLIC_KEY', process.env.JWT_PRIVATE_KEY);

      await expect(boot()).rejects.toThrow(/"JWT_PUBLIC_KEY"/);
    });
  });

  it('impede a aplicação inteira de subir', async () => {
    vi.stubEnv('SMTP_URL', 'mailpit:1025');
    // O `AppModule` lê o ambiente quando é importado, então é importado de novo.
    vi.resetModules();
    const { AppModule } = await import('../app.module.js');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow(invalid('SMTP_URL'));
  });
});
