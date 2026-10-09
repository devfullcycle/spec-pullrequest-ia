import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service.js';

@Injectable()
export class RateLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Conta mais uma tentativa da chave e devolve o total da janela atual. A
   * primeira tentativa abre a janela, e a que chega depois de ela fechar abre
   * outra, do um. É um comando só, para duas tentativas simultâneas não lerem o
   * mesmo contador. O relógio é o do banco, que é um só para todas as
   * instâncias da API.
   */
  async hit(key: string, windowSeconds: number): Promise<number> {
    const [{ count }] = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start <= now() - ${windowSeconds}::int * interval '1 second' THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start <= now() - ${windowSeconds}::int * interval '1 second' THEN now()
          ELSE rate_limits.window_start
        END
      RETURNING count
    `;
    return count;
  }
}
