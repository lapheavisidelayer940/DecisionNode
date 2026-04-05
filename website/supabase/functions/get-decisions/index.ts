// Supabase Edge Function: get-decisions
// Retrieves decisions from cloud storage
// For Decide Cloud Sync (Pro) subscribers
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client with user's token
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: authHeader },
            },
        });

        // Get current user (verify token manually)
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("Auth Error:", userError);
            return new Response(
                JSON.stringify({ error: "Unauthorized: Invalid token", details: userError }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse query params or body
        let projectName = new URL(req.url).searchParams.get("project_name");

        // Also check body if not in query
        if (!projectName && req.headers.get("content-type")?.includes("application/json")) {
            try {
                const body = await req.json();
                projectName = body.project_name;
            } catch {
                // Ignore body parse error
            }
        }

        if (!projectName) {
            return new Response(
                JSON.stringify({ error: "project_name is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Query decisions
        const { data, error } = await supabase
            .from("user_decisions")
            .select("*")
            .eq("project_name", projectName)
            .eq("user_id", user.id);

        if (error) {
            console.error("Query error:", error);
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
