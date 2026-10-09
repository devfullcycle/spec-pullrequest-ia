import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  href?: undefined;
  /** Mostra o spinner e bloqueia o clique, sem tirar o botão do estado ativo. */
  loading?: boolean;
};

/** Quando a ação principal é ir a outra tela, o botão é um link com a mesma aparência. */
type LinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
};

type ButtonPrimaryProps = (ButtonProps | LinkProps) & {
  /** Nos formulários do cartão de autenticação, o botão ocupa a largura toda. */
  fullWidth?: boolean;
};

// Carregando, o botão está `disabled` mas continua com a cara de ativo: só o `aria-busy` o distingue.
const CLASSES =
  "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-primary-fill px-5.5 text-ui-strong whitespace-nowrap text-on-fill transition-[background-color,scale] duration-150 not-disabled:hover-overlay not-disabled:active:scale-95 motion-reduce:not-disabled:active:scale-100 disabled:not-aria-busy:bg-fill-disabled disabled:not-aria-busy:text-ink-disabled";

export function ButtonPrimary({ fullWidth, ...props }: ButtonPrimaryProps) {
  const width = fullWidth ? "w-full" : "";

  if (props.href !== undefined) {
    return <Link className={`${CLASSES} ${width}`} {...props} />;
  }

  const { loading = false, disabled, children, ...rest } = props;

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${CLASSES} ${width}`}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
