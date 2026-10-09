import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  /** Parágrafo que explica o passo, logo abaixo do título. */
  support?: ReactNode;
  /** Aviso, campos, botão e links, nessa ordem. Nas telas sem formulário, só a ação seguinte. */
  children: ReactNode;
};

/** A página de autenticação inteira: o fundo e o cartão centrado. */
export function AuthCard({ title, support, children }: AuthCardProps) {
  return (
    <main className="flex flex-1 flex-col items-center bg-surface px-4 py-16">
      <div className="flex w-full max-w-100 flex-col gap-6 rounded-lg bg-canvas p-8">
        {/* O produto ainda não tem nome nem logotipo: a marca é um marcador de texto. */}
        <p className="text-body-strong text-ink">Gerenciador de arquivos</p>
        <div className="flex flex-col gap-2">
          <h1 className="text-display text-ink">{title}</h1>
          {support && <p className="text-body text-ink-muted">{support}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
