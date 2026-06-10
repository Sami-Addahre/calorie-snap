import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function AuthenticatedPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-8 py-10 text-center shadow-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-lime border-t-transparent" role="status" />
        <p className="text-sm font-medium text-foreground">Caricamento della tua sessione...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthenticatedPending,
  pendingMinMs: 100,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const today = new Date().toISOString().split("T")[0];
    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { user_id: userId, reset_date: today, coach_reset_date: today },
        { onConflict: "user_id" },
      )
      .select("onboarding_completed")
      .maybeSingle();

    if (profileError) {
      console.warn("Unable to ensure profile row exists:", profileError);
    }

    let profileRow = profile;
    if (!profileRow) {
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

      if (fallbackError) {
        console.warn("Unable to read profile after fallback upsert:", fallbackError);
      }
      profileRow = fallbackProfile;
    }

    if (!location.pathname.startsWith("/onboarding") && !profileRow?.onboarding_completed) {
      throw redirect({ to: "/onboarding" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
