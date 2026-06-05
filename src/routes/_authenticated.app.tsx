import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, Upload, Loader2, ChevronRight, History, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analizzaImmagine, getStorico, type AnalisiResult } from "@/lib/analisi.functions";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppPage,
});

function AppPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalisiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchAnalizza = useServerFn(analizzaImmagine);
  const fetchStorico = useServerFn(getStorico);

  const storicoQuery = useQuery({
    queryKey: ["storico"],
    queryFn: () => fetchStorico(),
    enabled: showHistory,
  });

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setLoading(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        setPreview(reader.result as string);

        try {
          const res = await fetchAnalizza({ data: { imageBase64: base64 } });
          setResult(res);
        } catch (err: any) {
          setError(err?.message || "Errore durante l'analisi");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [fetchAnalizza]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
              <Camera className="h-4 w-4 text-lime-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">kcalAI</span>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <History className="h-4 w-4" />
            Storico
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!showHistory ? (
          <div className="space-y-8">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center transition-colors hover:border-lime"
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="mb-4 max-h-64 rounded-xl object-cover"
                />
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold">
                    Carica una foto del tuo piatto
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Trascina qui oppure clicca per scegliere. Scatta direttamente con la fotocamera.
                  </p>
                </>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-lime" />
                <p className="text-sm text-muted-foreground">Analizzando il piatto con AI...</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            {result && !loading && (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="bg-lime p-6 text-center text-lime-foreground">
                  <p className="text-sm font-medium uppercase tracking-wider opacity-80">Calorie stimate</p>
                  <p className="font-display text-6xl font-extrabold leading-none mt-2">
                    {Math.round(result.calorie)}
                  </p>
                  <p className="mt-1 text-sm font-medium opacity-80">kcal</p>
                </div>

                <div className="p-6">
                  <h4 className="font-display text-lg font-semibold">{result.nome_piatto}</h4>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    Confidenza: {result.confidenza}
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <MacroCard label="Proteine" value={result.proteine_g} unit="g" />
                    <MacroCard label="Carboidrati" value={result.carboidrati_g} unit="g" />
                    <MacroCard label="Grassi" value={result.grassi_g} unit="g" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <MacroCard label="Fibre" value={result.fibre_g} unit="g" />
                    <MacroCard label="Zuccheri" value={result.zuccheri_g} unit="g" />
                    <MacroCard label="Sodio" value={result.sodio_mg} unit="mg" />
                  </div>

                  {result.ingredienti_principali.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Ingredienti rilevati
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.ingredienti_principali.map((ing, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.note && (
                    <p className="mt-4 text-sm text-muted-foreground">{result.note}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setShowHistory(false)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4 rotate-180" /> Torna all'upload
            </button>
            <h2 className="font-display text-2xl font-bold">Storico analisi</h2>
            {storicoQuery.isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
              </div>
            ) : storicoQuery.data?.storico.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Nessuna analisi effettuata.</p>
            ) : (
              <div className="space-y-3">
                {storicoQuery.data?.storico.map((item: any) => {
                  const r = item.risultato_json as AnalisiResult;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-semibold">{r.nome_piatto}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-bold text-lime">
                            {Math.round(r.calorie)}
                          </p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>P: {r.proteine_g}g</span>
                        <span>C: {r.carboidrati_g}g</span>
                        <span>G: {r.grassi_g}g</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MacroCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-foreground">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
