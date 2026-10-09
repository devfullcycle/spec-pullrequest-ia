import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <AuthCard title="Criar conta">
      <RegisterForm />
      <p className="text-caption text-ink-muted">
        Ao criar a conta, você concorda com os{" "}
        <TextLink href="/termos" size="inherit">
          Termos de Uso
        </TextLink>{" "}
        e a{" "}
        <TextLink href="/privacidade" size="inherit">
          Política de Privacidade
        </TextLink>
        .
      </p>
      <div className="flex flex-col items-center gap-2">
        <p className="text-body text-ink-muted">
          Já tem conta? <TextLink href="/entrar">Entrar</TextLink>
        </p>
      </div>
    </AuthCard>
  );
}
