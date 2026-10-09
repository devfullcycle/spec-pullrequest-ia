import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithClientIp } from './client-ip.guard.js';

/** O IP de quem fez a chamada, numa rota que passa pelo `ClientIpGuard`. */
export const ClientIp = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const { clientIp } = context
      .switchToHttp()
      .getRequest<Partial<RequestWithClientIp>>();
    // Sem o guard, todas as chamadas dividiriam o contador de um IP que não existe.
    if (!clientIp) {
      throw new Error('@ClientIp() exige o ClientIpGuard na rota.');
    }
    return clientIp;
  },
);
