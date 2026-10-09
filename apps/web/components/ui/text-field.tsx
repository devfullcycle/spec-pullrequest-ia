import { CircleAlert } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

export type TextFieldProps = Omit<
  ComponentProps<"input">,
  "className" | "aria-invalid" | "aria-describedby"
> & {
  label: string;
  /** Texto de ajuda, abaixo do campo. Some quando há erro. */
  helper?: string;
  /** Mensagem de erro do campo. Diz o que corrigir, e não só que há um erro. */
  error?: string;
  /** Controle encaixado à direita, dentro da caixa do campo, como o botão de exibir a senha. */
  trailing?: ReactNode;
};

export function TextField({
  label,
  helper,
  error,
  trailing,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-mensagem`;
  const message = error || helper;

  // O hover muda a borda, e não o fundo: um campo com fundo cinza parece desabilitado.
  const box = error
    ? "border-2 border-danger"
    : "border border-hairline-strong hover:border-ink has-[input:disabled]:border-hairline";

  return (
    <div className="group flex w-full flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-ui-strong text-ink group-has-[input:disabled]:text-ink-disabled"
      >
        {label}
      </label>
      <div
        className={`${box} focus-ring-within flex h-11 items-center rounded-sm bg-canvas transition-[border-color] duration-150 has-[input:disabled]:bg-fill-disabled`}
      >
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="h-full min-w-0 flex-1 rounded-sm bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-muted disabled:text-ink-disabled disabled:placeholder:text-ink-disabled"
          {...props}
        />
        {trailing}
      </div>
      {message && (
        <p
          id={messageId}
          className={`flex gap-1 text-caption ${
            error
              ? "text-danger"
              : "text-ink-muted group-has-[input:disabled]:text-ink-disabled"
          }`}
        >
          {error && <CircleAlert className="size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
