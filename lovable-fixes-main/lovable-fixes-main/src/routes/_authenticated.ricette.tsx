import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2, Clock, Users, ChefHat, Youtube, ArrowLeft, Lock } from "lucide-react";
import { cercaRicetta, type Ricetta } from "@/lib/ricetta.functions";
import { createCheckout } from "@/lib/stripe.functions";

export const Route = createFileRoute("/_authenticated/ricette")({
  head: () => ({
    meta: [
      { title: "Ricette AI — kcalAI" },
      { name: "description", content: "Cerca un piatto e l'AI ti dà ingredienti, procedimento, video YouTube e valori nutrizionali per porzione. Incluso nel piano Pro di kcalAI." },
      { property: "og:title", content: "Ricette AI — kcalAI" },
      { property: "og:description", content: "Cerca un piatto: ingredienti, procedimento, video YouTube e valori nutrizionali generati dall'AI." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: RicettePage,
});

function RicettePage() {
  const [q, setQ] = useState("");
  const [ricetta, setRicetta] = useState<Ricetta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const fetchRicetta = useServerFn(cercaRicetta);
  const fetchCheckout = useServerFn(createCheckout);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setRicetta(null);
    setNeedsUpgrade(false);
    try {
      const r = await fetchRicetta({ data: { piatto: q.trim() } });
      setRicetta(r);
    } catch (err: any) {
      const msg = err?.message || "Errore durante la ricerca";
      if (msg.includes("UPGRADE_REQUIRED")) {
        setNeedsUpgrade(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const upgrade = async () => {
    const { url } = await fetchCheckout({ data: { plan: "pro" } });
    if (url) window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Indietro
          </Link>
          <span className="font-display text-lg font-bold tracking-tight">Ricette AI</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Cerca una ricetta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          L'AI ti spiega come prepararla, con video YouTube e valori nutrizionali.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="es. Carbonara, Tiramisù, Pad Thai..."
              maxLength={120}
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-lime-foreground transition-colors hover:bg-lime/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
          </button>
        </form>

        {needsUpgrade && (
          <div className="mt-8 rounded-2xl border border-lime/30 bg-lime/5 p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-lime" />
            <h3 className="mt-3 font-display text-xl font-semibold">Funzione Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              La ricerca ricette con video e valori nutrizionali è inclusa nel piano Pro.
            </p>
            <button
              onClick={upgrade}
              className="mt-4 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-lime-foreground hover:bg-lime/90"
            >
              Passa a Pro · €9.99/mese
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {ricetta && (
          <div className="mt-8 space-y-6">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Recipe",
                  name: ricetta.nome,
                  recipeYield: `${ricetta.porzioni} porzioni`,
                  totalTime: `PT${ricetta.tempo_minuti}M`,
                  recipeIngredient: ricetta.ingredienti.map((i) => `${i.quantita} ${i.nome}`.trim()),
                  recipeInstructions: ricetta.procedimento.map((step, i) => ({
                    "@type": "HowToStep",
                    position: i + 1,
                    text: step,
                  })),
                  nutrition: {
                    "@type": "NutritionInformation",
                    calories: `${Math.round(ricetta.nutrizione_per_porzione.calorie)} kcal`,
                    proteinContent: `${Math.round(ricetta.nutrizione_per_porzione.proteine_g)} g`,
                    carbohydrateContent: `${Math.round(ricetta.nutrizione_per_porzione.carboidrati_g)} g`,
                    fatContent: `${Math.round(ricetta.nutrizione_per_porzione.grassi_g)} g`,
                  },
                }),
              }}
            />
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-2xl font-bold">{ricetta.nome}</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {ricetta.porzioni} porzioni</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {ricetta.tempo_minuti} min</span>
                <span className="inline-flex items-center gap-1"><ChefHat className="h-4 w-4" /> {ricetta.difficolta}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(ricetta.youtube_query)}`}
                  title={`Video ricetta ${ricetta.nome}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ricetta.youtube_query)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 border-t border-border bg-background px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <Youtube className="h-4 w-4" /> Apri ricerca su YouTube
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-display text-lg font-semibold">Valori nutrizionali (per porzione)</h3>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { l: "Calorie", v: ricetta.nutrizione_per_porzione.calorie, u: "kcal" },
                  { l: "Proteine", v: ricetta.nutrizione_per_porzione.proteine_g, u: "g" },
                  { l: "Carbo", v: ricetta.nutrizione_per_porzione.carboidrati_g, u: "g" },
                  { l: "Grassi", v: ricetta.nutrizione_per_porzione.grassi_g, u: "g" },
                ].map((m) => (
                  <div key={m.l} className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">{m.l}</p>
                    <p className="mt-1 font-display text-xl font-bold">
                      {Math.round(m.v)}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">{m.u}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-display text-lg font-semibold">Ingredienti</h3>
              <ul className="mt-4 space-y-2">
                {ricetta.ingredienti.map((ing, i) => (
                  <li key={i} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                    <span className="text-foreground">{ing.nome}</span>
                    <span className="text-muted-foreground">{ing.quantita}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-display text-lg font-semibold">Procedimento</h3>
              <ol className="mt-4 space-y-3">
                {ricetta.procedimento.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-lime-foreground">
                      {i + 1}
                    </span>
                    <span className="text-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
