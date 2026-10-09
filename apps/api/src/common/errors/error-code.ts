/**
 * Códigos de erro estáveis do contrato da API (seção 3.1 do docs/lld.md).
 * O status HTTP de cada um mora no filtro de erros, e não aqui.
 */
export type ErrorCode =
  | 'validation_error'
  | 'invalid_token'
  | 'invalid_move'
  | 'max_depth_exceeded'
  | 'unauthenticated'
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'link_password_required'
  | 'not_found'
  | 'upload_size_mismatch'
  | 'link_expired'
  | 'file_too_large'
  | 'quota_exceeded'
  | 'rate_limited';
