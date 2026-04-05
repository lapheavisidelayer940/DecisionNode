// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events for subscription and payment updates
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

serve(async (req: Request) => {
    try {
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
            console.error("Stripe config missing");
            return new Response("Stripe config missing", { status: 500 });
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Supabase config missing");
            return new Response("Supabase config missing", { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const signature = req.headers.get("stripe-signature");
        if (!signature) {
            return new Response("No signature", { status: 400 });
        }

        const body = await req.text();
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error("Webhook signature verification failed:", err);
            return new Response("Invalid signature", { status: 400 });
        }

        console.log(`Processing webhook event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const metadata = session.metadata || {};

                if (metadata.type === 'subscription') {
                    // Handle subscription activation
                    const userId = metadata.supabase_user_id;
                    const plan = metadata.plan;

                    // Calculate expiration
                    const expiresAt = new Date();
                    if (plan === 'yearly') {
                        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                    } else {
                        expiresAt.setMonth(expiresAt.getMonth() + 1);
                    }

                    const { error } = await supabase
                        .from("profiles")
                        .update({
                            subscription_tier: 'pro',
                            subscription_expires_at: expiresAt.toISOString(),
                        })
                        .eq("id", userId);

                    if (error) {
                        console.error("Failed to update subscription:", error);
                    } else {
                        console.log(`Subscription activated for user ${userId}`);
                    }
                }

                if (metadata.type === 'pack_purchase') {
                    // Handle pack purchase
                    const userId = metadata.supabase_user_id;
                    const packId = metadata.pack_id;
                    const platformFee = parseInt(metadata.platform_fee_cents || '0');
                    const creatorAmount = parseInt(metadata.creator_amount_cents || '0');

                    const { error } = await supabase
                        .from("pack_purchases")
                        .insert({
                            user_id: userId,
                            pack_id: packId,
                            amount_cents: session.amount_total || 0,
                            platform_fee_cents: platformFee,
                            creator_amount_cents: creatorAmount,
                            stripe_payment_id: session.payment_intent as string,
                            stripe_checkout_session_id: session.id,
                            status: 'completed',
                        });

                    if (error) {
                        console.error("Failed to record purchase:", error);
                    } else {
                        console.log(`Pack purchase recorded for user ${userId}, pack ${packId}`);
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                // Find user by Stripe customer ID
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (profile) {
                    const isActive = subscription.status === 'active';
                    const periodEnd = new Date(subscription.current_period_end * 1000);

                    const { error } = await supabase
                        .from("profiles")
                        .update({
                            subscription_tier: isActive ? 'pro' : 'free',
                            subscription_expires_at: periodEnd.toISOString(),
                        })
                        .eq("id", profile.id);

                    if (error) {
                        console.error("Failed to update subscription status:", error);
                    } else {
                        console.log(`Subscription updated for user ${profile.id}: ${subscription.status}`);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (profile) {
                    const { error } = await supabase
                        .from("profiles")
                        .update({
                            subscription_tier: 'free',
                        })
                        .eq("id", profile.id);

                    if (error) {
                        console.error("Failed to cancel subscription:", error);
                    } else {
                        console.log(`Subscription cancelled for user ${profile.id}`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Webhook error:", error);
        return new Response("Webhook error", { status: 500 });
    }
});
