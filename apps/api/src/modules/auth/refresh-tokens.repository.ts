import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service.js';

interface NewRefreshToken {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: token });
  }

  /**
   * Apaga todos os tokens da Sessão a que o token pertence, expirados ou não.
   * Não faz nada se o token não existe.
   */
  async deleteSessionOf(tokenHash: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { sessionId: true },
    });
    if (token) {
      await this.prisma.refreshToken.deleteMany({
        where: { sessionId: token.sessionId },
      });
    }
  }
}
