import { TextField } from "@/components/ui/text-field";

type EmailFieldProps = {
  /** O e-mail digitado no envio anterior, que volta ao campo. */
  defaultValue?: string;
  error?: string;
};

/** O campo de e-mail dos formulários de autenticação. */
export function EmailField({ defaultValue, error }: EmailFieldProps) {
  return (
    <TextField
      label="E-mail"
      name="email"
      type="email"
      autoComplete="email"
      placeholder="nome@exemplo.com"
      defaultValue={defaultValue}
      error={error}
    />
  );
}
