import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const FREE_DAILY_TOKENS = 5;

export const getCoachOggi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().split("T")[0];

    const [profileRes, analisiRes, idrRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("target_kcal, target_ml, piano, analisi_oggi, reset_date")
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

    const piano = profileRes.data?.piano ?? "free";
    const target_kcal = profileRes.data?.target_kcal ?? 2000;
    const target_ml = profileRes.data?.target_ml ?? 2000;

    let analisiOggi = profileRes.data?.analisi_oggi ?? 0;
    if (profileRes.data?.reset_date !== today) analisiOggi = 0;

    const tokensUsed = piano === "free" ? analisiOggi : 0;
    const tokensLimit = piano === "free" ? FREE_DAILY_TOKENS : -1;

    const analisi = (analisiRes.data ?? []).map((a: any) => ({
      id: a.id,
      pasto: a.pasto ?? "altro",
      kcal: Number(a.kcal ?? a.risultato_json?.calorie ?? 0),
      nome: a.risultato_json?.nome_piatto ?? "Pasto",
      created_at: a.created_at,
    }));
    const kcal_oggi = analisi.reduce((s, a) => s + a.kcal, 0);
    const ml_oggi = (idrRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);

    return { kcal_oggi, target_kcal, ml_oggi, target_ml, analisi, piano, tokensUsed, tokensLimit };
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

export const getCoachAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ domanda: z.string().trim().min(2).max(300) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("piano")
      .eq("user_id", userId)
      .single();

    const piano = profile?.piano ?? "free";
    if (piano !== "pro" && piano !== "ristorante") {
      throw new Error("UPGRADE_REQUIRED");
    }

    const today = new Date().toISOString().split("T")[0];
    const [analisiRes, idrRes] = await Promise.all([
      supabase
        .from("analisi")
        .select("pasto, kcal, risultato_json")
        .eq("user_id", userId)
        .eq("consumed_at", today)
        .order("created_at", { ascending: true }),
      supabase
        .from("idratazione")
        .select("ml")
        .eq("user_id", userId)
        .eq("data", today),
    ]);

    const pasti = (analisiRes.data ?? []).map((a: any) => ({
      pasto: a.pasto ?? "altro",
      kcal: Number(a.kcal ?? 0),
      nome: a.risultato_json?.nome_piatto ?? "Pasto",
    }));
    const kcalTotali = pasti.reduce((s, p) => s + p.kcal, 0);
    const mlTotali = (idrRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Sei un nutrizionista AI italiano. L'utente ha registrato oggi questi pasti:
${pasti.map((p) => `- ${p.pasto}: ${p.nome} (${p.kcal} kcal)`).join("\n")}

Totale calorie oggi: ${kcalTotali} kcal (target 2000 kcal)
Idratazione oggi: ${mlTotali} ml (target 2000 ml)

L'utente chiede: "${data.domanda}"

Rispondi in italiano, in modo conciso (massimo 3 frasi), con un consiglio pratico e personalizzato basato sui suoi dati di oggi.`;

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [{ role: "user", content: prompt }],
    });

    return { advice: result.text.trim() };
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
    const patch: { target_kcal?: number; target_ml?: number } = {};
    if (data.target_kcal) patch.target_kcal = data.target_kcal;
    if (data.target_ml) patch.target_ml = data.target_ml;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
    if (error) throw new Error("Impossibile aggiornare obiettivi");
    return { ok: true };
  });

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
