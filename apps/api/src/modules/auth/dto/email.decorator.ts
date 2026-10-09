import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

/**
 * Um endereço de e-mail na entrada. Os espaços das pontas saem antes da
 * validação, para não barrar um endereço certo.
 */
export function IsEmailAddress(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsEmail(),
    MaxLength(254),
  );
}
