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

export interface LoginFormState {
  fieldErrors?: { email?: string; password?: string };
  formError?: string;
  /**
   * O login foi recusado porque este e-mail ainda não foi verificado. O aviso, com o texto de
   * `formError`, oferece o reenvio para ele, e não para o que estiver no campo depois.
   */
  unverifiedEmail?: string;
  /** O reenvio da verificação foi aceito. A API responde igual exista ou não o Usuário. */
  verificationSent?: boolean;
  /** O e-mail digitado volta ao campo. A senha nunca volta. */
  email?: string;
}
