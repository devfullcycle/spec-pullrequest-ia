import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsEmailAddress } from './email.decorator.js';

export class LoginDto {
  @IsEmailAddress()
  email: string;

  // Sem o mínimo do cadastro: uma senha curta é só uma senha errada.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
