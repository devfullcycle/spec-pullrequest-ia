import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";
import { requestPasswordReset } from "../actions";
import { RequestLinkForm } from "../request-link-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Esqueci minha senha"
      support="Informe seu e-mail e enviaremos um link para criar uma nova senha."
    >
      <RequestLinkForm action={requestPasswordReset} submitLabel="Enviar link" />
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
        <p className="text-body text-ink-muted">
          Ainda não tem conta? <TextLink href="/criar-conta">Criar conta</TextLink>
        </p>
      </div>
    </AuthCard>
  );
}
