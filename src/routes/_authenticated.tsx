import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const today = new Date().toISOString().split("T")[0];
    
    // Fallback: crea il profilo se non esiste (per utenti registrati prima del trigger)
    await supabase
      .from("profiles")
      .insert({ user_id: data.user.id, reset_date: today, coach_reset_date: today })
      .single()
      .then(() => {}, () => {
        // Ignora l'errore se la riga esiste già (UNIQUE constraint violation)
      });

    // Onboarding gate: se non completato e non già su /onboarding, redirige
    if (!location.pathname.startsWith("/onboarding")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
