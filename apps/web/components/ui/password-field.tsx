"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { ButtonIcon } from "@/components/ui/button-icon";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";

type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailing">;

export function PasswordField({ disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      type={visible ? "text" : "password"}
      disabled={disabled}
      trailing={
        <ButtonIcon
          size={44}
          aria-label={visible ? "Ocultar senha" : "Exibir senha"}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon className="size-4" />
        </ButtonIcon>
      }
      {...props}
    />
  );
}
