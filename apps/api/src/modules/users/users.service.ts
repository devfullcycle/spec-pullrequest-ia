import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { UnauthenticatedError } from '../../common/auth/unauthenticated.error.js';
import { User } from './entities/user.entity.js';
import { UsersRepository } from './users.repository.js';

/**
 * Service público do módulo de usuários: a única porta pela qual os outros
 * módulos leem e alteram Usuários.
 */
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  /**
   * Cria um Usuário não verificado, ou devolve o que já existe com o mesmo
   * e-mail, sem alterá-lo. `termsAcceptedAt` é quando a pessoa aceitou os
   * termos, o que só quem a cadastra sabe.
   */
  findOrCreate(input: {
    email: string;
    passwordHash: string;
    termsAcceptedAt: Date;
  }): Promise<{ user: User; created: boolean }> {
    return this.users.findOrCreate({
      id: uuidv7(),
      email: input.email.trim(),
      passwordHash: input.passwordHash,
      termsAcceptedAt: input.termsAcceptedAt,
    });
  }

  /**
   * O Usuário de um token de acesso já conferido. O token vale até expirar,
   * mesmo que o Usuário dele não exista mais: nesse caso, a Sessão não vale.
   */
  async getAuthenticated(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UnauthenticatedError();
    }
    return user;
  }

  /** Ignora maiúsculas e os espaços das pontas. */
  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email.trim());
  }

  /**
   * Refaz o cadastro de um Usuário que ainda não verificou o e-mail: valem a
   * senha e o aceite dos termos novos. Devolve `false`, sem alterar nada, se o
   * Usuário já está verificado.
   */
  replaceUnverifiedRegistration(
    id: string,
    registration: { passwordHash: string; termsAcceptedAt: Date },
  ): Promise<boolean> {
    return this.users.replaceUnverifiedRegistration(id, registration);
  }

  markEmailVerified(id: string): Promise<void> {
    return this.users.markEmailVerified(id, new Date());
  }
}
