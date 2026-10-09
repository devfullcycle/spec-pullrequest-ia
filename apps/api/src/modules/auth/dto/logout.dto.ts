import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}
