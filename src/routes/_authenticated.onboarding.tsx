import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ChevronLeft, ChevronRight, Check, Loader as Loader2 } from "lucide-react";
import { saveOnboarding } from "@/lib/coach.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Benvenuto — kcalAI" },
      { name: "description", content: "Configura il tuo profilo per ricevere un piano calorico personalizzato." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: OnboardingPage,
});

type Form = {
  sesso?: "uomo" | "donna";
  eta?: number;
  altezza_cm?: number;
  peso_kg?: number;
  peso_target_kg?: number;
  stile_vita?: "sedentario" | "leggero" | "moderato" | "attivo";
  obiettivo?: "perdere" | "mantenere" | "aumentare";
};

const STEPS = ["Sesso", "Età", "Altezza", "Peso attuale", "Peso obiettivo", "Stile di vita", "Obiettivo"];

function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ target_kcal: number; target_proteine_g: number; target_carbo_g: number; target_grassi_g: number } | null>(null);
  const save = useServerFn(saveOnboarding);

  const canNext = (() => {
    switch (step) {
      case 0: return !!form.sesso;
      case 1: return !!form.eta && form.eta >= 12 && form.eta <= 100;
      case 2: return !!form.altezza_cm && form.altezza_cm >= 120 && form.altezza_cm <= 230;
      case 3: return !!form.peso_kg && form.peso_kg >= 30 && form.peso_kg <= 300;
      case 4: return !!form.peso_target_kg && form.peso_target_kg >= 30 && form.peso_target_kg <= 300;
      case 5: return !!form.stile_vita;
      case 6: return !!form.obiettivo;
      default: return false;
    }
  })();

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await save({ data: form as Required<Form> });
      setDone({
        target_kcal: res.target_kcal,
        target_proteine_g: res.target_proteine_g,
        target_carbo_g: res.target_carbo_g,
        target_grassi_g: res.target_grassi_g,
      });
    } catch (e: any) {
      setError(e?.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime/20">
            <Check className="h-8 w-8 text-lime" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Il tuo piano è pronto</h1>
          <p className="mt-2 text-sm text-muted-foreground">In base ai tuoi dati abbiamo calcolato:</p>
          <div className="mt-6 rounded-xl bg-lime p-6 text-lime-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Calorie giornaliere</p>
            <p className="mt-1 font-display text-5xl font-extrabold">{done.target_kcal}</p>
            <p className="mt-1 text-xs font-semibold opacity-80">kcal</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Proteine</p>
              <p className="mt-1 font-display font-bold">{done.target_proteine_g}g</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Carbo</p>
              <p className="mt-1 font-display font-bold">{done.target_carbo_g}g</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Grassi</p>
              <p className="mt-1 font-display font-bold">{done.target_grassi_g}g</p>
            </div>
          </div>
          <button
            onClick={() => { router.navigate({ to: "/app" }); }}
            className="mt-6 w-full rounded-xl bg-lime py-3 font-semibold text-lime-foreground hover:bg-lime/90"
          >
            Inizia ora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime">
            <Camera className="h-5 w-5 text-lime-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">kcalAI</span>
        </div>

        {/* progress */}
        <div className="mb-6 flex items-center gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-lime" : "bg-border"}`} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Passo {step + 1} di {STEPS.length}</p>
          <h1 className="mt-2 font-display text-2xl font-bold">{STEPS[step]}</h1>

          <div className="mt-6">
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {(["uomo", "donna"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, sesso: s }))}
                    className={`rounded-xl border-2 p-6 text-center font-semibold transition-colors ${
                      form.sesso === s ? "border-lime bg-lime/10" : "border-border bg-background hover:border-lime/50"
                    }`}
                  >
                    {s === "uomo" ? "👨 Uomo" : "👩 Donna"}
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <NumberInput
                value={form.eta}
                onChange={(v) => setForm((f) => ({ ...f, eta: v }))}
                placeholder="es. 30"
                suffix="anni"
                min={12}
                max={100}
              />
            )}

            {step === 2 && (
              <NumberInput
                value={form.altezza_cm}
                onChange={(v) => setForm((f) => ({ ...f, altezza_cm: v }))}
                placeholder="es. 175"
                suffix="cm"
                min={120}
                max={230}
              />
            )}

            {step === 3 && (
              <NumberInput
                value={form.peso_kg}
                onChange={(v) => setForm((f) => ({ ...f, peso_kg: v }))}
                placeholder="es. 75"
                suffix="kg"
                min={30}
                max={300}
                allowDecimal
              />
            )}

            {step === 4 && (
              <NumberInput
                value={form.peso_target_kg}
                onChange={(v) => setForm((f) => ({ ...f, peso_target_kg: v }))}
                placeholder="es. 70"
                suffix="kg"
                min={30}
                max={300}
                allowDecimal
              />
            )}

            {step === 5 && (
              <div className="space-y-2">
                {([
                  { id: "sedentario", label: "Sedentario", desc: "Lavoro d'ufficio, poca attività" },
                  { id: "leggero", label: "Leggero", desc: "Cammino o sport 1-3 volte/sett" },
                  { id: "moderato", label: "Moderato", desc: "Sport 3-5 volte/sett" },
                  { id: "attivo", label: "Attivo", desc: "Sport intenso 6-7 volte/sett" },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setForm((f) => ({ ...f, stile_vita: o.id }))}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
                      form.stile_vita === o.id ? "border-lime bg-lime/10" : "border-border bg-background hover:border-lime/50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{o.desc}</p>
                    </div>
                    {form.stile_vita === o.id && <Check className="h-5 w-5 text-lime" />}
                  </button>
                ))}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-2">
                {([
                  { id: "perdere", label: "Perdere peso", emoji: "📉" },
                  { id: "mantenere", label: "Mantenere il peso", emoji: "⚖️" },
                  { id: "aumentare", label: "Aumentare massa", emoji: "💪" },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setForm((f) => ({ ...f, obiettivo: o.id }))}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
                      form.obiettivo === o.id ? "border-lime bg-lime/10" : "border-border bg-background hover:border-lime/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{o.emoji}</span>
                      <span className="font-semibold">{o.label}</span>
                    </div>
                    {form.obiettivo === o.id && <Check className="h-5 w-5 text-lime" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Indietro
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-lime-foreground hover:bg-lime/90 disabled:opacity-40"
              >
                Continua <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canNext || loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-lime-foreground hover:bg-lime/90 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Calcola il mio piano
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberInput({
  value, onChange, placeholder, suffix, min, max, allowDecimal,
}: {
  value?: number; onChange: (n: number | undefined) => void;
  placeholder: string; suffix: string; min: number; max: number; allowDecimal?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        step={allowDecimal ? "0.1" : "1"}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(undefined);
          const n = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
          onChange(isNaN(n) ? undefined : n);
        }}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-xl border-2 border-border bg-background px-4 py-4 pr-16 text-center font-display text-3xl font-bold focus:border-lime focus:outline-none"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}
