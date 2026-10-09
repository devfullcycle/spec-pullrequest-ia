import { ErrorCode } from './error-code.js';

/**
 * Base dos erros de domínio: uma regra de negócio violada. Carrega o `code`
 * estável do contrato e não conhece o HTTP; quem escolhe o status e monta a
 * resposta é o filtro de erros.
 *
 * A mensagem vai para o campo `detail` da resposta, então não pode trazer
 * detalhes internos.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
