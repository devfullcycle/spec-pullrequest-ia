import { connection } from "next/server";
import { Suspense } from "react";
import { apiRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-messages";

type Probe = {
  /** Prefixo dos `data-testid` do resultado. */
  testId: string;
  timeoutMs?: number;
};

/** Chama uma rota que a API não tem e mostra o erro tipado, com a mensagem traduzida. */
async function MissingRoute({ testId, timeoutMs }: Probe) {
  // Sem isto, o servidor de desenvolvimento ensaia a renderização e reaproveita a resposta
  // que chegou depois do prazo, e o caso do prazo estourado nunca aparece.
  await connection();
  const result = await apiRequest("/vitrine/rota-que-nao-existe", {
    timeoutMs,
  });
  if (result.ok) return <p className="text-body text-ink">A rota respondeu.</p>;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body text-ink">
      <dt className="text-ink-muted">code</dt>
      <dd data-testid={`${testId}-code`}>{result.error.code}</dd>
      <dt className="text-ink-muted">status</dt>
      <dd data-testid={`${testId}-status`}>{result.error.status}</dd>
      <dt className="text-ink-muted">mensagem</dt>
      <dd data-testid={`${testId}-mensagem`}>{errorMessage(result.error.code)}</dd>
    </dl>
  );
}

function Section({ title, ...probe }: Probe & { title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title text-ink">{title}</h2>
      <Suspense
        fallback={<p className="text-body text-ink-muted">Chamando a API…</p>}
      >
        <MissingRoute {...probe} />
      </Suspense>
    </section>
  );
}

export default function VitrineApiPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-canvas p-6">
      <h1 className="text-display text-ink">Cliente da API</h1>
      <Section title="Rota inexistente" testId="rota" />
      {/* Com 1 ms de prazo, a API nunca responde a tempo. */}
      <Section title="Prazo estourado" testId="prazo" timeoutMs={1} />
    </main>
  );
}
