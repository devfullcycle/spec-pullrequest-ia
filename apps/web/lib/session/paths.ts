/*
 * Os caminhos que a Sessão usa para redirecionar. Sem `server-only`, porque o Proxy os importa.
 */

/** Para onde vai quem entra sem ter pedido uma página. */
export const HOME_PATH = "/";

/** A tela de entrar, para onde vai quem não tem Sessão. */
export const LOGIN_PATH = "/entrar";

/** A rota que apaga os cookies de uma Sessão que a API recusou. */
export const SESSION_ENDED_PATH = "/sessao-encerrada";
