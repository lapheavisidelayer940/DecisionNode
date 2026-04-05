// Supabase Edge Function: sync-status
// Returns which decisions are synced for a project (Pro only)
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncStatusRequest {
    project_name: string;
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({ error: "Supabase config missing" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get auth token to identify user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid authorization" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get user's profile to check subscription tier
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_tier, subscription_expires_at")
            .eq("id", user.id)
            .single();

        if (profileError) {
            return new Response(
                JSON.stringify({ error: "Failed to verify user profile" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if user is Pro
        const isPro = profile.subscription_tier === 'pro' &&
            (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

        if (!isPro) {
            return new Response(
                JSON.stringify({
                    error: "Pro subscription required",
                    message: "Cloud sync status is only available for Pro subscribers."
                }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { project_name } = (await req.json()) as SyncStatusRequest;

        if (!project_name) {
            return new Response(
                JSON.stringify({ error: "project_name is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get synced decision IDs for this project
        const { data: decisions, error: fetchError } = await supabase
            .from("user_decisions")
            .select("decision_id")
            .eq("user_id", user.id)
            .eq("project_name", project_name);

        if (fetchError) {
            return new Response(
                JSON.stringify({ error: "Failed to fetch sync status" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const synced = (decisions || []).map(d => d.decision_id);

        return new Response(
            JSON.stringify({
                synced,
                total_in_cloud: synced.length
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
