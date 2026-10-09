import { Suspense } from "react";
import { apiRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-messages";

/** Chama uma rota que a API não tem, para mostrar o erro tipado e a mensagem traduzida. */
async function MissingRoute() {
  const result = await apiRequest("/vitrine/rota-que-nao-existe");
  if (result.ok) return <p className="text-body text-ink">A rota respondeu.</p>;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body text-ink">
      <dt className="text-ink-muted">code</dt>
      <dd data-testid="code">{result.error.code}</dd>
      <dt className="text-ink-muted">status</dt>
      <dd data-testid="status">{result.error.status}</dd>
      <dt className="text-ink-muted">mensagem</dt>
      <dd data-testid="mensagem">{errorMessage(result.error.code)}</dd>
    </dl>
  );
}

export default function VitrineApiPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-canvas p-6">
      <h1 className="text-display text-ink">Cliente da API</h1>
      <Suspense fallback={<p className="text-body text-ink-muted">Chamando a API…</p>}>
        <MissingRoute />
      </Suspense>
    </main>
  );
}
