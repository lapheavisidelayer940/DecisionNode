// Supabase Edge Function: embed-pack
// Generates vector embeddings for pack decisions using Gemini API
// Includes quota enforcement for free tier users
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TIER_WEEKLY_LIMIT = 3;

interface Decision {
    id: string;
    scope: string;
    decision: string;
    rationale?: string;

    constraints?: string[];
    tags?: string[];
    status: string;
}

interface EmbedRequest {
    pack_id: string;
    decisions: Decision[];
    skip_embedding?: boolean; // Allow publishing without embedding
}

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
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

// Create embedding text from decision
function getEmbeddingText(decision: Decision): string {
    const parts = [
        `[${decision.scope}] ${decision.decision}`,
        decision.rationale ? `Rationale: ${decision.rationale}` : "",
        decision.constraints?.length
            ? `Constraints: ${decision.constraints.join(", ")}`
            : "",
    ];
    return parts.filter(Boolean).join("\n");
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get environment variables
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Supabase config missing");
            return new Response(
                JSON.stringify({ error: "Supabase config missing" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Parse request body first to get access_token
        const requestBody = await req.json();
        const { pack_id, decisions, skip_embedding, access_token } = requestBody as EmbedRequest & { access_token?: string };

        if (!access_token) {
            return new Response(
                JSON.stringify({ error: "access_token is required in request body" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify the user using the provided access token
        const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return new Response(
                JSON.stringify({
                    error: "Unauthorized",
                    details: authError?.message || "Invalid access token"
                }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Authenticated user: ${user.id}`);

        if (!pack_id || !decisions || decisions.length === 0) {
            return new Response(
                JSON.stringify({ error: "pack_id and decisions are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // If skip_embedding is true, just mark pack as not embedded and return
        if (skip_embedding) {
            const { error } = await supabase
                .from("packs")
                .update({ is_embedded: false })
                .eq("id", pack_id);

            if (error) {
                return new Response(
                    JSON.stringify({ error: `Failed to update pack: ${error.message}` }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    embedded: 0,
                    skipped: true,
                    message: "Pack published without embedding"
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if GEMINI_API_KEY is configured for embedding
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not configured");
            return new Response(
                JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get user's profile to check subscription tier
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_tier, subscription_expires_at")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Failed to get profile:", profileError);
            return new Response(
                JSON.stringify({ error: "Failed to verify user profile" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if user is Pro (subscription active and not expired)
        const isPro = profile.subscription_tier === 'pro' &&
            (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

        // If not Pro, check weekly quota
        if (!isPro) {
            const { data: weeklyCount, error: countError } = await supabase
                .rpc("get_weekly_embedding_count", { p_user_id: user.id });

            if (countError) {
                console.error("Failed to get weekly count:", countError);
                return new Response(
                    JSON.stringify({ error: "Failed to check embedding quota" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (weeklyCount >= FREE_TIER_WEEKLY_LIMIT) {
                return new Response(
                    JSON.stringify({
                        error: "Weekly embedding limit reached",
                        quota_exceeded: true,
                        weekly_count: weeklyCount,
                        weekly_limit: FREE_TIER_WEEKLY_LIMIT,
                        message: `Free tier is limited to ${FREE_TIER_WEEKLY_LIMIT} embedding publishes per week. Upgrade to Pro for unlimited embedding.`
                    }),
                    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        console.log(`Embedding ${decisions.length} decisions for pack ${pack_id} (user: ${user.id}, pro: ${isPro})`);

        // Generate embeddings in parallel for speed and cost efficiency
        const embeddingPromises = decisions.map(async (decision) => {
            const text = getEmbeddingText(decision);
            console.log(`Generating embedding for: ${decision.id}`);
            const embedding = await generateEmbedding(text, GEMINI_API_KEY);
            console.log(`Embedded: ${decision.id} (${embedding.length} dimensions)`);
            return { id: decision.id, embedding };
        });

        const results = await Promise.all(embeddingPromises);

        const vectors: Record<string, number[]> = {};
        for (const result of results) {
            vectors[result.id] = result.embedding;
        }

        // Update pack with vectors and mark as embedded
        const { error: updateError } = await supabase
            .from("packs")
            .update({ vectors, is_embedded: true })
            .eq("id", pack_id);

        if (updateError) {
            console.error("Failed to update pack:", updateError);
            return new Response(
                JSON.stringify({ error: `Failed to update pack: ${updateError.message}` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Record the embedding publish for quota tracking (only for free tier)
        if (!isPro) {
            const { error: recordError } = await supabase
                .from("embedding_publishes")
                .insert({ user_id: user.id, pack_id });

            if (recordError) {
                console.error("Failed to record embedding publish:", recordError);
                // Non-fatal, continue
            }
        }

        console.log(`Successfully embedded pack ${pack_id}`);

        return new Response(
            JSON.stringify({
                success: true,
                embedded: decisions.length,
                is_pro: isPro
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
