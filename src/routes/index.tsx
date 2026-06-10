import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, Upload, Zap, ChefHat, Smartphone, ArrowRight, Check, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStats } from "@/lib/coach.functions";
import { getStorico } from "@/lib/analisi.functions";
import { LaunchBanner } from "@/components/launch-banner";
import { ReviewsMarquee } from "@/components/reviews-marquee";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kcalAI — Calorie del piatto da una foto con AI" },
      { name: "description", content: "Fotografa il tuo piatto e l'AI ti dice calorie, proteine, carboidrati e grassi in pochi secondi. Provalo gratis senza registrazione." },
      { property: "og:title", content: "kcalAI — Calorie del piatto da una foto con AI" },
      { property: "og:description", content: "Fotografa il tuo piatto e l'AI ti dice calorie, proteine, carboidrati e grassi in pochi secondi." },
      { property: "og:url", content: "https://kcalvison.lovable.app/" },
      { name: "twitter:title", content: "kcalAI — Calorie del piatto da una foto con AI" },
      { name: "twitter:description", content: "Fotografa il tuo piatto e l'AI ti dice calorie e macro in pochi secondi." },
    ],
    links: [{ rel: "canonical", href: "https://kcalvison.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "kcalAI",
          url: "https://kcalvison.lovable.app/",
          logo: "https://kcalvison.lovable.app/favicon.ico",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "kcalAI",
          url: "https://kcalvison.lovable.app/",
          inLanguage: "it-IT",
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LaunchBanner />
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Pricing />
        <ReviewsMarquee />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
            <Camera className="h-4 w-4 text-lime-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">kcalAI</span>
        </div>
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <a href="#come-funziona" className="text-muted-foreground hover:text-foreground">Come funziona</a>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Prezzi</Link>
        </div>
        <Link to="/auth" className="rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-lime-foreground hover:bg-lime/90">
          Inizia gratis
        </Link>
      </div>
    </nav>
  );
}

function useLiveAnalisiCount() {
  const fetchStats = useServerFn(getStats);
  const { data, refetch } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats().catch(() => null),
    staleTime: 30_000,
  });
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (data?.analisi !== undefined) setCount(data.analisi);
  }, [data]);

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase
        .channel("analisi-counter")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "analisi" }, () => {
          setCount((c) => (c == null ? c : c + 1));
          refetch();
        })
        .subscribe();
    } catch {
      // Supabase non configurato, counter disabilitato
    }
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [refetch]);

  return count;
}

function Hero() {
  const count = useLiveAnalisiCount();
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24">
      <div className="mx-auto max-w-6xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-lime" />
          Powered by AI
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-7xl">
          Scatta il tuo piatto.
          <br />
          <span className="text-lime">Scopri le calorie.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          kcalAI analizza ogni foto di cibo con intelligenza artificiale e ti dice calorie, proteine, carboidrati e grassi in pochi secondi.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/prova" className="inline-flex items-center gap-2 rounded-xl bg-lime px-6 py-3 text-sm font-semibold text-lime-foreground hover:bg-lime/90">
            Prova gratis · senza registrazione <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#come-funziona" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground hover:bg-muted">
            Come funziona
          </a>
        </div>

        {count !== null && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-1.5 text-sm">
            <TrendingUp className="h-4 w-4 text-lime" />
            <span className="font-bold tabular-nums">{count.toLocaleString("it-IT")}</span>
            <span className="text-muted-foreground">analisi già effettuate</span>
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-lime" />
          </div>
        )}
      </div>
    </section>
  );
}

function RecentAnalisi() {
  const fetchStorico = useServerFn(getStorico);
  const { data } = useQuery({ queryKey: ['home-storico'], queryFn: () => fetchStorico().catch(() => null), staleTime: 30_000 });
  const storico = data?.storico ?? [];

  if (!storico || storico.length === 0) {
    return (
      <section className="border-t border-border px-4 py-12">
        <div className="mx-auto max-w-6xl text-center">
          <h3 className="font-display text-xl font-semibold">I tuoi ultimi pasti</h3>
          <p className="mt-2 text-sm text-muted-foreground">Accedi per vedere le tue foto analizzate e lo storico dei pasti.</p>
          <div className="mt-4">
            <a href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-lime-foreground">Accedi</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-border px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h3 className="font-display text-xl font-semibold">I tuoi ultimi pasti</h3>
        <div className="mt-4 grid gap-3">
          {storico.map((s: any) => (
            <div key={s.id} className="rounded-lg border border-border bg-surface p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{s.risultato_json?.nome_piatto ?? 'Pasto'}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold">{Math.round(s.kcal ?? s.risultato_json?.calorie ?? 0)} kcal</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const REVIEWS = [
  { nome: "Marco R.", citta: "Milano", testo: "Lo uso ogni giorno a pranzo. In due settimane ho preso consapevolezza delle calorie senza pesare nulla.", initials: "MR", color: "bg-orange-500" },
  { nome: "Giulia T.", citta: "Roma", testo: "Strumento incredibile, soprattutto al ristorante. Foto e in 3 secondi ho le calorie. Promosso!", initials: "GT", color: "bg-pink-500" },
  { nome: "Luca M.", citta: "Torino", testo: "L'AI riconosce anche piatti complessi. Mi ha aiutato a perdere 4 kg in un mese. Consigliatissimo.", initials: "LM", color: "bg-blue-500" },
];

function SocialProof() {
  return (
    <section className="border-t border-border px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Lo amano già migliaia di italiani</h2>
        <p className="mt-3 text-center text-muted-foreground">Recensioni vere da chi usa kcalAI ogni giorno.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.nome} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${r.color} font-semibold text-white`}>
                  {r.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">{r.citta}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">"{r.testo}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <Camera className="h-5 w-5" />, title: "Scatta una foto", desc: "Fotografa il tuo piatto direttamente dall'app o carica un'immagine dalla galleria." },
    { icon: <Zap className="h-5 w-5" />, title: "AI analizza", desc: "Il nostro modello di visione riconosce gli ingredienti e stima i valori nutrizionali." },
    { icon: <Smartphone className="h-5 w-5" />, title: "Vedi i risultati", desc: "Calorie totali, macro e ingredienti in una card chiara e immediata. Salva nello storico." },
  ];

  return (
    <section id="come-funziona" className="border-t border-border px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Come funziona</h2>
          <p className="mt-3 text-muted-foreground">Tre semplici passaggi per conoscere ogni piatto.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-6 hover:border-lime/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime text-lime-foreground">{s.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Free", price: "€0", period: "/mese", desc: "Per iniziare a tracciare i pasti.", features: ["5 analisi foto al giorno", "Storico analisi", "Coach calorie & idratazione"], cta: "Inizia gratis", highlight: false },
    { name: "Pro", price: "€9.99", period: "/mese", desc: "Analisi illimitate e ricette AI.", features: ["Analisi foto illimitate", "Ricerca ricette AI", "Video YouTube + nutrizione", "Coach completo"], cta: "Passa a Pro", highlight: true },
    { name: "Ristorante", price: "€49", period: "/mese", desc: "Per ristoranti: schede nutrizionali.", features: ["Tutto di Pro", "Menu illimitato", "Schede nutrizionali", "Export PDF", "Supporto dedicato"], cta: "Passa a Ristorante", highlight: false },
  ];

  return (
    <section id="prezzi" className="border-t border-border px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Scegli il tuo piano</h2>
          <p className="mt-3 text-muted-foreground">Annulla quando vuoi · Nessun contratto · Supporto incluso.</p>
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
              <Link
                to="/auth"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${
                  plan.highlight ? "bg-lime text-lime-foreground hover:bg-lime/90" : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
              </Link>

              {plan.name !== "Free" && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-lime/30 bg-lime/5 p-3 text-xs">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  <div>
                    <p className="font-semibold">Soddisfatti o rimborsati 30 giorni</p>
                    <p className="text-muted-foreground">Rimborso garantito senza domande.</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/pricing" className="text-sm text-lime hover:underline">Vedi confronto completo →</Link>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-border px-4 py-20">
      <div className="mx-auto max-w-3xl rounded-3xl bg-lime p-8 text-center text-lime-foreground sm:p-12">
        <ChefHat className="mx-auto h-10 w-10" />
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Pronto a conoscere ogni piatto?</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm opacity-80 sm:text-base">
          Iscriviti gratis e inizia a scattare. Nessuna carta di credito richiesta.
        </p>
        <Link to="/auth" className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-background/90">
          Crea account gratuito <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-lime">
            <Camera className="h-3 w-3 text-lime-foreground" />
          </div>
          <span className="font-display text-sm font-bold">kcalAI</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 kcalAI. Tutti i diritti riservati.</p>
      </div>
    </footer>
  );
}
