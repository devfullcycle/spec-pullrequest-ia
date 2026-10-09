import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokensService } from './access-tokens.service.js';
import { UnauthenticatedError } from './unauthenticated.error.js';

/** A requisição depois de passar pelo `AuthGuard`. */
export interface AuthenticatedRequest extends Request {
  userId: string;
}

/**
 * Exige um token de acesso válido em `Authorization: Bearer`. O id do Usuário
 * fica na requisição, de onde o controller o lê com `@CurrentUserId()`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly accessTokens: AccessTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const userId =
      scheme === 'Bearer' && token
        ? await this.accessTokens.verify(token)
        : null;
    if (!userId) {
      throw new UnauthenticatedError();
    }
    request.userId = userId;
    return true;
  }
}
