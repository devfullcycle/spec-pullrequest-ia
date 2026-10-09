import { applyDecorators } from '@nestjs/common';
import { IsString, Length } from 'class-validator';

/** A senha que a pessoa escolhe, no cadastro e na redefinição. */
export function IsNewPassword(): PropertyDecorator {
  return applyDecorators(IsString(), Length(10, 128));
}
