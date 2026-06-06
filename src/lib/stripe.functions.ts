import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PRICE_IDS = {
  pro: "price_1TfFFgI2tCzUVNKEYOmywHDu",
  ristorante: "price_1TfFGXI2tCzUVNKEpTOEHdMx",
} as const;

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_UeYMrEkZBrdom4: "pro",
  prod_UeYNzgwwnBaIMR: "ristorante",
};

const PlanInput = z.object({ plan: z.enum(["pro", "ristorante"]) });

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurata");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
}

function getOrigin() {
  const req = getRequest();
  return (
    req?.headers.get("origin") ||
    req?.headers.get("referer")?.replace(/\/$/, "") ||
    "https://kcalvison.lovable.app"
  );
}

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanInput.parse(i))
  .handler(async ({ data, context }) => {
    const stripe = await getStripeClient();
    const { supabase, userId, claims } = context;
    const email = claims.email as string | undefined;
    if (!email) throw new Error("Email utente non disponibile");

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
    }

    const origin = getOrigin();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: PRICE_IDS[data.plan], quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/app?upgraded=1`,
      cancel_url: `${origin}/app`,
    });

    return { url: session.url };
  });

export const checkSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = await getStripeClient();
    const { supabase, userId, claims } = context;
    const email = claims.email as string | undefined;
    if (!email) return { piano: "free", subscription_end: null };

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      await supabase
        .from("profiles")
        .update({ piano: "free", stripe_product_id: null, subscription_end: null })
        .eq("user_id", userId);
      return { piano: "free", subscription_end: null };
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subs.data.length === 0) {
      await supabase
        .from("profiles")
        .update({
          piano: "free",
          stripe_customer_id: customerId,
          stripe_product_id: null,
          subscription_end: null,
        })
        .eq("user_id", userId);
      return { piano: "free", subscription_end: null };
    }

    const sub = subs.data[0];
    const productId = sub.items.data[0].price.product as string;
    const piano = PRODUCT_TO_PLAN[productId] ?? "free";
    const end = new Date((sub as any).current_period_end * 1000).toISOString();

    await supabase
      .from("profiles")
      .update({
        piano,
        stripe_customer_id: customerId,
        stripe_product_id: productId,
        subscription_end: end,
      })
      .eq("user_id", userId);

    return { piano, subscription_end: end };
  });

export const customerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = await getStripeClient();
    const email = context.claims.email as string | undefined;
    if (!email) throw new Error("Email utente non disponibile");

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) throw new Error("Nessun cliente Stripe trovato");

    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${getOrigin()}/app`,
    });
    return { url: portal.url };
  });
