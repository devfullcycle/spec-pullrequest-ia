import { DomainError } from './domain-error.js';

export interface FieldError {
  /** Caminho do campo na entrada, com pontos nos aninhados (`address.city`). */
  field: string;
  messages: string[];
}

/** Entrada que não passou na validação. Leva os erros de cada campo. */
export class InputValidationError extends DomainError {
  readonly code = 'validation_error';

  constructor(readonly fieldErrors: FieldError[]) {
    super('A entrada é inválida.');
  }
}
