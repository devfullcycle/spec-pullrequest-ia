import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { DomainError } from './domain-error.js';
import { ErrorCode } from './error-code.js';
import { FieldError, InputValidationError } from './input-validation.error.js';

/** Corpo de erro da API: RFC 9457, mais o `code` estável do contrato. */
interface ProblemDetails {
  type: 'about:blank';
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: FieldError[];
}

/** Status HTTP de cada código do contrato (seção 3.1 do docs/lld.md). */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_error: 400,
  invalid_token: 400,
  invalid_move: 400,
  max_depth_exceeded: 400,
  unauthenticated: 401,
  invalid_credentials: 401,
  email_not_verified: 403,
  link_password_required: 403,
  not_found: 404,
  upload_size_mismatch: 409,
  link_expired: 410,
  file_too_large: 413,
  quota_exceeded: 413,
  rate_limited: 429,
};

const INTERNAL_ERROR = 'internal_error';

/**
 * Código dos erros que nascem no framework, e não numa regra de negócio: rota
 * inexistente, corpo malformado etc. Os status que não estão aqui usam o nome
 * do próprio status (`method_not_allowed`, `service_unavailable`).
 */
const CODE_BY_FRAMEWORK_STATUS: Record<number, string> = {
  400: 'validation_error',
  401: 'unauthenticated',
  404: 'not_found',
  429: 'rate_limited',
  500: INTERNAL_ERROR,
};

/**
 * Único lugar onde a resposta HTTP de erro é desenhada. Toda falha sai em
 * `application/problem+json`, e o que não foi previsto vira um 500 sem
 * detalhes.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (response.headersSent) {
      // A resposta já começou a sair, então não dá mais para trocar o status
      // nem o corpo. Derrubar a conexão avisa o cliente de que ela veio incompleta.
      this.log(exception);
      response.destroy();
      return;
    }

    const problem = this.toProblem(exception);
    response
      .status(problem.status)
      .type('application/problem+json')
      .json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof DomainError) {
      const problem = this.problem(
        STATUS_BY_CODE[exception.code],
        exception.code,
      );
      problem.detail = exception.message;
      if (exception instanceof InputValidationError) {
        problem.errors = exception.fieldErrors;
      }
      return problem;
    }

    // A mensagem do framework nunca entra na resposta: ela não faz parte do contrato.
    // O que não veio do framework é inesperado e sai como 500.
    const status = frameworkStatus(exception) ?? 500;
    if (status >= 500) {
      this.log(exception);
    }
    return this.problem(
      status,
      CODE_BY_FRAMEWORK_STATUS[status] ??
        HttpStatus[status]?.toLowerCase() ??
        (status >= 500 ? INTERNAL_ERROR : 'http_error'),
    );
  }

  private problem(status: number, code: string): ProblemDetails {
    return {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      code,
    };
  }

  private log(exception: unknown): void {
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception) : exception,
    );
  }
}

/**
 * Status de um erro que o próprio framework levantou. Só dois tipos contam:
 *
 * - `HttpException`, do Nest ou lançada de propósito pelo código;
 * - erro do leitor do corpo do Express (JSON malformado, corpo grande demais),
 *   que vem marcado com `expose`, `type` e um status 4xx.
 *
 * Qualquer outro erro é inesperado, mesmo que traga um `statusCode`: o SDK de um
 * fornecedor costuma repassar ali o status da chamada que ele fez, e esse status
 * não é a resposta desta API.
 */
function frameworkStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  if (typeof exception === 'object' && exception !== null) {
    const { expose, type, statusCode } = exception as Record<string, unknown>;
    if (
      expose === true &&
      typeof type === 'string' &&
      typeof statusCode === 'number' &&
      Number.isInteger(statusCode) &&
      statusCode >= 400 &&
      statusCode < 500
    ) {
      return statusCode;
    }
  }
  return undefined;
}
