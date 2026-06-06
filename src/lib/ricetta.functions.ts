import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const RicettaInput = z.object({
  piatto: z.string().trim().min(2).max(120),
});

const RicettaSchema = z.object({
  nome: z.string(),
  porzioni: z.number(),
  tempo_minuti: z.number(),
  difficolta: z.enum(["facile", "media", "difficile"]),
  ingredienti: z.array(z.object({ nome: z.string(), quantita: z.string() })),
  procedimento: z.array(z.string()),
  nutrizione_per_porzione: z.object({
    calorie: z.number(),
    proteine_g: z.number(),
    carboidrati_g: z.number(),
    grassi_g: z.number(),
  }),
  youtube_query: z.string(),
});

export type Ricetta = z.infer<typeof RicettaSchema>;

export const cercaRicetta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RicettaInput.parse(i))
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

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Sei uno chef italiano. L'utente cerca: "${data.piatto}".
Rispondi SOLO con JSON valido (nessun markdown) con questi campi esatti:
{
  "nome": "nome del piatto",
  "porzioni": 4,
  "tempo_minuti": 30,
  "difficolta": "facile" | "media" | "difficile",
  "ingredienti": [{"nome":"...","quantita":"200g"}],
  "procedimento": ["passo 1", "passo 2"],
  "nutrizione_per_porzione": {"calorie": 0, "proteine_g": 0, "carboidrati_g": 0, "grassi_g": 0},
  "youtube_query": "query di ricerca YouTube ottimale per trovare un buon video tutorial"
}

Se il piatto non è riconoscibile o non è cibo, usa nome="" e procedimento=[].`;

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [{ role: "user", content: prompt }],
    });

    let parsed: Ricetta;
    try {
      const cleaned = result.text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = RicettaSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error("Risposta AI non valida. Riprova con un piatto diverso.");
    }

    if (!parsed.nome || parsed.procedimento.length === 0) {
      throw new Error("Piatto non riconosciuto. Prova con un nome diverso.");
    }

    return parsed;
  });
