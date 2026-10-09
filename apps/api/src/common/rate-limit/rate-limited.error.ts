import { DomainError } from '../errors/domain-error.js';

/** Limite de tentativas estourado. A mensagem é a mesma para qualquer chave. */
export class RateLimitedError extends DomainError {
  readonly code = 'rate_limited';

  constructor() {
    super('Muitas tentativas. Tente de novo mais tarde.');
  }
}
