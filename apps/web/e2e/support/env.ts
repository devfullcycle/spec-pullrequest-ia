/** Lê uma variável que o serviço `playwright` do Compose define. */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `A variável ${name} não está definida. Rode os testes no serviço playwright do Compose.`,
    );
  }
  return value;
}
