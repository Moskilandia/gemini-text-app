import Stripe from "stripe";
import { setUserPlan } from "../../lib/userPlans";
import { supabase } from "../../shared/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const handler = async (event: any) => {
  const sig = event.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let stripeEvent;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as any;
      const orgId = session.customer_metadata?.orgId || session.metadata?.orgId;
      let priceId = session.line_items?.data?.[0]?.price?.id;

      if (!priceId && session.id) {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 1,
          expand: ["data.price"],
        });

        const first = lineItems.data?.[0];
        const price = first?.price;
        priceId = typeof price === "string" ? price : price?.id;
      }

      let plan = "team";
      if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
        plan = "business";
      }

      await supabase
        .from("organizations")
        .update({ plan })
        .eq("id", orgId);

      break;
    }

    case "customer.subscription.deleted": {
      const sub = stripeEvent.data.object as Stripe.Subscription;
      const userId = (sub as any).metadata?.userId;
      if (userId) await setUserPlan(userId, "free");
      break;
    }
  }

  return { statusCode: 200, body: "ok" };
};
