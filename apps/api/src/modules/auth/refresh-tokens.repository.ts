import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/database/prisma.service.js';

interface NewRefreshToken {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

interface Rotation {
  /** O dono do token apresentado. É a chave da fila de trocas. */
  userId: string;
  /** Hash do token apresentado. */
  tokenHash: string;
  now: Date;
  /** Um token trocado até este instante já saiu da janela de tolerância. */
  reuseAcceptedSince: Date;
  /** O token que entra no lugar, na mesma Sessão. */
  replacement: { id: string; tokenHash: string; expiresAt: Date };
}

/**
 * - `rotated`: o token novo foi gravado.
 * - `invalid`: o token não existe ou expirou sem ter sido trocado.
 * - `reused`: o token já tinha sido trocado, fora da janela de tolerância. Os
 *   tokens de todas as Sessões do Usuário foram apagados.
 */
export type RotationOutcome = 'rotated' | 'invalid' | 'reused';

@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: token });
  }

  findByHash(tokenHash: string): Promise<{ userId: string } | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
  }

  /**
   * Troca o token pelo `replacement`, se ele ainda vale. Só o primeiro uso o
   * marca como trocado: os seguintes, dentro da janela, abrem outro ramo da
   * mesma Sessão sem esticar a janela. O reuso fora da janela apaga os tokens
   * de todas as Sessões do Usuário.
   */
  rotate(rotation: Rotation): Promise<RotationOutcome> {
    const { userId, tokenHash, now, reuseAcceptedSince, replacement } =
      rotation;
    return this.prisma.$transaction(async (tx) => {
      await this.lockTokensOf(tx, userId);
      const current = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });
      if (!current) {
        return 'invalid';
      }
      // Antes da validade: um token trocado que reaparece depois de expirar
      // também é reuso, e os que saíram dele ainda valem.
      if (current.rotatedAt && current.rotatedAt <= reuseAcceptedSince) {
        // Na mesma transação, e sob o mesmo lock, da detecção: nenhuma outra
        // renovação do Usuário passa entre uma coisa e outra.
        await tx.refreshToken.deleteMany({ where: { userId } });
        return 'reused';
      }
      if (current.expiresAt <= now) {
        return 'invalid';
      }

      await tx.refreshToken.create({
        data: {
          ...replacement,
          userId: current.userId,
          sessionId: current.sessionId,
        },
      });
      if (!current.rotatedAt) {
        await tx.refreshToken.update({
          where: { id: current.id },
          data: { rotatedAt: now, replacedById: replacement.id },
        });
      }
      return 'rotated';
    });
  }

  /**
   * Apaga todos os tokens da Sessão a que o token pertence, expirados ou não.
   * Não faz nada se o token não existe.
   */
  async deleteSessionOf(tokenHash: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true, sessionId: true },
    });
    if (!token) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await this.lockTokensOf(tx, token.userId);
      await tx.refreshToken.deleteMany({
        where: { sessionId: token.sessionId },
      });
    });
  }

  /**
   * Põe em fila, até o fim da transação, quem troca ou apaga tokens do mesmo
   * Usuário. Sem isso, uma renovação que corre junto com o logout, ou com o
   * encerramento de todas as Sessões, gravaria um token novo numa Sessão que
   * acabou de ser apagada.
   */
  private async lockTokensOf(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`refresh_tokens:${userId}`}, 0))`;
  }
}
