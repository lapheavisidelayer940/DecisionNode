// Supabase Edge Function: create-checkout
// Creates Stripe checkout sessions for subscriptions and pack purchases
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
    type: 'subscription' | 'pack_purchase';
    plan?: 'monthly' | 'yearly'; // For subscriptions
    pack_id?: string; // For pack purchases
    success_url: string;
    cancel_url: string;
}

// Pricing (in cents)
const SUBSCRIPTION_PRICES = {
    monthly: 499, // $4.99
    yearly: 3999, // $39.99
};

const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!STRIPE_SECRET_KEY) {
            return new Response(
                JSON.stringify({ error: "Stripe not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({ error: "Supabase config missing" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

        // Create client with service role for database operations
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Debug: Log all headers
        const allHeaders: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            allHeaders[key] = value;
        });
        console.log("All request headers:", JSON.stringify(allHeaders));

        // Try multiple header sources for auth token
        let authToken = req.headers.get("authorization");
        if (!authToken) authToken = req.headers.get("Authorization");
        if (!authToken) authToken = req.headers.get("x-supabase-auth");

        // Supabase Edge Functions can receive forwarded auth
        const forwardedAuth = req.headers.get("x-forwarded-authorization");
        if (!authToken && forwardedAuth) authToken = forwardedAuth;

        if (!authToken) {
            return new Response(
                JSON.stringify({
                    error: "Authorization required - no auth header found",
                    debug: { headers: Object.keys(allHeaders) }
                }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extract the token from "Bearer <token>"
        const token = authToken.replace("Bearer ", "");

        // Verify the user's token using the admin client
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return new Response(
                JSON.stringify({ error: "Invalid authorization", details: authError?.message }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { type, plan, pack_id, success_url, cancel_url } = (await req.json()) as CheckoutRequest;

        // Get or create Stripe customer using admin client
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id, username")
            .eq("id", user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;

            await supabaseAdmin
                .from("profiles")
                .update({ stripe_customer_id: customerId })
                .eq("id", user.id);
        }

        if (type === 'subscription') {
            if (!plan || !['monthly', 'yearly'].includes(plan)) {
                return new Response(
                    JSON.stringify({ error: "Invalid plan" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'DecisionNode Cloud Sync',
                            description: plan === 'yearly'
                                ? 'Annual subscription - Save 33%!'
                                : 'Monthly subscription',
                        },
                        unit_amount: SUBSCRIPTION_PRICES[plan],
                        recurring: {
                            interval: plan === 'yearly' ? 'year' : 'month',
                        },
                    },
                    quantity: 1,
                }],
                success_url,
                cancel_url,
                metadata: {
                    supabase_user_id: user.id,
                    type: 'subscription',
                    plan,
                },
            });

            return new Response(
                JSON.stringify({ checkout_url: session.url }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (type === 'pack_purchase') {
            if (!pack_id) {
                return new Response(
                    JSON.stringify({ error: "pack_id required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get pack details
            const { data: pack, error: packError } = await supabaseAdmin
                .from("packs")
                .select("id, name, price_cents, author_id, is_paid")
                .eq("id", pack_id)
                .single();

            if (packError || !pack) {
                return new Response(
                    JSON.stringify({ error: "Pack not found" }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!pack.is_paid || pack.price_cents <= 0) {
                return new Response(
                    JSON.stringify({ error: "This pack is free" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if already purchased
            const { data: existingPurchase } = await supabaseAdmin
                .from("pack_purchases")
                .select("id")
                .eq("user_id", user.id)
                .eq("pack_id", pack_id)
                .eq("status", "completed")
                .single();

            if (existingPurchase) {
                return new Response(
                    JSON.stringify({ error: "Already purchased" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const platformFee = Math.round(pack.price_cents * PLATFORM_FEE_PERCENTAGE);
            const creatorAmount = pack.price_cents - platformFee;

            // Get author's Stripe Connect ID
            const { data: author, error: authorError } = await supabaseAdmin
                .from("profiles")
                .select("stripe_connect_id, username")
                .eq("id", pack.author_id)
                .single();

            if (authorError || !author) {
                return new Response(
                    JSON.stringify({ error: "Pack author not found" }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!author.stripe_connect_id) {
                return new Response(
                    JSON.stringify({
                        error: "seller_unavailable",
                        message: "Creator has not connected their Stripe account",
                        details: "This creator needs to set up payments before you can purchase their packs. Please try again later."
                    }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'payment',
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: pack.name,
                            description: 'Decision Pack',
                        },
                        unit_amount: pack.price_cents,
                    },
                    quantity: 1,
                }],
                payment_intent_data: {
                    application_fee_amount: platformFee,
                    transfer_data: {
                        destination: author.stripe_connect_id,
                    },
                },
                success_url,
                cancel_url,
                metadata: {
                    supabase_user_id: user.id,
                    type: 'pack_purchase',
                    pack_id,
                    platform_fee_cents: platformFee.toString(),
                    creator_amount_cents: creatorAmount.toString(),
                },
            });

            return new Response(
                JSON.stringify({ checkout_url: session.url }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid checkout type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
