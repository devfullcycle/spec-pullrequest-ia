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

/**
 * Código dos erros que nascem no framework, e não numa regra de negócio: rota
 * inexistente, corpo malformado etc. Os status que não estão aqui usam o nome
 * do próprio status (`method_not_allowed`).
 */
const CODE_BY_FRAMEWORK_STATUS: Record<number, string> = {
  400: 'validation_error',
  401: 'unauthenticated',
  404: 'not_found',
  429: 'rate_limited',
  500: 'internal_error',
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
    const problem = this.toProblem(exception);

    host
      .switchToHttp()
      .getResponse<Response>()
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

    const status = frameworkStatus(exception);
    if (status !== undefined && status < 500) {
      // A mensagem do framework não entra na resposta: ela não faz parte do contrato.
      return this.problem(
        status,
        CODE_BY_FRAMEWORK_STATUS[status] ??
          HttpStatus[status]?.toLowerCase() ??
          'http_error',
      );
    }

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception) : exception,
    );
    return this.problem(500, CODE_BY_FRAMEWORK_STATUS[500]);
  }

  private problem(status: number, code: string): ProblemDetails {
    return {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      code,
    };
  }
}

/**
 * Status de um erro levantado pelo Nest (`HttpException`) ou por um middleware
 * do Express, como o leitor do corpo, que marca o erro com `statusCode`.
 */
function frameworkStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  if (typeof exception === 'object' && exception !== null) {
    const { statusCode } = exception as { statusCode?: unknown };
    if (
      typeof statusCode === 'number' &&
      Number.isInteger(statusCode) &&
      statusCode >= 400 &&
      statusCode < 600
    ) {
      return statusCode;
    }
  }
  return undefined;
}
