import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Check, ShieldCheck, Camera, ArrowLeft, Users } from "lucide-react";
import { getStats } from "@/lib/coach.functions";
import { LaunchBanner } from "@/components/launch-banner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Prezzi — kcalAI" },
      { name: "description", content: "Piani: Free, Medium €3.49/mese, Pro €9.99/mese. Annulla quando vuoi." },
      { property: "og:title", content: "Prezzi kcalAI — Annulla quando vuoi" },
      { property: "og:description", content: "Annulla quando vuoi · Nessun contratto · Supporto email incluso · Rimborso 30 giorni." },
      { property: "og:url", content: "https://kcalvison.lovable.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://kcalvison.lovable.app/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const fetchStats = useServerFn(getStats);
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), staleTime: 60_000 });

  const plans = [
    {
      key: "free",
      name: "Free",
      price: "€0",
      period: "/mese",
      desc: "Per iniziare a tracciare i pasti.",
      features: ["5 analisi foto al giorno", "Storico analisi", "Coach calorie & idratazione"],
      cta: "Inizia gratis",
      highlight: false,
    },
    {
      key: "promo",
      name: "Offerta Lampo",
      price: "€1.49",
      period: "/mese",
      desc: "Offerta limitata solo per oggi.",
      features: ["Prezzo promozionale", "Accesso completo per il periodo promozionale"],
      cta: "Prendi l'offerta",
      highlight: true,
    },
    {
      key: "smart",
      name: "Smart",
      price: "€3.49",
      period: "/mese",
      desc: "Ideale per chi inizia, tracciamento base.",
      features: ["Tracciamento base", "Storico settimanale", "Esportazioni CSV"],
      cta: "Scegli Smart",
      highlight: false,
    },
    {
      key: "elite",
      name: "Elite",
      price: "€9.99",
      period: "/mese",
      desc: "Il più venduto: Coach AI illimitato, analisi avanzate.",
      features: ["Analisi foto illimitate", "Coach AI illimitato", "Report PDF/CSV", "Priorità supporto"],
      cta: "Passa a Elite",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LaunchBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
              <Camera className="h-4 w-4 text-lime-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">kcalAI</span>
          </div>
          <Link to="/auth" className="rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-lime-foreground hover:bg-lime/90">
            Inizia gratis
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Scegli il tuo piano</h1>
          <p className="mt-3 text-muted-foreground">Trasparente. Senza sorprese. Annulla quando vuoi.</p>
          {stats.data && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm">
              <Users className="h-4 w-4 text-lime" />
              <span className="font-semibold">{stats.data.utenti.toLocaleString("it-IT")}</span>
              <span className="text-muted-foreground">utenti usano kcalAI</span>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl border p-6 ${plan.highlight ? "border-lime bg-surface" : "border-border bg-surface"}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime px-3 py-0.5 text-xs font-semibold text-lime-foreground">
                  Più popolare
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.key === 'free' ? (
                <Link to="/auth" className="mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted">
                  {plan.cta}
                </Link>
              ) : (
                <a href={`/auth?plan=${plan.key}`} className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${plan.highlight ? "bg-lime text-lime-foreground hover:bg-lime/90" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
                  {plan.cta}
                </a>
              )}

              {plan.name !== "Free" && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-lime/30 bg-lime/5 p-3 text-xs">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  <div>
                    <p className="font-semibold">Soddisfatti o rimborsati 30 giorni</p>
                    <p className="text-muted-foreground">Rimborso garantito senza domande.</p>
                  </div>
                </div>
              )}

              <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime" /> Annulla quando vuoi</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime" /> Nessun contratto</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime" /> Supporto via email incluso</li>
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
