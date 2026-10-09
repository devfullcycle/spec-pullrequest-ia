import {
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type Variant = "error" | "warning" | "success";

type BannerProps = {
  variant: Variant;
  /** `narrow` é para um contêiner estreito, como o cartão de autenticação. */
  layout?: "wide" | "narrow";
  /** Um `TextLink`. Fica à direita no layout largo e abaixo do texto no estreito. */
  action?: ReactNode;
  children: ReactNode;
};

const VARIANTS: Record<
  Variant,
  { icon: LucideIcon; surface: string; iconColor: string }
> = {
  error: {
    icon: CircleAlert,
    surface: "bg-danger-soft",
    iconColor: "text-danger",
  },
  warning: {
    icon: TriangleAlert,
    surface: "bg-warning-soft",
    iconColor: "text-warning",
  },
  success: {
    icon: CircleCheck,
    surface: "bg-success-soft",
    iconColor: "text-success",
  },
};

export function Banner({
  variant,
  layout = "wide",
  action,
  children,
}: BannerProps) {
  const { icon: Icon, surface, iconColor } = VARIANTS[variant];
  const narrow = layout === "narrow";

  return (
    <div
      // Um erro interrompe a leitura de tela; alerta e sucesso esperam a vez.
      role={variant === "error" ? "alert" : "status"}
      className={`${surface} flex w-full items-start gap-3 px-4 py-3 ${narrow ? "rounded-sm" : ""}`}
    >
      <Icon className={`${iconColor} size-5 shrink-0`} />
      <div
        className={`flex min-w-0 flex-1 items-start ${narrow ? "flex-col gap-1" : "gap-3"}`}
      >
        <p className="min-w-0 flex-1 text-ui text-ink">{children}</p>
        {action}
      </div>
    </div>
  );
}
