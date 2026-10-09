import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";

export const metadata: Metadata = { title: "Política de Privacidade" };

// Página provisória: o texto definitivo depende de validação jurídica.
export default function PrivacyPage() {
  return (
    <AuthCard
      title="Política de Privacidade"
      support="A Política de Privacidade ainda está sendo escrita. O texto definitivo será publicado aqui."
    >
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/criar-conta">Voltar para Criar conta</TextLink>
      </div>
    </AuthCard>
  );
}
