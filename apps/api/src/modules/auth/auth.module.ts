import { Module } from '@nestjs/common';
import { MailModule } from '../../infra/mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { AuthController } from './auth.controller.js';
import { EmailTokensRepository } from './email-tokens.repository.js';
import { EmailTokensService } from './email-tokens.service.js';
import { PasswordService } from './password.service.js';
import { RegistrationService } from './registration.service.js';

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AuthController],
  providers: [
    RegistrationService,
    PasswordService,
    EmailTokensService,
    EmailTokensRepository,
    AuthMailerService,
  ],
})
export class AuthModule {}
