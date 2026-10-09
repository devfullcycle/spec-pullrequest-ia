import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { RegistrationService } from './registration.service.js';
import { SessionsService, type TokenPair } from './sessions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly sessions: SessionsService,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) {}

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

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto): Promise<TokenPair> {
    return this.sessions.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto): Promise<TokenPair> {
    return this.sessions.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.sessions.logout(body.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.passwordRecovery.requestReset(body.email);
  }

  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.passwordRecovery.reset(body.token, body.password);
  }
}
