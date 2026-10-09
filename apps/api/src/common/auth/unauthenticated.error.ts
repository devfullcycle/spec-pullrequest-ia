import { DomainError } from '../errors/domain-error.js';

/** Token de acesso ausente, inválido ou expirado. */
export class UnauthenticatedError extends DomainError {
  readonly code = 'unauthenticated';

  constructor() {
    super('A Sessão é inválida ou expirou.');
  }
}
