import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Upload, Loader2, ArrowLeft, Sparkles, Lock } from "lucide-react";
import { analizzaImmagineDemo, getGuestUsage as getGuestUsageFn, type AnalisiResult } from "@/lib/analisi.functions";
import { ShareDialog } from "@/components/share-dialog";
import { MealPicker, type Pasto } from "@/components/meal-picker";

export const Route = createFileRoute("/prova")({
  head: () => ({
    meta: [
      { title: "Prova gratis — kcalAI" },
      { name: "description", content: "Carica una foto del tuo piatto e scopri calorie, proteine, carboidrati e grassi. Nessuna registrazione richiesta." },
      { property: "og:title", content: "Prova kcalAI gratis — nessuna registrazione" },
      { property: "og:description", content: "Scatta una foto, vedi le calorie. Senza account." },
    ],
  }),
  component: ProvaPage,
});

const PENDING_KEY = "kcalai_pending_analisi";
const PENDING_PASTO_KEY = "kcalai_pending_pasto";

function msUntilLocalMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
  return next.getTime() - now.getTime();
}

function ProvaPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalisiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [newDay, setNewDay] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showShare, setShowShare] = useState(false);
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAnalizza = useServerFn(analizzaImmagineDemo);
  const fetchUsage = useServerFn(getGuestUsageFn);

  const refreshUsage = useCallback(async () => {
    try {
      const u = await fetchUsage();
      setUsage(u);
      return u;
    } catch {
      return null;
    }
  }, [fetchUsage]);

  useEffect(() => {
    refreshUsage();
    const schedule = () => {
      if (midnightTimer.current) clearTimeout(midnightTimer.current);
      midnightTimer.current = setTimeout(async () => {
        await refreshUsage();
        setNewDay(true);
        setError(null);
        schedule();
      }, msUntilLocalMidnight());
    };
    schedule();
    return () => { if (midnightTimer.current) clearTimeout(midnightTimer.current); };
  }, [refreshUsage]);

  const startUpload = useCallback((file: File) => {
    setError(null);
    setResult(null);
    setNewDay(false);
    if (usage && usage.remaining <= 0) {
      setError(`Hai usato le ${usage.limit} analisi gratuite di oggi. Si resetta a mezzanotte — oppure registrati gratis per continuare subito e salvare lo storico.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Immagine troppo grande (max 10MB).");
      return;
    }
    setPendingFile(file);
  }, [usage]);

  const runAnalysis = useCallback(async (pasto: Pasto) => {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setError("Impossibile leggere il file. Riprova.");
      setLoading(false);
    };
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      try {
        const res = await fetchAnalizza({ data: { imageBase64: base64, pasto } });
        const { _guest, ...analisi } = res as AnalisiResult & {
          _guest?: { used: number; limit: number; remaining: number };
        };
        setResult(analisi);
        if (_guest) setUsage(_guest); else refreshUsage();
        try {
          localStorage.setItem(PENDING_KEY, JSON.stringify(analisi));
          localStorage.setItem(PENDING_PASTO_KEY, pasto);
        } catch {}
        setShowShare(true);
      } catch (err: any) {
        const msg = err?.message || "Errore durante l'analisi. Riprova.";
        setError(
          msg.includes("limite") || msg.includes("GUEST_LIMIT")
            ? `Hai raggiunto il limite gratuito di oggi. Si resetta a mezzanotte — o registrati gratis per continuare ora.`
            : msg
        );
        refreshUsage();
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [pendingFile, fetchAnalizza, refreshUsage]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) startUpload(file);
  }, [startUpload]);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };




  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime">
              <Camera className="h-3.5 w-3.5 text-lime-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">kcalAI</span>
          </div>
          <Link
            to="/auth"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Accedi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!result && (
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-lime" />
              Demo gratuita · nessuna registrazione
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Carica una foto del tuo piatto</h1>
            <p className="mt-2 text-sm text-muted-foreground">L'AI ti dice calorie, proteine, carboidrati e grassi in pochi secondi.</p>
            {usage && (
              <p className="mt-3 text-xs text-muted-foreground">
                {newDay && "È un nuovo giorno — "}
                {usage.remaining > 0
                  ? `${usage.remaining} di ${usage.limit} analisi gratuite disponibili oggi.`
                  : `Limite gratuito esaurito. Si resetta a mezzanotte.`}
              </p>
            )}
          </div>
        )}

        {!result && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center transition-colors hover:border-lime"
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) startUpload(file);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={loading}
            />
            {preview ? (
              <img src={preview} alt="Anteprima" className="max-h-64 rounded-xl" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-background">
                <Upload className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <p className="mt-4 font-display text-lg font-semibold">
              {loading ? "Analisi in corso..." : "Scatta o carica una foto"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">JPG, PNG · trascina qui o tocca</p>
            {loading && <Loader2 className="mt-4 h-6 w-6 animate-spin text-lime" />}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              {preview && (
                <img src={preview} alt={result.nome_piatto} className="mx-auto mb-4 max-h-48 rounded-xl" />
              )}
              <h2 className="font-display text-2xl font-bold">{result.nome_piatto}</h2>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                Confidenza: <span className="font-semibold capitalize text-foreground">{result.confidenza}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: "Calorie", v: result.calorie, u: "kcal" },
                  { l: "Proteine", v: result.proteine_g, u: "g" },
                  { l: "Carbo", v: result.carboidrati_g, u: "g" },
                  { l: "Grassi", v: result.grassi_g, u: "g" },
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

              {result.ingredienti_principali.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingredienti</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.ingredienti_principali.map((ing) => (
                      <span key={ing} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.note && (
                <p className="mt-4 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                  {result.note}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-lime/40 bg-gradient-to-br from-lime/10 to-transparent p-6 text-center">
              <Lock className="mx-auto h-7 w-7 text-lime" />
              <h3 className="mt-3 font-display text-xl font-bold">Salva i tuoi risultati</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Registrati gratis per tenere lo storico, vedere i tuoi progressi e accedere alla ricerca ricette AI.
              </p>
              <Link
                to="/auth"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-6 py-3 text-sm font-semibold text-lime-foreground transition-colors hover:bg-lime/90"
              >
                Registrati gratis
              </Link>
              <button
                onClick={reset}
                className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Analizza un'altra foto
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
