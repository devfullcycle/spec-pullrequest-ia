/** Um Usuário, como os outros módulos o enxergam. */
export interface User {
  id: string;
  /** Como foi digitado no cadastro, sem os espaços das pontas. */
  email: string;
  /** Argon2id. */
  passwordHash: string;
  /** Nulo até a verificação do e-mail. */
  emailVerifiedAt: Date | null;
}
