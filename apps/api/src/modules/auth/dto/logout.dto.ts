import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  // Sem limite de tamanho: um token que não existe também recebe 204.
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
