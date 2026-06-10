import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { createHash } from "crypto";

const GUEST_DAILY_LIMIT = 3;

function getClientIp(): string {
  const candidates = [
    getRequestHeader("cf-connecting-ip"),
    getRequestHeader("x-real-ip"),
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  for (const c of candidates) if (c) return c;
  return "unknown";
}

function hashIp(ip: string): string {
  const salt = process.env.GUEST_IP_SALT ?? "kcalai-guest-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

class GuestLimitError extends Error {
  code = "GUEST_LIMIT" as const;
  constructor(public remaining: number, public limit: number) {
    super(`Hai usato le ${limit} analisi gratuite di oggi. Registrati gratis per continuare e salvare lo storico.`);
  }
}

const PastoEnum = z.enum(["colazione", "pranzo", "cena", "spuntino"]).optional();

const AnalizzaInput = z.object({
  imageBase64: z.string().min(1),
  pasto: PastoEnum,
});

const AnalisiResultSchema = z.object({
  nome_piatto: z.string(),
  calorie: z.number(),
  proteine_g: z.number(),
  carboidrati_g: z.number(),
  grassi_g: z.number(),
  fibre_g: z.number(),
  zuccheri_g: z.number(),
  sodio_mg: z.number(),
  ingredienti_principali: z.array(z.string()),
  confidenza: z.enum(["alta", "media", "bassa"]),
  note: z.string(),
});

export type AnalisiResult = z.infer<typeof AnalisiResultSchema>;

export const analizzaImmagine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalizzaInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const today = new Date().toISOString().split("T")[0];

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("piano, analisi_oggi, reset_date")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profilo non trovato");
    }

    let analisiOggi = profile.analisi_oggi ?? 0;

    if (profile.reset_date !== today) {
      analisiOggi = 0;
      await supabase
        .from("profiles")
        .update({ analisi_oggi: 0, reset_date: today })
        .eq("user_id", userId);
    }

    if (profile.piano === "free" && analisiOggi >= 5) {
      throw new Error("Hai raggiunto il limite di 5 analisi giornaliere. Passa a Pro per analisi illimitate.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Sei un nutrizionista esperto. Analizza l'immagine di cibo fornita.

ISTRUZIONI CRITICHE:
- Se l'immagine NON contiene cibo, rispondi ESATTAMENTE con questo JSON (nessun altro testo):
{"nome_piatto":"","calorie":0,"proteine_g":0,"carboidrati_g":0,"grassi_g":0,"fibre_g":0,"zuccheri_g":0,"sodio_mg":0,"ingredienti_principali":[],"confidenza":"bassa","note":"Nessun cibo rilevato. Carica una foto di un piatto."}

- Se c'è cibo, stima i valori nutrizionali e rispondi ESATTAMENTE con un JSON con questi campi esatti (solo JSON, nessun markdown):
nome_piatto, calorie, proteine_g, carboidrati_g, grassi_g, fibre_g, zuccheri_g, sodio_mg, ingredienti_principali (array di stringhe), confidenza ("alta", "media" o "bassa"), note`;

    const imageUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageUrl },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    let parsed: AnalisiResult;
    try {
      const cleaned = result.text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const json = JSON.parse(cleaned);
      parsed = AnalisiResultSchema.parse(json);
    } catch {
      throw new Error("Risposta AI non valida. Riprova.");
    }

    if (parsed.nome_piatto === "" && parsed.calorie === 0) {
      throw new Error(parsed.note || "Nessun cibo rilevato nell'immagine. Per favore carica una foto di un piatto.");
    }

    await supabase
      .from("profiles")
      .update({ analisi_oggi: analisiOggi + 1 })
      .eq("user_id", userId);

    await supabase.from("analisi").insert({
      user_id: userId,
      immagine_url: "",
      risultato_json: parsed,
      pasto: data.pasto ?? null,
      kcal: parsed.calorie,
      consumed_at: today,
    });

    return parsed;
  });

export const getStorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const date = data?.date as string | undefined;
    let q = supabase
      .from("analisi")
      .select("id, risultato_json, created_at, pasto, kcal")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (date) q = q.eq("consumed_at", date as string);
    const { data: rows, error } = await q;

    if (error) throw error;
    return { storico: rows ?? [] };
  });

export const exportWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const end = data?.date ?? new Date().toISOString().split("T")[0];
    const endDate = new Date(end + "T00:00:00");
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    // fetch analisi and idratazione for these days
    const [{ data: analisiRows }, { data: idrRows }] = await Promise.all([
      supabase
        .from("analisi")
        .select("consumed_at, kcal, risultato_json, pasto, created_at")
        .eq("user_id", userId)
        .in("consumed_at", days),
      supabase
        .from("idratazione")
        .select("data, ml, created_at")
        .eq("user_id", userId)
        .in("data", days),
    ]);

    // build CSV
    const header = ["date","type","pasto","kcal","proteine_g","carboidrati_g","grassi_g","ml"].join(",");
    const lines: string[] = [header];
    for (const d of days) {
      const items = (analisiRows ?? []).filter((r: any) => r.consumed_at === d);
      for (const it of items) {
        const r: any = it.risultato_json ?? {};
        lines.push([d, "analisi", it.pasto ?? "", String(it.kcal ?? r.calorie ?? ""), String(r.proteine_g ?? ""), String(r.carboidrati_g ?? ""), String(r.grassi_g ?? ""), ""].join(","));
      }
      const waters = (idrRows ?? []).filter((w: any) => w.data === d);
      for (const w of waters) {
        lines.push([d, "idratazione", "", "", "", "", "", String(w.ml ?? "")].join(","));
      }
    }

    const csv = lines.join("\n");
    return { csv };
  });

// Salva un risultato dalla demo nello storico utente dopo registrazione/login
export const salvaAnalisi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ risultato: AnalisiResultSchema, pasto: PastoEnum }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("analisi").insert({
      user_id: userId,
      immagine_url: "",
      risultato_json: data.risultato,
      pasto: data.pasto ?? null,
      kcal: data.risultato.calorie,
      consumed_at: today,
    });
    if (error) throw new Error("Impossibile salvare l'analisi");
    return { ok: true };
  });

// Public demo: nessuna autenticazione. Limite giornaliero per IP via DB.
export const getGuestUsage = createServerFn({ method: "GET" }).handler(async () => {
  const ip = getClientIp();
  const ipHash = hashIp(ip);
  const today = new Date().toISOString().split("T")[0];
  const { data: row } = await supabaseAdmin
    .from("guest_usage")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("usage_date", today)
    .maybeSingle();
  const used = row?.count ?? 0;
  return { used, limit: GUEST_DAILY_LIMIT, remaining: Math.max(0, GUEST_DAILY_LIMIT - used) };
});

export const analizzaImmagineDemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalizzaInput.parse(input))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const ipHash = hashIp(ip);
    const today = new Date().toISOString().split("T")[0];

    const { data: row } = await supabaseAdmin
      .from("guest_usage")
      .select("count")
      .eq("ip_hash", ipHash)
      .eq("usage_date", today)
      .maybeSingle();
    const used = row?.count ?? 0;
    if (used >= GUEST_DAILY_LIMIT) {
      throw new GuestLimitError(0, GUEST_DAILY_LIMIT);
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Sei un nutrizionista esperto. Analizza l'immagine di cibo fornita.

ISTRUZIONI CRITICHE:
- Se l'immagine NON contiene cibo, rispondi ESATTAMENTE con questo JSON (nessun altro testo):
{"nome_piatto":"","calorie":0,"proteine_g":0,"carboidrati_g":0,"grassi_g":0,"fibre_g":0,"zuccheri_g":0,"sodio_mg":0,"ingredienti_principali":[],"confidenza":"bassa","note":"Nessun cibo rilevato. Carica una foto di un piatto."}

- Se c'è cibo, stima i valori nutrizionali e rispondi ESATTAMENTE con un JSON con questi campi esatti (solo JSON, nessun markdown):
nome_piatto, calorie, proteine_g, carboidrati_g, grassi_g, fibre_g, zuccheri_g, sodio_mg, ingredienti_principali (array di stringhe), confidenza ("alta", "media" o "bassa"), note`;

    const imageUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageUrl },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    let parsed: AnalisiResult;
    try {
      const cleaned = result.text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = AnalisiResultSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error("Risposta AI non valida. Riprova.");
    }

    if (parsed.nome_piatto === "" && parsed.calorie === 0) {
      throw new Error(parsed.note || "Nessun cibo rilevato nell'immagine. Carica una foto di un piatto.");
    }

    const nextCount = used + 1;
    await supabaseAdmin
      .from("guest_usage")
      .upsert(
        { ip_hash: ipHash, usage_date: today, count: nextCount, updated_at: new Date().toISOString() },
        { onConflict: "ip_hash,usage_date" }
      );

    return {
      ...parsed,
      _guest: { used: nextCount, limit: GUEST_DAILY_LIMIT, remaining: Math.max(0, GUEST_DAILY_LIMIT - nextCount) },
    };
  });

