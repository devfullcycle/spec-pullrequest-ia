import { Injectable, OnModuleInit } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/** Hash das senhas dos Usuários, em Argon2id. */
@Injectable()
export class PasswordService implements OnModuleInit {
  /** Hash de uma senha que ninguém tem, para a conferência sem Usuário. */
  private decoyHash: string;

  /**
   * O hash de despiste nasce na subida, e não no primeiro login: assim a
   * primeira tentativa com um e-mail sem Usuário não demora mais que as outras.
   */
  async onModuleInit(): Promise<void> {
    this.decoyHash = await this.hash(crypto.randomUUID());
  }

  hash(password: string): Promise<string> {
    return hash(password, { type: argon2id });
  }

  /**
   * Confere a senha contra o hash. Sem hash, que é o caso do e-mail sem
   * Usuário, faz o mesmo trabalho contra um hash qualquer e devolve `false`.
   */
  async verify(
    passwordHash: string | undefined,
    password: string,
  ): Promise<boolean> {
    if (passwordHash === undefined) {
      await verify(this.decoyHash, password);
      return false;
    }
    return verify(passwordHash, password);
  }
}
