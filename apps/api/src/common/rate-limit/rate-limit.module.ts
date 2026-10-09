import { Module } from '@nestjs/common';
import { RateLimitRepository } from './rate-limit.repository.js';
import { RateLimitService } from './rate-limit.service.js';

/** Limite de tentativas. Quem conta tentativas importa este módulo. */
@Module({
  providers: [RateLimitService, RateLimitRepository],
  exports: [RateLimitService],
})
export class RateLimitModule {}
