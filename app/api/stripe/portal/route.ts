import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { flow?: string };
    const cancel = body.flow === "cancel";

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json(
        { error: "No billing account yet. Subscribe to a plan first." },
        { status: 400 }
      );
    }

    if (cancel && !profile.stripe_subscription_id) {
      return Response.json(
        { error: "No active subscription to cancel." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/app/billing`,
      ...(cancel && profile.stripe_subscription_id
        ? {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: {
                subscription: profile.stripe_subscription_id,
              },
              after_completion: {
                type: "redirect" as const,
                redirect: { return_url: `${req.nextUrl.origin}/app/billing` },
              },
            },
          }
        : {}),
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
