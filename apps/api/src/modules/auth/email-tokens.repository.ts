import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service.js';
import { EmailTokenType } from './email-token-type.js';

interface NewEmailToken {
  id: string;
  userId: string;
  type: EmailTokenType;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class EmailTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grava o token no lugar do anterior do mesmo Usuário e do mesmo tipo. É um
   * comando só, sobre a restrição única, para duas emissões simultâneas não
   * deixarem dois tokens válidos.
   */
  async replace(token: NewEmailToken): Promise<void> {
    const { userId, type } = token;
    await this.prisma.emailToken.upsert({
      where: { userId_type: { userId, type } },
      create: token,
      update: {
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        usedAt: null,
      },
    });
  }

  /**
   * Marca o token como usado e devolve o id do Usuário dele. Devolve `null` se
   * o token não existe, expirou ou já foi usado. É um comando só, para duas
   * requisições com o mesmo token não o usarem duas vezes.
   */
  async use(
    tokenHash: string,
    type: EmailTokenType,
    now: Date,
  ): Promise<string | null> {
    const used = await this.prisma.emailToken.updateManyAndReturn({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
      select: { userId: true },
    });
    return used[0]?.userId ?? null;
  }
}
