import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** O token que chega pelo link de um e-mail. */
export function IsEmailLinkToken(): PropertyDecorator {
  return applyDecorators(IsString(), IsNotEmpty(), MaxLength(512));
}
