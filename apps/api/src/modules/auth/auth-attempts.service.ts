import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service.js';
import { rateLimitConfig } from '../../config/rate-limit.config.js';

/** As rotas que enviam e-mail a pedido de quem não tem Sessão. */
export type EmailRequest =
  'register' | 'resend-verification' | 'forgot-password';

/**
 * Limite de tentativas da autenticação (seção 4.7 do docs/lld.md). Cada rota
 * tem o próprio contador por e-mail e por IP. A tentativa é contada antes de
 * qualquer consulta ao Usuário, e o bloqueio responde igual exista ele ou não.
 */
@Injectable()
export class AuthAttemptsService {
  constructor(
    private readonly rateLimit: RateLimitService,
    @Inject(rateLimitConfig.KEY)
    private readonly config: ConfigType<typeof rateLimitConfig>,
  ) {}

  /** Conta uma tentativa de login, com a senha certa ou não. */
  login(email: string, clientIp: string): Promise<void> {
    return this.count('login', email, clientIp, this.config.login);
  }

  /** Conta um pedido de e-mail. As três rotas dividem os tetos, e não o contador. */
  emailRequest(
    request: EmailRequest,
    email: string,
    clientIp: string,
  ): Promise<void> {
    return this.count(request, email, clientIp, this.config.emailRequest);
  }

  private count(
    route: string,
    email: string,
    clientIp: string,
    limit: { perEmail: number; perIp: number; windowSeconds: number },
  ): Promise<void> {
    return this.rateLimit.consume(
      [
        { key: `${route}:email:${emailKey(email)}`, max: limit.perEmail },
        { key: `${route}:ip:${clientIp}`, max: limit.perIp },
      ],
      limit.windowSeconds,
    );
  }
}

/**
 * O hash do e-mail digitado, exista ou não o Usuário. As maiúsculas não contam,
 * como na busca do Usuário, para a mesma caixa não ganhar um contador por grafia.
 */
function emailKey(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}
