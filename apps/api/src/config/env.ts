/**
 * Lê uma variável que o schema já validou. As configurações por assunto usam
 * esta função em vez de `process.env` direto, para saírem tipadas como `string`.
 */
export function env(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`A variável de ambiente ${name} não passou pelo schema.`);
  }
  return value;
}
