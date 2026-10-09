import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter.js';
import { InputValidationPipe } from './common/validation/input-validation.pipe.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { MailModule } from './infra/mail/mail.module.js';

@Module({
  imports: [AppConfigModule.forRoot(), DatabaseModule, MailModule],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_PIPE, useClass: InputValidationPipe },
  ],
})
export class AppModule {}
