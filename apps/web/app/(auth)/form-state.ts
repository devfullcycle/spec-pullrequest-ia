/* O que as Server Actions de autenticação devolvem ao formulário, pelo `useActionState`. */

export interface RegisterFormState {
  /** Mensagem de erro de cada campo, para aparecer junto a ele. */
  fieldErrors?: { email?: string; password?: string };
  /** Erro que não pertence a um campo, para o aviso acima do formulário. */
  formError?: string;
  /** O e-mail digitado volta ao campo. A senha nunca volta. */
  email?: string;
}

export interface RequestLinkFormState {
  fieldErrors?: { email?: string };
  formError?: string;
  email?: string;
}

export interface ResendFormState {
  /** O pedido foi aceito. A API responde igual exista ou não o Usuário. */
  sent?: boolean;
  error?: string;
}
