import { Coffee, UtensilsCrossed, Moon, Cookie } from "lucide-react";

export type Pasto = "colazione" | "pranzo" | "cena" | "spuntino";

const OPTIONS: { id: Pasto; label: string; icon: any }[] = [
  { id: "colazione", label: "Colazione", icon: Coffee },
  { id: "pranzo", label: "Pranzo", icon: UtensilsCrossed },
  { id: "cena", label: "Cena", icon: Moon },
  { id: "spuntino", label: "Spuntino", icon: Cookie },
];

export function MealPicker({ onPick, onCancel }: { onPick: (p: Pasto) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-center">Che pasto stai facendo?</h3>
        <p className="mt-1 text-center text-xs text-muted-foreground">Aggiungiamo l'analisi al diario di oggi.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => onPick(o.id)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 transition-colors hover:border-lime hover:bg-lime/5"
              >
                <Icon className="h-6 w-6 text-lime" />
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground">
          Annulla
        </button>
      </div>
    </div>
  );
}
