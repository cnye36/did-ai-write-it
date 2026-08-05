import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  applyCheckoutSessionObject,
  applySubscriptionObject,
} from "@/lib/stripe-sync";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const stripe = getStripe();
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await applyCheckoutSessionObject(event.data.object as Stripe.Checkout.Session);
      break;
    }
    case "customer.subscription.updated": {
      await applySubscriptionObject(event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      await applySubscriptionObject(event.data.object as Stripe.Subscription, true);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.error("Stripe invoice.payment_failed", {
        invoiceId: invoice.id,
        customerId:
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
        attemptCount: invoice.attempt_count,
        billingReason: invoice.billing_reason,
      });
      break;
    }
  }

  return Response.json({ received: true });
}
