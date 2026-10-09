-- Texto insensível a maiúsculas, para o e-mail do usuário.
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigramas, para a busca por nome.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
