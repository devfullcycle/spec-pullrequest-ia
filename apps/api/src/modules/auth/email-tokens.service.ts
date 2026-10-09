import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { EmailTokenType } from './email-token-type.js';
import { EmailTokensRepository } from './email-tokens.repository.js';
import { InvalidTokenError } from './errors/invalid-token.error.js';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token.js';

/**
 * Tokens de uso único enviados por e-mail. O banco só guarda o hash: o valor
 * do token existe apenas no link que a pessoa recebe.
 */
@Injectable()
export class EmailTokensService {
  constructor(private readonly tokens: EmailTokensRepository) {}

  /**
   * Emite um token para o Usuário e invalida os anteriores do mesmo tipo.
   * Devolve o valor que vai no link.
   */
  async issue(
    userId: string,
    type: EmailTokenType,
    ttlSeconds: number,
  ): Promise<string> {
    const token = generateOpaqueToken();
    await this.tokens.replace({
      id: uuidv7(),
      userId,
      type,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    return token;
  }

  /**
   * Gasta o token e roda `effect`, o que ele autoriza, com o id do Usuário
   * dele. Um token que não existe, expirou ou já foi usado lança
   * `InvalidTokenError`. Se `effect` falha, o token é devolvido: sem isso, o
   * link deixaria de valer por uma falha que não é da pessoa. Se a devolução
   * também falhar, resta a ela pedir outro link.
   */
  async redeem<T>(
    token: string,
    type: EmailTokenType,
    effect: (userId: string) => Promise<T>,
  ): Promise<T> {
    const tokenHash = hashOpaqueToken(token);
    const userId = await this.tokens.use(tokenHash, type, new Date());
    if (!userId) {
      throw new InvalidTokenError();
    }
    try {
      return await effect(userId);
    } catch (error) {
      await this.tokens.release(tokenHash, type).catch(() => {});
      throw error;
    }
  }
}
