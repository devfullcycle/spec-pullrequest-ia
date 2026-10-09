import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { EmailTokenType } from './email-token-type.js';
import { EmailTokensRepository } from './email-tokens.repository.js';
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
   * Gasta o token e devolve o id do Usuário dele, ou `null` se o token não
   * existe, expirou ou já foi usado.
   */
  use(token: string, type: EmailTokenType): Promise<string | null> {
    return this.tokens.use(hashOpaqueToken(token), type, new Date());
  }

  /**
   * Devolve um token gasto por `use` quando o que ele autorizava não pôde ser
   * concluído, para a pessoa poder abrir o mesmo link de novo.
   */
  release(token: string, type: EmailTokenType): Promise<void> {
    return this.tokens.release(hashOpaqueToken(token), type);
  }
}
