import type { ComponentProps, ReactNode } from "react";

type ButtonIconProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children" | "className"
> & {
  /** Um botão só com ícone não tem texto: o rótulo é o único nome que o leitor de tela lê. */
  "aria-label": string;
  /** O ícone do Lucide, já no tamanho do contexto: 16px dentro de campos, 20px em barras. */
  children: ReactNode;
  /** `36` é a ação de precisão com ponteiro, e sobe para 44px abaixo de `lg`, onde há toque. */
  size?: 36 | 44;
};

const SIZES = {
  36: "size-11 lg:size-9",
  44: "size-11",
};

export function ButtonIcon({
  children,
  size = 36,
  type = "button",
  ...props
}: ButtonIconProps) {
  return (
    <button
      type={type}
      className={`${SIZES[size]} focus-ring flex shrink-0 items-center justify-center rounded-full text-ink-muted transition-[color,background-color,scale] duration-150 enabled:hover:bg-surface-hover enabled:hover:text-ink enabled:active:scale-95 disabled:text-ink-disabled motion-reduce:enabled:active:scale-100`}
      {...props}
    >
      {children}
    </button>
  );
}
