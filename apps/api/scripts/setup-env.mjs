// Prepara o `.env` do ambiente local na subida do contêiner da API.
//
// 1. Se o `.env` não existe, ele nasce como cópia do `.env.example`.
// 2. Se faltam as chaves do JWT, um par RS256 é gerado e gravado no `.env`.
//
// O script pode rodar quantas vezes for: ele nunca troca um valor que já existe.
import { generateKeyPairSync } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const envPath = new URL('../.env', import.meta.url);
const examplePath = new URL('../.env.example', import.meta.url);

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('setup-env: .env criado a partir do .env.example');
}

const current = parseEnv(readFileSync(envPath, 'utf8'));

if (!current.JWT_PRIVATE_KEY || !current.JWT_PUBLIC_KEY) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  appendFileSync(
    envPath,
    [
      '',
      '# Par de chaves RS256 do JWT, gerado por scripts/setup-env.mjs. Só vale para o ambiente local.',
      `JWT_PRIVATE_KEY="${privateKey.trim()}"`,
      `JWT_PUBLIC_KEY="${publicKey.trim()}"`,
      '',
    ].join('\n'),
  );
  console.log('setup-env: chaves do JWT geradas e gravadas no .env');
}
