// Supabase Edge Function: sync-decisions
// Syncs local decisions to cloud storage with auto-embedding
// For Decide Cloud Sync (Pro) subscribers
// @ts-nocheck - Deno types not available in Node env

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Decision {
    id: string;
    scope: string;
    decision: string;
    rationale?: string;

    constraints?: string[];
    status: 'active' | 'deprecated' | 'overridden';
    createdAt?: string;
    updatedAt?: string;
}

interface SyncRequest {
    project_name: string;
    decisions: Decision[];
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
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
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
                    message: "Cloud sync is only available for Decide Cloud Sync subscribers."
                }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { project_name, decisions } = (await req.json()) as SyncRequest;

        if (!project_name || !decisions) {
            return new Response(
                JSON.stringify({ error: "project_name and decisions are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Syncing ${decisions.length} decisions for project "${project_name}" (user: ${user.id})`);

        const synced: string[] = [];
        const failed: string[] = [];
        const errors: Record<string, string> = {};

        for (const decision of decisions) {
            try {
                // Use provided embedding or generate it
                let embedding: number[] | null = (decision as any).embedding || null;

                if (!embedding && GEMINI_API_KEY) {
                    const text = getEmbeddingText(decision);
                    embedding = await generateEmbedding(text, GEMINI_API_KEY);
                    // Rate limit protection
                    await new Promise(r => setTimeout(r, 200));
                }

                // Normalize status to match DB constraint
                let dbStatus = decision.status;
                const s = (decision.status || '').toLowerCase();
                if (s === 'accepted' || s === 'proposed') dbStatus = 'active';
                else if (s === 'rejected') dbStatus = 'deprecated';
                else if (!['active', 'deprecated', 'overridden'].includes(s)) dbStatus = 'active'; // Fallback

                // Upsert decision to cloud
                const { error: upsertError } = await supabase
                    .from("user_decisions")
                    .upsert({
                        user_id: user.id,
                        project_name,
                        decision_id: decision.id,
                        scope: decision.scope,
                        decision: decision.decision,
                        rationale: decision.rationale || null,
                        applies_to: decision.applies_to || null,
                        tags: decision.tags || null,
                        constraints: decision.constraints || null,
                        status: dbStatus,
                        embedding,
                        synced_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,project_name,decision_id'
                    });

                if (upsertError) {
                    console.error(`Failed to sync ${decision.id}:`, upsertError);
                    failed.push(decision.id);
                    errors[decision.id] = upsertError.message;
                } else {
                    synced.push(decision.id);
                }
            } catch (error) {
                console.error(`Error syncing ${decision.id}:`, error);
                failed.push(decision.id);
                errors[decision.id] = (error as Error).message;
            }
        }

        console.log(`Sync complete: ${synced.length} synced, ${failed.length} failed`);

        return new Response(
            JSON.stringify({
                success: true,
                synced,
                failed,
                errors,
                embedded: GEMINI_API_KEY ? synced.length : 0
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
