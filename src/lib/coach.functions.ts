import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const getCoachOggi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().split("T")[0];

    const [profileRes, analisiRes, idrRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("target_kcal, target_ml")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("analisi")
        .select("id, pasto, kcal, risultato_json, created_at")
        .eq("user_id", userId)
        .eq("consumed_at", today),
      supabase
        .from("idratazione")
        .select("ml")
        .eq("user_id", userId)
        .eq("data", today),
    ]);

    const target_kcal = profileRes.data?.target_kcal ?? 2000;
    const target_ml = profileRes.data?.target_ml ?? 2000;

    const analisi = (analisiRes.data ?? []).map((a: any) => ({
      id: a.id,
      pasto: a.pasto ?? "altro",
      kcal: Number(a.kcal ?? a.risultato_json?.calorie ?? 0),
      nome: a.risultato_json?.nome_piatto ?? "Pasto",
      created_at: a.created_at,
    }));
    const kcal_oggi = analisi.reduce((s, a) => s + a.kcal, 0);
    const ml_oggi = (idrRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);

    return { kcal_oggi, target_kcal, ml_oggi, target_ml, analisi };
  });

export const aggiungiIdratazione = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ml: z.number().int().min(1).max(2000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("idratazione")
      .insert({ user_id: userId, ml: data.ml });
    if (error) throw new Error("Impossibile salvare");
    return { ok: true };
  });

export const setObiettivi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        target_kcal: z.number().int().min(800).max(6000).optional(),
        target_ml: z.number().int().min(500).max(8000).optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, number> = {};
    if (data.target_kcal) patch.target_kcal = data.target_kcal;
    if (data.target_ml) patch.target_ml = data.target_ml;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
    if (error) throw new Error("Impossibile aggiornare obiettivi");
    return { ok: true };
  });

// Public counters for landing page (no auth)
export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const [analisiCount, userCount] = await Promise.all([
    supabaseAdmin.from("analisi").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  return {
    analisi: analisiCount.count ?? 0,
    utenti: userCount.count ?? 0,
  };
});
