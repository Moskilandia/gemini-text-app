import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_BY_PLAN = {
  team: process.env.STRIPE_TEAM_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    // Parse and validate request body
    const { userId, orgId, plan } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing userId" }),
      };
    }
    if (!orgId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing orgId" }),
      };
    }
    if (!["team", "business"].includes(plan)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan" }),
      };
    }
    if (!PRICE_BY_PLAN[plan]) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Stripe price id for plan" }),
      };
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: userId,
      metadata: { orgId },
      subscription_data: { metadata: { orgId } },
      line_items: [
        {
          price: PRICE_BY_PLAN[plan],
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL}/org/${orgId}?upgraded=true`,
      cancel_url: `${process.env.URL}/org/${orgId}?upgrade_cancelled=true`,
    });

    // Audit logging
    // TODO: Replace previousPlan logic with actual lookup if available
    const previousPlan = plan === "business" ? "team" : "none";
    const newPlan = plan;
    try {
      const { logAuditEvent } = await import("../../shared/audit.ts");
      // Log plan upgrade event
      await logAuditEvent({
        orgId,
        actionType: "plan.upgraded",
        metadata: {
          from: previousPlan,
          to: newPlan,
        },
      });
      // Log documentation standard applied (domain: housing)
      await logAuditEvent({
        orgId,
        userId,
        actionType: "org.documentation_standard.applied",
        metadata: { domain: "housing" },
      });
    } catch (auditError) {
      // Log audit failure, but do not block checkout
      console.error("Audit log failed", auditError);
    }

    // Respond with Stripe session URL
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    // Audit log: payment failed
    try {
      const { logAuditEvent } = await import("../../shared/audit.ts");
      await logAuditEvent({
        orgId,
        actionType: "payment.failed",
        metadata: { error: err.message },
      });
    } catch (auditError) {
      console.error("Audit log failed", auditError);
    }
    // Respond with error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
