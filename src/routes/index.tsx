import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Upload, Zap, ChefHat, Smartphone, ArrowRight, Check } from "lucide-react";

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
    links: [
      { rel: "canonical", href: "https://kcalvison.lovable.app/" },
    ],
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
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
            <Camera className="h-4 w-4 text-lime-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">kcalAI</span>
        </div>
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <a href="#come-funziona" className="text-muted-foreground hover:text-foreground">Come funziona</a>
          <a href="#prezzi" className="text-muted-foreground hover:text-foreground">Prezzi</a>
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-lime-foreground transition-colors hover:bg-lime/90"
        >
          Inizia gratis
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
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
          <Link
            to="/prova"
            className="inline-flex items-center gap-2 rounded-xl bg-lime px-6 py-3 text-sm font-semibold text-lime-foreground transition-colors hover:bg-lime/90"
          >
            Prova gratis · senza registrazione <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#come-funziona"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Come funziona
          </a>
        </div>

        <div className="mx-auto mt-16 max-w-sm rounded-[2rem] border-4 border-border bg-surface p-4 shadow-2xl sm:max-w-md">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-background">
            <div className="flex items-center justify-center gap-1 border-b border-border bg-surface px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex flex-col items-center justify-center gap-3 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="w-full space-y-2">
                <div className="mx-auto h-3 w-3/4 rounded bg-muted" />
                <div className="mx-auto h-3 w-1/2 rounded bg-muted" />
              </div>
              <div className="mt-2 grid w-full grid-cols-3 gap-2">
                <div className="h-16 rounded-lg bg-muted" />
                <div className="h-16 rounded-lg bg-muted" />
                <div className="h-16 rounded-lg bg-muted" />
              </div>
              <div className="mt-2 w-full rounded-lg bg-lime py-2.5 text-center text-xs font-semibold text-lime-foreground">
                Analizza con AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Scatta una foto",
      desc: "Fotografa il tuo piatto direttamente dall'app o carica un'immagine dalla galleria.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "AI analizza",
      desc: "Il nostro modello di visione riconosce gli ingredienti e stima i valori nutrizionali.",
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: "Vedi i risultati",
      desc: "Calorie totali, macro e ingredienti in una card chiara e immediata. Salva nello storico.",
    },
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
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-lime/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime text-lime-foreground">
                {s.icon}
              </div>
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
    {
      name: "Free",
      price: "€0",
      period: "/mese",
      desc: "Perfetto per iniziare a tracciare i tuoi pasti.",
      features: ["5 analisi foto al giorno", "Storico analisi", "Risultati dettagliati"],
      cta: "Inizia gratis",
      highlight: false,
    },
    {
      name: "Pro",
      price: "€9.99",
      period: "/mese",
      desc: "Analisi illimitate + ricerca ricette AI con video e valori nutrizionali.",
      features: ["Analisi foto illimitate", "Ricerca ricette AI", "Video YouTube + nutrizione", "Storico completo"],
      cta: "Passa a Pro",
      highlight: true,
    },
    {
      name: "Ristorante",
      price: "€49",
      period: "/mese",
      desc: "Per ristoranti: schede nutrizionali del menu ed export PDF.",
      features: ["Tutto di Pro", "Menu illimitato", "Schede nutrizionali", "Export PDF", "Supporto dedicato"],
      cta: "Passa a Ristorante",
      highlight: false,
    },
  ];


  return (
    <section id="prezzi" className="border-t border-border px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Scegli il tuo piano</h2>
          <p className="mt-3 text-muted-foreground">Per consumatori e professionisti della ristorazione.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-lime bg-surface"
                  : "border-border bg-surface"
              }`}
            >
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
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-lime text-lime-foreground hover:bg-lime/90"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
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
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Pronto a conoscere ogni piatto?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm opacity-80 sm:text-base">
          Iscriviti gratis e inizia a scattare. Nessuna carta di credito richiesta.
        </p>
        <Link
          to="/auth"
          className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
        >
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
        <p className="text-xs text-muted-foreground">
          © 2026 kcalAI. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
