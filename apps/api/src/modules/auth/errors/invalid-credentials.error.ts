import { DomainError } from '../../../common/errors/domain-error.js';

/** E-mail sem Usuário ou senha errada. A mensagem é a mesma nos dois casos. */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'invalid_credentials';

  constructor() {
    super('E-mail ou senha incorretos.');
  }
}
