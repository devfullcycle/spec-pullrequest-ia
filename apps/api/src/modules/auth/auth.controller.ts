import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { RegistrationService } from './registration.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterDto): Promise<void> {
    await this.registration.register(body.email, body.password);
  }

  @Post('verify-email')
  @HttpCode(204)
  async verifyEmail(@Body() body: VerifyEmailDto): Promise<void> {
    await this.registration.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @HttpCode(204)
  async resendVerification(@Body() body: ResendVerificationDto): Promise<void> {
    await this.registration.resendVerification(body.email);
  }
}
