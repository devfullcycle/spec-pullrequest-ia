// Página provisória: dá lugar à listagem de arquivos quando ela existir.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-2 bg-surface px-4 py-16">
      <h1 className="text-display text-ink">Gerenciador de arquivos</h1>
      <p className="text-body text-ink-muted">
        Seus arquivos na nuvem, em breve.
      </p>
    </main>
  );
}
