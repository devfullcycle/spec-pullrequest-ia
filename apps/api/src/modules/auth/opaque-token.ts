import { createHash, randomBytes } from 'node:crypto';

/*
 * Tokens opacos da autenticação: o de renovação e os enviados por e-mail. O
 * banco só guarda o hash, e o valor existe apenas com quem o recebeu.
 */

/** Um token novo, de 256 bits, em base64url. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** O SHA-256 do token, que é o que vai para o banco. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
