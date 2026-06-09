import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const FREE_DAILY_TOKENS = 5;

const DateInput = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const getCoachOggi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DateInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().split("T")[0];
    const giorno = data?.date ?? today;

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
        .eq("consumed_at", giorno),
      supabase
        .from("idratazione")
        .select("ml")
        .eq("user_id", userId)
        .eq("data", giorno),
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

    return { date: giorno, kcal_oggi, target_kcal, ml_oggi, target_ml, analisi, piano, tokensUsed, tokensLimit };
  });

export const eliminaAnalisi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("analisi")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Impossibile eliminare il pasto");
    return { ok: true };
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
  .inputValidator((i: unknown) =>
    z
      .object({
        domanda: z.string().trim().min(2).max(500),
        storia: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(2000),
            })
          )
          .max(12)
          .optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("piano, target_kcal, target_ml")
      .eq("user_id", userId)
      .single();

    const piano = profile?.piano ?? "free";
    if (piano !== "pro" && piano !== "ristorante") {
      throw new Error("UPGRADE_REQUIRED");
    }

    const targetKcal = profile?.target_kcal ?? 2000;
    const targetMl = profile?.target_ml ?? 2000;

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
      proteine: Number(a.risultato_json?.proteine_g ?? 0),
      carboidrati: Number(a.risultato_json?.carboidrati_g ?? 0),
      grassi: Number(a.risultato_json?.grassi_g ?? 0),
    }));
    const kcalTotali = pasti.reduce((s, p) => s + p.kcal, 0);
    const proteineTotali = pasti.reduce((s, p) => s + p.proteine, 0);
    const mlTotali = (idrRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const contestoPasti =
      pasti.length > 0
        ? pasti.map((p) => `- ${p.pasto}: ${p.nome} (${p.kcal} kcal, P ${p.proteine}g / C ${p.carboidrati}g / G ${p.grassi}g)`).join("\n")
        : "- Nessun pasto registrato oggi.";

    const systemPrompt = `Sei "Coach AI", un assistente personale italiano esperto di nutrizione, dieta e sport/allenamento. 
Aiuti l'utente con consigli pratici su alimentazione, calorie, macronutrienti, idratazione, allenamento, recupero e abitudini sane.

DATI DELL'UTENTE PER OGGI:
Pasti registrati:
${contestoPasti}
Totale calorie: ${kcalTotali} kcal (obiettivo ${targetKcal} kcal)
Proteine totali: ${proteineTotali} g
Idratazione: ${mlTotali} ml (obiettivo ${targetMl} ml)

REGOLE:
- Rispondi sempre in italiano, in tono amichevole e motivante.
- Sii conciso e concreto (massimo 4-5 frasi), usa i dati reali quando rilevanti.
- Per domande su sport/allenamento dai indicazioni pratiche (esercizi, serie, frequenza) ma ricorda che non sostituisci un medico.
- Se mancano dati, fai una domanda di chiarimento invece di inventare.
- Non dare diagnosi mediche; per problemi di salute consiglia un professionista.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...((data.storia ?? []).map((m) => ({ role: m.role, content: m.content })) as Array<{
        role: "user" | "assistant";
        content: string;
      }>),
      { role: "user", content: data.domanda },
    ];

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages,
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
