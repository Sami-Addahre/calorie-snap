import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Use getSession() — reads from localStorage/memory, not a network call.
    // Essential for Google OAuth redirects: hash tokens are processed synchronously
    // by the Supabase client on init, so getSession() finds them immediately.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    const user = data.session.user;

    // Onboarding gate: se non completato e non già su /onboarding, redirige
    if (!location.pathname.startsWith("/onboarding")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { user };
  },
  component: () => <Outlet />,
});
