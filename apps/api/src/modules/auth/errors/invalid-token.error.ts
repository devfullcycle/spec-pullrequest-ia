import { DomainError } from '../../../common/errors/domain-error.js';

/** Token de verificação ou de redefinição inexistente, expirado ou já usado. */
export class InvalidTokenError extends DomainError {
  readonly code = 'invalid_token';

  constructor() {
    super('O link é inválido, expirou ou já foi usado.');
  }
}
