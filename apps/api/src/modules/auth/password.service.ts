import { Injectable } from '@nestjs/common';
import { argon2id, hash } from 'argon2';

/** Hash das senhas dos Usuários, em Argon2id. */
@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, { type: argon2id });
  }
}
