import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Creates a Stripe Billing Portal session for the current client and returns its
// URL. The client redirects the browser there.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe_not_configured", message: "Billing isn't available yet." },
      { status: 503 },
    );
  }

  const supa = createServerClient();
  const { data: client } = await supa
    .from("clients")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (!client?.stripe_customer_id) {
    return NextResponse.json(
      { error: "no_customer", message: "No billing account on file yet." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${origin}/portal/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 },
    );
  }
}
