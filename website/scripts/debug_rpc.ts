
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Use public keys for now, assuming RLS allows access or we have a test user
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ffjneqkruzzqytwrwjsy.supabase.co";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_KEY) {
    console.error("Please provide SUPABASE_SERVICE_ROLE_KEY env var");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRpc() {
    console.log("Calling get_secure_pack_details for 'test'...");
    const { data, error } = await supabase.rpc('get_secure_pack_details', { p_slug: 'test' });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success. Data length:", data?.length);
        if (data && data.length > 0) {
            const pack = data[0];
            console.log("Pack:", pack.name);
            console.log("Total decisions:", pack.total_decisions_count);
            console.log("Preview decisions count:", pack.preview_decisions);
            console.log("Decisions array length:", pack.decisions?.length);
            console.log("Decisions content:", JSON.stringify(pack.decisions, null, 2));
        } else {
            console.warn("No data returned.");
        }
    }
}

testRpc();
