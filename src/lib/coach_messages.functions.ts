import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getCoachMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("coach_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    return { messages: data ?? [] };
  });

export const postCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000), lang: z.string().min(2).max(10).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // We accept an optional `lang` from client but don't require storing it in DB yet (migration may not have the column).
    const payload: any = { user_id: userId, role: data.role, content: data.content };
    const { error } = await (supabase as any)
      .from("coach_messages")
      .insert(payload);
    if (error) throw error;
    return { ok: true };
  });
