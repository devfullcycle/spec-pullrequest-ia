import { Eye } from "lucide-react";
import type { ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { ButtonIcon } from "@/components/ui/button-icon";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title text-ink">{title}</h2>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}

/** A largura do conteúdo do cartão de autenticação, onde os campos e os avisos aparecem. */
function Narrow({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-84 flex-col gap-6">{children}</div>;
}

export default function VitrinePage() {
  return (
    <main className="flex flex-1 flex-col gap-12 bg-canvas p-6">
      <h1 className="text-display text-ink">Vitrine</h1>

      <Section title="text-link">
        <TextLink href="/vitrine">Criar conta</TextLink>
        <TextLink href="/vitrine" size="ui">
          Criar conta
        </TextLink>
        <TextLink>Reenviar e-mail</TextLink>
        <TextLink disabled>Reenviar e-mail</TextLink>
      </Section>

      <Section title="button-primary">
        <ButtonPrimary>Entrar</ButtonPrimary>
        <ButtonPrimary loading>Entrar</ButtonPrimary>
        <ButtonPrimary disabled>Entrar</ButtonPrimary>
        <ButtonPrimary href="/vitrine">Pedir novo link</ButtonPrimary>
      </Section>

      <Section title="button-icon">
        <ButtonIcon aria-label="Exibir">
          <Eye className="size-5" />
        </ButtonIcon>
        <ButtonIcon aria-label="Exibir" size={44}>
          <Eye className="size-4" />
        </ButtonIcon>
        <ButtonIcon aria-label="Exibir" disabled>
          <Eye className="size-5" />
        </ButtonIcon>
      </Section>

      <Section title="text-field">
        <Narrow>
          <TextField
            label="E-mail"
            name="vazio"
            placeholder="nome@exemplo.com"
            helper="Texto de ajuda."
          />
          <TextField
            label="E-mail"
            name="preenchido"
            defaultValue="nome@exemplo.com"
            helper="Texto de ajuda."
          />
          <TextField
            label="E-mail"
            name="erro"
            defaultValue="nome@exemplo"
            error="Informe um e-mail válido, como nome@exemplo.com."
          />
          <TextField
            label="E-mail"
            name="desabilitado"
            placeholder="nome@exemplo.com"
            helper="Texto de ajuda."
            disabled
          />
        </Narrow>
      </Section>

      <Section title="password-field">
        <Narrow>
          <PasswordField
            label="Senha"
            name="senha"
            defaultValue="uma senha longa"
            helper="Use de 10 a 128 caracteres."
          />
          <PasswordField
            label="Senha"
            name="senha-erro"
            defaultValue="curta"
            error="A senha precisa ter pelo menos 10 caracteres."
          />
          <PasswordField
            label="Senha"
            name="senha-desabilitada"
            placeholder="••••••••••••"
            helper="Texto de ajuda."
            disabled
          />
        </Narrow>
      </Section>

      <Section title="banner">
        <div className="flex w-full max-w-160 flex-col gap-6">
          <Banner
            variant="error"
            action={<TextLink size="ui">Criar conta</TextLink>}
          >
            Mensagem do aviso.
          </Banner>
          <Banner variant="warning">Mensagem do aviso.</Banner>
          <Banner variant="success">Mensagem do aviso.</Banner>
        </div>
        <Narrow>
          <Banner
            variant="error"
            layout="narrow"
            action={<TextLink size="ui">Criar conta</TextLink>}
          >
            Mensagem do aviso.
          </Banner>
          <Banner variant="warning" layout="narrow">
            Mensagem do aviso.
          </Banner>
          <Banner variant="success" layout="narrow">
            Mensagem do aviso.
          </Banner>
        </Narrow>
      </Section>
    </main>
  );
}
