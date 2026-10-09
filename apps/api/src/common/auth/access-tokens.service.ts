import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * O token de acesso (seção 4.5 do docs/lld.md): um JWT com o id do Usuário em
 * `sub`, assinado com RS256. Só este service conhece o formato dele.
 */
@Injectable()
export class AccessTokensService {
  constructor(private readonly jwt: JwtService) {}

  sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  /**
   * Devolve o id do Usuário do token, ou `null` se a assinatura não confere, o
   * token expirou ou não é um token de acesso. Só a assinatura é conferida: o
   * banco não é consultado.
   */
  async verify(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
