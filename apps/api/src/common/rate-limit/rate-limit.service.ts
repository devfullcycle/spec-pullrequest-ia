import { Injectable } from '@nestjs/common';
import { RateLimitRepository } from './rate-limit.repository.js';
import { RateLimitedError } from './rate-limited.error.js';

export interface RateLimit {
  /** O que está sendo contado, por exemplo `login:ip:<ip>`. */
  key: string;
  /** Quantas tentativas cabem na janela. */
  max: number;
}

/**
 * Contadores de tentativas por chave e janela, guardados no PostgreSQL, porque
 * as instâncias da API não compartilham memória (seção 2 do docs/lld.md).
 */
@Injectable()
export class RateLimitService {
  constructor(private readonly counters: RateLimitRepository) {}

  /**
   * Conta uma tentativa em cada chave e lança `RateLimitedError` se alguma
   * passou do teto. Todas são contadas, mesmo quando uma já estourou. A janela
   * começa na primeira tentativa e não se estica com as seguintes.
   */
  async consume(limits: RateLimit[], windowSeconds: number): Promise<void> {
    const exceeded = await Promise.all(
      limits.map(
        async ({ key, max }) =>
          (await this.counters.hit(key, windowSeconds)) > max,
      ),
    );
    if (exceeded.includes(true)) {
      throw new RateLimitedError();
    }
  }
}
