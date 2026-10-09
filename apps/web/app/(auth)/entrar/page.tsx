import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { TextLink } from "@/components/ui/text-link";
import {
  EMAIL_VERIFIED_NOTICE,
  NOTICE_PARAM,
  PASSWORD_RESET_NOTICE,
  SESSION_EXPIRED_NOTICE,
} from "@/lib/session/login-path";
import { RETURN_PARAM } from "@/lib/session/return-path";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

type Props = PageProps<"/entrar">;

/** O aviso que chega de outro fluxo, pelo parâmetro `aviso` da URL. */
async function Notice({ searchParams }: Props) {
  const notice = (await searchParams)[NOTICE_PARAM];

  if (notice === EMAIL_VERIFIED_NOTICE) {
    return (
      <Banner variant="success" layout="narrow">
        E-mail verificado. Agora você já pode entrar.
      </Banner>
    );
  }
  if (notice === PASSWORD_RESET_NOTICE) {
    return (
      <Banner variant="success" layout="narrow">
        Senha redefinida. Entre com a nova senha.
      </Banner>
    );
  }
  if (notice === SESSION_EXPIRED_NOTICE) {
    return (
      <Banner variant="warning" layout="narrow">
        Sua sessão expirou. Entre de novo para continuar.
      </Banner>
    );
  }
  return null;
}

/** A página pedida antes do login. A Server Action só aceita caminhos internos. */
async function ReturnTo({ searchParams }: Props) {
  const returnTo = (await searchParams)[RETURN_PARAM];
  if (typeof returnTo !== "string") return null;

  return <input type="hidden" name={RETURN_PARAM} value={returnTo} />;
}

export default function LoginPage(props: Props) {
  return (
    <AuthCard title="Entrar">
      <LoginForm
        returnTo={
          <Suspense>
            <ReturnTo {...props} />
          </Suspense>
        }
        notice={
          <Suspense>
            <Notice {...props} />
          </Suspense>
        }
      />
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/esqueci-minha-senha">Esqueci minha senha</TextLink>
        <p className="text-body text-ink-muted">
          Ainda não tem conta? <TextLink href="/criar-conta">Criar conta</TextLink>
        </p>
      </div>
    </AuthCard>
  );
}
