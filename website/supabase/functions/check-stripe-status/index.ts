// Supabase Edge Function: check-stripe-status
// Cache-first strategy: checks database cache before calling Stripe API
// TTL: 24 hours | Manual refresh: forceRefresh=true
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({ error: "Missing configuration" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get auth token
        const authToken = req.headers.get("authorization");
        if (!authToken) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user
        const token = authToken.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid authorization" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check for force refresh parameter
        const url = new URL(req.url);
        const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

        // Get profile with cache data
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_connect_id, stripe_account_status, stripe_status_checked_at")
            .eq("id", user.id)
            .single();

        if (!profile?.stripe_connect_id) {
            return new Response(
                JSON.stringify({
                    status: 'not_connected',
                    message: 'No Stripe account connected',
                    cached: false
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check cache validity (24 hours TTL)
        // BUT: Never use cache for pending/incomplete statuses - these can change at any moment
        const isStableStatus = profile.stripe_account_status === 'active' || profile.stripe_account_status === 'not_connected';
        const cacheValid = profile.stripe_status_checked_at &&
            isStableStatus &&
            (new Date().getTime() - new Date(profile.stripe_status_checked_at).getTime()) < (CACHE_TTL_HOURS * 60 * 60 * 1000);

        // Return cached data if valid and not forced refresh (only for stable statuses)
        if (cacheValid && !forceRefresh && profile.stripe_account_status) {
            let message: string;
            switch (profile.stripe_account_status) {
                case 'active':
                    message = 'Your account is fully set up and ready to receive payments';
                    break;
                case 'pending':
                    message = 'Your account is pending verification by Stripe';
                    break;
                case 'incomplete':
                    message = 'Please complete your Stripe account setup to receive payments';
                    break;
                default:
                    message = 'No Stripe account connected';
            }

            return new Response(
                JSON.stringify({
                    status: profile.stripe_account_status,
                    message,
                    account_id: profile.stripe_connect_id,
                    cached: true,
                    checked_at: profile.stripe_status_checked_at
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Cache miss or stale - fetch from Stripe
        const account = await stripe.accounts.retrieve(profile.stripe_connect_id);

        // Check if transfers capability is enabled
        const transfersEnabled = account.capabilities?.transfers === 'active';
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        let status: 'incomplete' | 'pending' | 'active';
        let message: string;

        if (transfersEnabled && chargesEnabled && payoutsEnabled) {
            status = 'active';
            message = 'Your account is fully set up and ready to receive payments';
        } else if (detailsSubmitted) {
            status = 'pending';
            message = 'Your account is pending verification by Stripe';
        } else {
            status = 'incomplete';
            message = 'Please complete your Stripe account setup to receive payments';
        }

        // Update cache in database
        await supabaseAdmin
            .from("profiles")
            .update({
                stripe_account_status: status,
                stripe_status_checked_at: new Date().toISOString()
            })
            .eq("id", user.id);

        return new Response(
            JSON.stringify({
                status,
                message,
                account_id: profile.stripe_connect_id,
                cached: false,
                details: {
                    transfers_enabled: transfersEnabled,
                    charges_enabled: chargesEnabled,
                    payouts_enabled: payoutsEnabled,
                    details_submitted: detailsSubmitted
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
