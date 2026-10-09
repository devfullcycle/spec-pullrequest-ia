import Link from "next/link";
import type { ComponentProps } from "react";

type Size = "body" | "ui" | "inherit";

type AnchorProps = Omit<ComponentProps<typeof Link>, "className">;

/** Sem `href`, é uma ação com cara de link, como o "Reenviar e-mail" de um aviso. */
type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  href?: undefined;
};

type TextLinkProps = (AnchorProps | ButtonProps) & {
  /** `inherit` é para o link no meio de uma frase, que segue o tamanho do texto em volta. */
  size?: Size;
};

const SIZES: Record<Size, string> = {
  body: "text-body",
  ui: "text-ui",
  inherit: "",
};

export function TextLink({ size = "body", ...props }: TextLinkProps) {
  const className = `${SIZES[size]} focus-ring text-primary hover:underline focus-visible:underline`;

  if (props.href !== undefined) {
    return <Link className={className} {...props} />;
  }

  const { type = "button", ...rest } = props;
  return <button type={type} className={className} {...rest} />;
}
