import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, Loader2, ChevronRight, History, LogOut, BookOpen, Crown, Settings, Droplet, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analizzaImmagine, getStorico, salvaAnalisi, type AnalisiResult } from "@/lib/analisi.functions";
import { checkSubscription, createCheckout, customerPortal } from "@/lib/stripe.functions";
import { getCoachOggi, aggiungiIdratazione } from "@/lib/coach.functions";
import { ShareDialog } from "@/components/share-dialog";
import { MealPicker, type Pasto } from "@/components/meal-picker";
import { ProgressRing } from "@/components/progress-ring";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Coach AI — kcalAI" },
      { name: "description", content: "Coach AI: calorie e idratazione giornaliere, analisi foto e storico dei pasti." },
      { property: "og:title", content: "Coach AI kcalAI" },
      { property: "og:description", content: "Calorie e idratazione di oggi, in un colpo d'occhio." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalisiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showShare, setShowShare] = useState(false);

  const qc = useQueryClient();
  const fetchAnalizza = useServerFn(analizzaImmagine);
  const fetchStorico = useServerFn(getStorico);
  const fetchCheck = useServerFn(checkSubscription);
  const fetchCheckout = useServerFn(createCheckout);
  const fetchPortal = useServerFn(customerPortal);
  const fetchSalva = useServerFn(salvaAnalisi);
  const fetchCoach = useServerFn(getCoachOggi);
  const fetchIdr = useServerFn(aggiungiIdratazione);

  const subQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchCheck(),
    staleTime: 60_000,
  });
  const piano = subQuery.data?.piano ?? "free";

  const coachQuery = useQuery({
    queryKey: ["coach-oggi"],
    queryFn: () => fetchCoach(),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("upgraded") === "1") {
      subQuery.refetch();
      window.history.replaceState({}, "", "/app");
    }
    if (typeof window !== "undefined") {
      const pending = localStorage.getItem("kcalai_pending_analisi");
      const pendingPasto = localStorage.getItem("kcalai_pending_pasto");
      if (pending) {
        try {
          const risultato = JSON.parse(pending) as AnalisiResult;
          fetchSalva({ data: { risultato, pasto: (pendingPasto as Pasto | null) ?? undefined } })
            .then(() => {
              localStorage.removeItem("kcalai_pending_analisi");
              localStorage.removeItem("kcalai_pending_pasto");
              setResult(risultato);
              qc.invalidateQueries({ queryKey: ["coach-oggi"] });
            })
            .catch(() => {});
        } catch {
          localStorage.removeItem("kcalai_pending_analisi");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (plan: "pro" | "ristorante") => {
    const { url } = await fetchCheckout({ data: { plan } });
    if (url) window.location.href = url;
  };
  const openPortal = async () => {
    const { url } = await fetchPortal();
    if (url) window.location.href = url;
  };

  const storicoQuery = useQuery({
    queryKey: ["storico"],
    queryFn: () => fetchStorico(),
    enabled: showHistory,
  });

  const startUpload = useCallback((file: File) => {
    setError(null);
    setResult(null);
    setPendingFile(file);
  }, []);

  const runAnalysis = useCallback(async (pasto: Pasto) => {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setError("Impossibile leggere il file.");
      setLoading(false);
    };
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      try {
        const res = await fetchAnalizza({ data: { imageBase64: base64, pasto } });
        setResult(res);
        qc.invalidateQueries({ queryKey: ["coach-oggi"] });
        qc.invalidateQueries({ queryKey: ["storico"] });
        setShowShare(true);
      } catch (err: any) {
        setError(err?.message || "Errore durante l'analisi");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [pendingFile, fetchAnalizza, qc]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) startUpload(file);
  }, [startUpload]);

  const addWater = async (ml: number) => {
    await fetchIdr({ data: { ml } });
    qc.invalidateQueries({ queryKey: ["coach-oggi"] });
  };

  const coach = coachQuery.data;

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
          <div className="flex items-center gap-2">
            <Link to="/ricette" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted">
              <BookOpen className="h-4 w-4" />Ricette
            </Link>
            <button onClick={() => setShowHistory(!showHistory)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted">
              <History className="h-4 w-4" />Storico
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />Esci
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-surface/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Crown className={`h-3.5 w-3.5 ${piano !== "free" ? "text-lime" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">Piano:</span>
            <span className="font-semibold uppercase tracking-wide">{piano}</span>
          </div>
          {piano === "free" ? (
            <button onClick={() => handleUpgrade("pro")} className="font-semibold text-lime hover:underline">
              Passa a Pro · €9.99/mese →
            </button>
          ) : (
            <button onClick={openPortal} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Settings className="h-3 w-3" /> Gestisci abbonamento
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!showHistory ? (
          <div className="space-y-8">
            {/* Coach rings */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">Coach AI · Oggi</h1>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  <ProgressRing
                    value={coach?.kcal_oggi ?? 0}
                    max={coach?.target_kcal ?? 2000}
                    color="#a3e635"
                    label="Calorie"
                    unit="kcal"
                  />
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3 text-lime" /> {coach?.analisi.length ?? 0} pasti registrati
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <ProgressRing
                    value={coach?.ml_oggi ?? 0}
                    max={coach?.target_ml ?? 2000}
                    color="#38bdf8"
                    label="Idratazione"
                    unit="ml"
                  />
                  <div className="mt-3 flex gap-2">
                    {[250, 500, 750].map((ml) => (
                      <button
                        key={ml}
                        onClick={() => addWater(ml)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20"
                      >
                        <Droplet className="h-3 w-3" />+{ml}ml
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {coach && coach.analisi.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pasti di oggi</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {coach.analisi.map((a) => (
                      <li key={a.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                        <div>
                          <span className="text-xs uppercase text-muted-foreground">{a.pasto}</span>{" "}
                          <span className="font-medium">{a.nome}</span>
                        </div>
                        <span className="font-display font-bold text-lime">{Math.round(a.kcal)} kcal</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Upload */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center hover:border-lime"
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Carica una foto del piatto"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) startUpload(file);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {preview ? (
                <img src={preview} alt="Anteprima del pasto" className="mb-4 max-h-64 rounded-xl object-cover" />
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">Aggiungi un pasto</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Trascina una foto o clicca per scegliere. Ti chiediamo che pasto stai facendo.
                  </p>
                </>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-4">
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
                  <p className="mt-2 font-display text-6xl font-extrabold leading-none">{Math.round(result.calorie)}</p>
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
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ingredienti rilevati</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.ingredienti_principali.map((ing, i) => (
                          <span key={i} className="rounded-full border border-border bg-background px-3 py-1 text-xs">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.note && <p className="mt-4 text-sm text-muted-foreground">{result.note}</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setShowHistory(false)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 rotate-180" /> Torna al coach
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
                    <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-semibold">{r.nome_piatto}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.pasto && <span className="uppercase">{item.pasto} · </span>}
                            {new Date(item.created_at).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-bold text-lime">{Math.round(r.calorie)}</p>
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

      {pendingFile && <MealPicker onPick={runAnalysis} onCancel={() => setPendingFile(null)} />}
      <ShareDialog open={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
}

function MacroCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
