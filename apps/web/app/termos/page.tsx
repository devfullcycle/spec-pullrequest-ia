import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";

export const metadata: Metadata = { title: "Termos de Uso" };

// Página provisória: o texto definitivo depende de validação jurídica.
export default function TermsPage() {
  return (
    <AuthCard
      title="Termos de Uso"
      support="Os Termos de Uso ainda estão sendo escritos. O texto definitivo será publicado aqui."
    >
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/criar-conta">Voltar para Criar conta</TextLink>
      </div>
    </AuthCard>
  );
}
