import { Star } from "lucide-react";

const REVIEWS = [
  { autore: "Marco R.", testo: "Ho perso 3kg in un mese grazie a kcalvison!" },
  { autore: "Giulia T.", testo: "Finalmente capisco cosa mangio" },
  { autore: "Luca M.", testo: "Il coach AI è incredibile, mi ha aiutato tanto" },
  { autore: "Sara B.", testo: "Uso kcalvison ogni giorno da 2 mesi" },
  { autore: "Andrea P.", testo: "Semplicissimo e preciso" },
];

function Card({ autore, testo }: { autore: string; testo: string }) {
  return (
    <div className="mx-3 inline-flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-surface p-5 align-top sm:w-[340px]">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">"{testo}"</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">— {autore}</p>
    </div>
  );
}

export function ReviewsMarquee() {
  return (
    <section className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h3 className="font-display text-2xl font-bold sm:text-3xl">Cosa dicono di noi</h3>
        <p className="mt-2 text-sm text-muted-foreground">Recensioni vere da utenti reali.</p>
      </div>

      <div
        className="group relative mt-8 overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
      >
        <div className="flex w-max animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          {[...REVIEWS, ...REVIEWS].map((r, i) => (
            <Card key={i} autore={r.autore} testo={r.testo} />
          ))}
        </div>
      </div>
    </section>
  );
}
