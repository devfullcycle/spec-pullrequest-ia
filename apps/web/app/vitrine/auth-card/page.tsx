import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";

/** O cartão montado como na tela "Entrar — erro e-mail não verificado" do Figma. */
export default function VitrineAuthCardPage() {
  return (
    <AuthCard title="Entrar">
      <Banner
        variant="error"
        layout="narrow"
        action={<TextLink>Reenviar e-mail</TextLink>}
      >
        Seu e-mail ainda não foi verificado. Confira sua caixa de entrada.
      </Banner>
      <div className="flex flex-col gap-4">
        <TextField
          label="E-mail"
          name="email"
          type="email"
          defaultValue="nome@exemplo.com"
        />
        <PasswordField
          label="Senha"
          name="password"
          defaultValue="uma senha longa"
        />
      </div>
      <ButtonPrimary fullWidth>Entrar</ButtonPrimary>
      <p className="text-caption text-ink-muted">
        Ao criar a conta, você concorda com os{" "}
        <TextLink href="/vitrine" size="inherit">
          Termos de Uso
        </TextLink>{" "}
        e a{" "}
        <TextLink href="/vitrine" size="inherit">
          Política de Privacidade
        </TextLink>
        .
      </p>
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/vitrine">Esqueci minha senha</TextLink>
        <p className="text-body text-ink-muted">
          Ainda não tem conta? <TextLink href="/vitrine">Criar conta</TextLink>
        </p>
      </div>
    </AuthCard>
  );
}
