// Supabase Edge Function: update-decision
// Updates a decision in cloud storage with auto-embedding
// For Decide Cloud Sync (Pro) subscribers
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate embedding using Gemini API
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-001",
                content: { parts: [{ text }] },
            }),
        }
    );

    if (!response.ok) {
        console.error("Gemini API Error:", await response.text());
        return null; // Don't fail the update if embedding fails
    }

    const data = await response.json();
    return data.embedding.values;
}

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

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: authHeader },
            },
        });

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized: Invalid token", details: userError }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { decision_id, updates } = await req.json();

        if (!decision_id || !updates) {
            return new Response(
                JSON.stringify({ error: "decision_id and updates are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build update object
        const allowedFields = ["decision", "rationale", "constraints", "status"];
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        }

        // Retrieve existing decision to construct full text for embedding
        if (updates.decision || updates.rationale || updates.constraints) {
            const { data: existing } = await supabase
                .from("user_decisions")
                .select("*")
                .eq("decision_id", decision_id)
                .eq("user_id", user.id)
                .single();

            if (existing && GEMINI_API_KEY) {
                const fullDecision = { ...existing, ...updates };
                const text = [
                    `[${fullDecision.scope}] ${fullDecision.decision}`,
                    fullDecision.rationale ? `Rationale: ${fullDecision.rationale}` : "",
                    fullDecision.constraints?.length ? `Constraints: ${fullDecision.constraints.join(", ")}` : "",
                ].filter(Boolean).join("\n");

                const embedding = await generateEmbedding(text, GEMINI_API_KEY);
                if (embedding) {
                    updateData.embedding = embedding;
                }
            }
        }

        // Update the decision
        const { data, error } = await supabase
            .from("user_decisions")
            .update(updateData)
            .eq("decision_id", decision_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                decision: data,
                embedded: !!updateData.embedding
            }),
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
