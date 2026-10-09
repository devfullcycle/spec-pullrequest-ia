import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { TextLink } from "@/components/ui/text-link";
import { RETURN_PARAM } from "@/lib/session/return-path";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

type Props = PageProps<"/entrar">;

/** O aviso que chega de outro fluxo, pelo parâmetro `aviso` da URL. */
async function Notice({ searchParams }: Props) {
  const { aviso } = await searchParams;
  if (aviso !== "email-verificado") return null;

  return (
    <Banner variant="success" layout="narrow">
      E-mail verificado. Agora você já pode entrar.
    </Banner>
  );
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
