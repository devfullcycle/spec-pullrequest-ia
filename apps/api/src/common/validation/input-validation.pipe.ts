import { Injectable, ValidationError, ValidationPipe } from '@nestjs/common';
import {
  FieldError,
  InputValidationError,
} from '../errors/input-validation.error.js';

/**
 * Validação de entrada de todas as rotas, pelos decorators do class-validator
 * nos DTOs. Campos que o DTO não declara são descartados, e a falha sobe como
 * `InputValidationError`, que o filtro de erros responde como `validation_error`.
 */
@Injectable()
export class InputValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new InputValidationError(toFieldErrors(errors)),
    });
  }
}

function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    return [
      ...(messages.length > 0 ? [{ field, messages }] : []),
      ...toFieldErrors(error.children ?? [], field),
    ];
  });
}
