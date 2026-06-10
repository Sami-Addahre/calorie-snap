import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "kcalai_launch_deadline";
const DISMISS_KEY = "kcalai_launch_dismissed";
const DURATION_MS = 24 * 60 * 60 * 1000; // 24h

function getDeadline(): number {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const n = Number(stored);
      if (n > Date.now()) return n;
    }
  } catch {}
  const d = Date.now() + DURATION_MS;
  try { localStorage.setItem(KEY, String(d)); } catch {}
  return d;
}

export function LaunchBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(DISMISS_KEY)) { setDismissed(true); return; } } catch {}
    const deadline = getDeadline();
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (dismissed || remaining === null || remaining <= 0) return null;

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);

  return (
    <div className="relative z-40 bg-amber-600 text-amber-50">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <span className="text-center font-medium">
          ⚡ <span className="font-bold">Affrettati! Offerta Lampo Solo per Oggi!</span> — Solo <span className="font-bold">€1.49/mese</span> per il primo periodo. Scade tra{' '}
          <span className="tabular-nums font-bold">
            {h}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
          </span>
        </span>
        <button
          onClick={() => {
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
            setDismissed(true);
          }}
          aria-label="Chiudi banner"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-amber-50/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
