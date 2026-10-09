import { Module } from '@nestjs/common';
import { AccessTokensModule } from '../../common/auth/access-tokens.module.js';
import { MailModule } from '../../infra/mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { AuthController } from './auth.controller.js';
import { EmailTokensRepository } from './email-tokens.repository.js';
import { EmailTokensService } from './email-tokens.service.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';
import { RegistrationService } from './registration.service.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [UsersModule, MailModule, AccessTokensModule],
  controllers: [AuthController],
  providers: [
    RegistrationService,
    SessionsService,
    PasswordRecoveryService,
    RefreshTokensRepository,
    PasswordService,
    EmailTokensService,
    EmailTokensRepository,
    AuthMailerService,
  ],
})
export class AuthModule {}
