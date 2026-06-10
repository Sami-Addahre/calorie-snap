import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const FREE_DAILY_ANALISI = 5;
const FREE_DAILY_COACH_MSG = 5;

const DateInput = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

function macrosFromAnalisi(analisi: Array<{ risultato_json: any }>): { p: number; c: number; g: number } {
  let p = 0, c = 0, g = 0;
  for (const a of analisi) {
    const r = a.risultato_json ?? {};
    p += Number(r.proteine_g ?? 0);
    c += Number(r.carboidrati_g ?? 0);
    g += Number(r.grassi_g ?? 0);
  }
  return { p: Math.round(p), c: Math.round(c), g: Math.round(g) };
}

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
        .select("target_kcal, target_ml, target_proteine_g, target_carbo_g, target_grassi_g, piano, analisi_oggi, reset_date, coach_msg_oggi, coach_reset_date, onboarding_completed")
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
    const target_proteine_g = profileRes.data?.target_proteine_g ?? 150;
    const target_carbo_g = profileRes.data?.target_carbo_g ?? 250;
    const target_grassi_g = profileRes.data?.target_grassi_g ?? 60;
    const onboarding_completed = profileRes.data?.onboarding_completed ?? false;

    let analisiOggi = profileRes.data?.analisi_oggi ?? 0;
    if (profileRes.data?.reset_date !== today) analisiOggi = 0;

    let coachMsgOggi = profileRes.data?.coach_msg_oggi ?? 0;
    if (profileRes.data?.coach_reset_date !== today) coachMsgOggi = 0;

    const tokensUsed = piano === "free" ? analisiOggi : 0;
    const tokensLimit = piano === "free" ? FREE_DAILY_ANALISI : -1;
    const coachMsgLimit = piano === "free" ? FREE_DAILY_COACH_MSG : -1;

    const analisi = (analisiRes.data ?? []).map((a: any) => ({
      id: a.id,
      pasto: a.pasto ?? "altro",
      kcal: Number(a.kcal ?? a.risultato_json?.calorie ?? 0),
      nome: a.risultato_json?.nome_piatto ?? "Pasto",
      created_at: a.created_at,
      risultato_json: a.risultato_json,
    }));
    const kcal_oggi = Math.round(analisi.reduce((s, a) => s + Number(a.kcal ?? 0), 0));
    const ml_oggi = (idrRes.data ?? []).reduce((s, r: any) => s + Number(r.ml ?? 0), 0);
    const macros = macrosFromAnalisi(analisiRes.data ?? []);

    return {
      date: giorno,
      kcal_oggi, target_kcal,
      ml_oggi, target_ml,
      proteine_oggi: macros.p, target_proteine_g,
      carbo_oggi: macros.c, target_carbo_g,
      grassi_oggi: macros.g, target_grassi_g,
      analisi: analisi.map(({ risultato_json, ...rest }) => rest),
      piano,
      tokensUsed, tokensLimit,
      coachMsgUsed: coachMsgOggi, coachMsgLimit,
      onboarding_completed,
    };
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
          .array(z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(2000),
          }))
          .max(12)
          .optional(),
      })
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().split("T")[0];

    const { data: profile } = await supabase
      .from("profiles")
      .select("piano, target_kcal, target_ml, target_proteine_g, peso_kg, peso_target_kg, obiettivo, sesso, eta, coach_msg_oggi, coach_reset_date")
      .eq("user_id", userId)
      .single();

    const piano = profile?.piano ?? "free";

    // Rate limit per utenti free: 5 messaggi/giorno
    if (piano === "free") {
      let used = profile?.coach_msg_oggi ?? 0;
      if (profile?.coach_reset_date !== today) used = 0;
      if (used >= FREE_DAILY_COACH_MSG) {
        throw new Error(`COACH_LIMIT:${FREE_DAILY_COACH_MSG}`);
      }
      await supabase
        .from("profiles")
        .update({ coach_msg_oggi: used + 1, coach_reset_date: today })
        .eq("user_id", userId);
    }

    const targetKcal = profile?.target_kcal ?? 2000;
    const targetMl = profile?.target_ml ?? 2000;
    const targetProt = profile?.target_proteine_g ?? 150;

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
    const kcalTotali = Math.round(pasti.reduce((s, p) => s + p.kcal, 0));
    const proteineTotali = Math.round(pasti.reduce((s, p) => s + p.proteine, 0));
    const mlTotali = (idrRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const contestoPasti = pasti.length > 0
      ? pasti.map((p) => `- ${p.pasto}: ${p.nome} (${p.kcal} kcal, P ${p.proteine}g / C ${p.carboidrati}g / G ${p.grassi}g)`).join("\n")
      : "- Nessun pasto registrato oggi.";

    const profiloUtente = [
      profile?.sesso && `Sesso: ${profile.sesso}`,
      profile?.eta && `Età: ${profile.eta} anni`,
      profile?.peso_kg && `Peso attuale: ${profile.peso_kg} kg`,
      profile?.peso_target_kg && `Peso obiettivo: ${profile.peso_target_kg} kg`,
      profile?.obiettivo && `Obiettivo: ${profile.obiettivo === "perdere" ? "perdere peso" : profile.obiettivo === "aumentare" ? "aumentare massa" : "mantenere"}`,
    ].filter(Boolean).join(" · ");

    const systemPrompt = `Sei "Coach AI", un assistente personale italiano esperto di nutrizione, dieta e sport.

PROFILO UTENTE: ${profiloUtente || "non disponibile"}

DATI DI OGGI:
Pasti registrati:
${contestoPasti}
Totale calorie: ${kcalTotali} kcal (obiettivo ${targetKcal} kcal)
Proteine totali: ${proteineTotali} g (obiettivo ${targetProt} g)
Idratazione: ${mlTotali} ml (obiettivo ${targetMl} ml)

REGOLE:
- Rispondi sempre in italiano, in tono amichevole e motivante.
- Sii conciso e concreto (massimo 4-5 frasi), usa i dati reali quando rilevanti.
- Per sport dai indicazioni pratiche ma ricorda che non sostituisci un medico.
- Se mancano dati, fai una domanda di chiarimento invece di inventare.
- Non dare diagnosi mediche; per problemi di salute consiglia un professionista.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...((data.storia ?? []).map((m) => ({ role: m.role, content: m.content })) as Array<{
        role: "user" | "assistant"; content: string;
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
    z.object({
      target_kcal: z.number().int().min(800).max(6000).optional(),
      target_ml: z.number().int().min(500).max(8000).optional(),
    }).parse(i)
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

// --- ONBOARDING ---
const OnboardingInput = z.object({
  sesso: z.enum(["uomo", "donna"]),
  eta: z.number().int().min(12).max(100),
  altezza_cm: z.number().int().min(120).max(230),
  peso_kg: z.number().min(30).max(300),
  peso_target_kg: z.number().min(30).max(300),
  stile_vita: z.enum(["sedentario", "leggero", "moderato", "attivo"]),
  obiettivo: z.enum(["perdere", "mantenere", "aumentare"]),
});

const ACTIVITY: Record<string, number> = {
  sedentario: 1.2,
  leggero: 1.375,
  moderato: 1.55,
  attivo: 1.725,
};

function calcolaTDEE(d: z.infer<typeof OnboardingInput>) {
  // Mifflin-St Jeor
  const bmr = d.sesso === "uomo"
    ? 10 * d.peso_kg + 6.25 * d.altezza_cm - 5 * d.eta + 5
    : 10 * d.peso_kg + 6.25 * d.altezza_cm - 5 * d.eta - 161;
  const tdee = bmr * ACTIVITY[d.stile_vita];
  const adj = d.obiettivo === "perdere" ? -500 : d.obiettivo === "aumentare" ? 300 : 0;
  const target_kcal = Math.max(1200, Math.round(tdee + adj));
  // Macros: 30% proteine, 40% carbo, 30% grassi
  const target_proteine_g = Math.round((target_kcal * 0.30) / 4);
  const target_carbo_g = Math.round((target_kcal * 0.40) / 4);
  const target_grassi_g = Math.round((target_kcal * 0.30) / 9);
  return { target_kcal, target_proteine_g, target_carbo_g, target_grassi_g };
}

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OnboardingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const targets = calcolaTDEE(data);
    
    // Fallback: crea il profilo se non esiste (per utenti registrati prima del trigger)
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("profiles")
      .insert({ user_id: userId, reset_date: today, coach_reset_date: today })
      .single()
      .then(() => {}, () => {
        // Ignora l'errore se la riga esiste già (UNIQUE constraint violation)
      });
    
    // Ora aggiorna il profilo
    const { error } = await supabase
      .from("profiles")
      .update({
        sesso: data.sesso,
        eta: data.eta,
        altezza_cm: data.altezza_cm,
        peso_kg: data.peso_kg,
        peso_target_kg: data.peso_target_kg,
        stile_vita: data.stile_vita,
        obiettivo: data.obiettivo,
        target_kcal: targets.target_kcal,
        target_proteine_g: targets.target_proteine_g,
        target_carbo_g: targets.target_carbo_g,
        target_grassi_g: targets.target_grassi_g,
        onboarding_completed: true,
      })
      .eq("user_id", userId);
    if (error) throw new Error("Impossibile salvare l'onboarding");
    return { ok: true, ...targets };
  });

export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    return { completed: !!data?.onboarding_completed };
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
