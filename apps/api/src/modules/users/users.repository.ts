import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/database/prisma.service.js';
import { User } from './entities/user.entity.js';

const USER_FIELDS = {
  id: true,
  email: true,
  passwordHash: true,
  emailVerifiedAt: true,
} satisfies Prisma.UserSelect;

interface NewUser {
  id: string;
  email: string;
  passwordHash: string;
  termsAcceptedAt: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria o Usuário, ou devolve o que já existe com o mesmo e-mail. Quem decide
   * é a restrição de e-mail único, para dois cadastros simultâneos do mesmo
   * e-mail não criarem dois Usuários nem falharem.
   */
  async findOrCreate(user: NewUser): Promise<{ user: User; created: boolean }> {
    try {
      const created = await this.prisma.user.create({
        data: user,
        select: USER_FIELDS,
      });
      return { user: created, created: true };
    } catch (error) {
      const existing = isUniqueViolation(error)
        ? await this.findByEmail(user.email)
        : null;
      if (!existing) {
        throw error;
      }
      return { user: existing, created: false };
    }
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_FIELDS,
    });
  }

  /** A coluna é `CITEXT`: a busca ignora maiúsculas. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_FIELDS,
    });
  }

  /**
   * Troca a senha e o aceite dos termos de um Usuário que ainda não verificou o
   * e-mail. Devolve `false`, sem alterar nada, se ele já está verificado. A
   * condição vai no próprio comando, para uma verificação que termine no meio
   * do caminho não ter a senha trocada.
   */
  async replaceUnverifiedRegistration(
    id: string,
    registration: { passwordHash: string; termsAcceptedAt: Date },
  ): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id, emailVerifiedAt: null },
      data: registration,
    });
    return count > 0;
  }

  /**
   * Troca a senha e marca o e-mail como verificado, sem mexer na data de quem
   * já estava. É um comando só, para as duas gravações valerem juntas: uma
   * senha nova num Usuário que continuasse sem verificação não serviria para
   * entrar. Devolve `null` se o Usuário não existe.
   */
  async resetPassword(
    id: string,
    passwordHash: string,
    now: Date,
  ): Promise<User | null> {
    const changed = await this.prisma.$queryRaw<User[]>`
      UPDATE users
      SET password_hash = ${passwordHash},
          email_verified_at = COALESCE(email_verified_at, ${now}),
          updated_at = ${now}
      WHERE id = ${id}::uuid
      RETURNING
        id,
        email::text AS email,
        password_hash AS "passwordHash",
        email_verified_at AS "emailVerifiedAt"`;
    return changed[0] ?? null;
  }

  /** Não mexe na data de um Usuário que já estava verificado. */
  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id, emailVerifiedAt: null },
      data: { emailVerifiedAt: verifiedAt },
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
