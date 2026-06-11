import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi o registrati — kcalAI" },
      { name: "description", content: "Accedi con Google o crea un account kcalAI per salvare lo storico delle tue analisi nutrizionali." },
      { property: "og:title", content: "Accedi a kcalAI" },
      { property: "og:description", content: "Accedi con Google o crea un account gratuito." },
      { property: "og:url", content: "https://kcalvison.lovable.app/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://kcalvison.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fix schermo nero post-OAuth: forza redirect a /app quando Supabase
  // segnala SIGNED_IN (incluso il ritorno dal flusso Google OAuth).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        window.location.href = "/app";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogle = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/app",
        },
      });
      if (error) setError(error.message || "Errore Google sign-in");
    } catch (err: any) {
      setError(err?.message || "Errore Google sign-in");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.href = "/app";
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setMessage("Controlla la tua email per confermare l'account.");
      }
    } catch (err: any) {
      setError(err?.message || "Errore durante l'autenticazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime">
            <Camera className="h-5 w-5 text-lime-foreground" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">kcalAI</span>
        </div>

        <h1 className="text-center font-display text-2xl font-bold text-foreground">
          {isLogin ? "Bentornato" : "Crea il tuo account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Inizia in un click — gratis per sempre.
        </p>

        {/* Google big button */}
        <button
          type="button"
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-surface px-4 py-4 text-base font-semibold text-foreground shadow-sm transition-all hover:border-lime hover:bg-muted"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a10.99 10.99 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continua con Google
        </button>

        <details className="mt-6 group">
          <summary className="cursor-pointer text-center text-xs text-muted-foreground hover:text-foreground list-none">
            <span className="group-open:hidden">oppure usa email e password ▾</span>
            <span className="hidden group-open:inline">nascondi email ▴</span>
          </summary>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                placeholder="tua@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive-foreground">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-lime/30 bg-lime/10 p-2.5 text-xs text-lime-foreground">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? "Caricamento..." : isLogin ? "Accedi con email" : "Registrati con email"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
                className="font-medium text-lime hover:underline"
              >
                {isLogin ? "Registrati" : "Accedi"}
              </button>
            </p>
          </form>
        </details>

        {error && !email && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
