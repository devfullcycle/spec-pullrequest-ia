import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { getCurrentUser } from "@/lib/dal/user";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Início" };

async function SignedInAs() {
  const user = await getCurrentUser();
  return (
    <p className="text-body text-ink-muted">
      Você entrou como <span className="text-ink">{user.email}</span>.
    </p>
  );
}

// Página provisória: dá lugar à listagem de arquivos quando ela existir.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-surface px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-display text-ink">Gerenciador de arquivos</h1>
        <Suspense>
          <SignedInAs />
        </Suspense>
      </div>
      <form action={logout}>
        <ButtonPrimary type="submit">Sair</ButtonPrimary>
      </form>
    </main>
  );
}
