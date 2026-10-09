import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";
import { RequestLinkForm } from "./request-link-form";

export const metadata: Metadata = { title: "Link inválido ou expirado" };

const INVALID_LINK = {
  title: "Link inválido ou expirado",
  support:
    "Este link de verificação não vale mais: ele expirou ou já foi usado. Informe seu e-mail para receber outro.",
};

/** A verificação falhou por um motivo que não é o link, que pode continuar bom. */
const FAILURE = {
  title: "Não foi possível verificar",
  support:
    "Algo deu errado do nosso lado. Abra de novo o link do e-mail em instantes ou informe seu e-mail para receber outro.",
};

type Props = PageProps<"/verificar-email/link-invalido">;

async function Card({ searchParams }: Props) {
  const { motivo } = await searchParams;
  const { title, support } = motivo === "falha" ? FAILURE : INVALID_LINK;

  return (
    <AuthCard title={title} support={support}>
      <RequestLinkForm />
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
      </div>
    </AuthCard>
  );
}

export default function InvalidLinkPage(props: Props) {
  return (
    <Suspense>
      <Card {...props} />
    </Suspense>
  );
}
