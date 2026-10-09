import { DomainError } from '../../../common/errors/domain-error.js';

/** Login com a senha certa, antes da verificação do e-mail. */
export class EmailNotVerifiedError extends DomainError {
  readonly code = 'email_not_verified';

  constructor() {
    super('O e-mail ainda não foi verificado.');
  }
}
