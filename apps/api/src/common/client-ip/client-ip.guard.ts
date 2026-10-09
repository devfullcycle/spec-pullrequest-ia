import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { appConfig } from '../../config/app.config.js';
import { canonicalIp } from './canonical-ip.js';

/** A requisição depois de passar pelo `ClientIpGuard`. */
export interface RequestWithClientIp extends Request {
  clientIp: string;
}

/** De quanto em quanto tempo o segredo recusado volta ao log, em milissegundos. */
const REJECTED_SECRET_LOG_INTERVAL_MS = 60_000;

/**
 * Descobre o IP de quem fez a chamada (seção 1 do docs/lld.md). A web chama a
 * API pelo servidor e repassa o IP do navegador em `X-Client-Ip`, com o segredo
 * compartilhado em `X-Internal-Secret`. O IP repassado só vale quando o segredo
 * confere: sem ele, vale o IP da conexão. O controller o lê com `@ClientIp()`.
 */
@Injectable()
export class ClientIpGuard implements CanActivate {
  private readonly logger = new Logger(ClientIpGuard.name);
  private rejectedSecretLoggedAt = 0;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClientIp>();
    request.clientIp = canonicalIp(this.clientIp(request));
    return true;
  }

  private clientIp(request: Request): string {
    const forwarded = request.headers['x-client-ip'];
    const secret = request.headers['x-internal-secret'];
    if (typeof secret === 'string') {
      if (!sameSecret(secret, this.config.internalApiSecret)) {
        this.warnRejectedSecret();
      } else if (typeof forwarded === 'string' && isIP(forwarded) !== 0) {
        return forwarded;
      }
    }
    return request.socket.remoteAddress ?? 'unknown';
  }

  /**
   * Um segredo diferente entre a web e a API faz todas as pessoas contarem
   * como o IP da web e serem bloqueadas juntas. O aviso é o que aponta a causa.
   * Ele sai no máximo uma vez por minuto, porque qualquer um pode mandar o
   * cabeçalho.
   */
  private warnRejectedSecret(): void {
    const now = Date.now();
    if (now - this.rejectedSecretLoggedAt < REJECTED_SECRET_LOG_INTERVAL_MS) {
      return;
    }
    this.rejectedSecretLoggedAt = now;
    this.logger.warn(
      'O X-Internal-Secret recebido não confere com INTERNAL_API_SECRET. O IP repassado foi ignorado, e vale o IP da conexão.',
    );
  }
}

/** Compara pelos hashes, em tempo constante, para o tempo não revelar o segredo. */
function sameSecret(received: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}
