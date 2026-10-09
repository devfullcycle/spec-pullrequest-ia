import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  // Sem limite de tamanho: o token é comparado pelo hash, como no logout.
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
