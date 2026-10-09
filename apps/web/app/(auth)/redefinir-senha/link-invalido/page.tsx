import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { TextLink } from "@/components/ui/text-link";

export const metadata: Metadata = { title: "Link inválido ou expirado" };

export default function InvalidResetLinkPage() {
  return (
    <AuthCard
      title="Link inválido ou expirado"
      support="Este link de redefinição não vale mais: ele expirou ou já foi usado. Peça outro para criar uma nova senha."
    >
      <ButtonPrimary href="/esqueci-minha-senha" fullWidth>
        Pedir novo link
      </ButtonPrimary>
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
      </div>
    </AuthCard>
  );
}
