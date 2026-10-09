import { notFound } from "next/navigation";

/*
 * A vitrine mostra os componentes do design system fora de qualquer fluxo, para a validação
 * visual contra o Figma e para os testes no navegador. Ela só existe no servidor de
 * desenvolvimento: no build de produção, todas as rotas daqui respondem 404.
 */
export default function VitrineLayout({ children }: LayoutProps<"/vitrine">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
