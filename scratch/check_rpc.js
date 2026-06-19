const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Attempting to query pg_catalog.pg_proc...");
    const { data: data1, error: error1 } = await supabase
        .from('pg_proc')
        .select('proname')
        .limit(5);
    
    if (error1) {
        console.log("pg_proc query failed:", error1.message);
    } else {
        console.log("pg_proc success! Samples:", data1);
    }

    console.log("Attempting to query RPC functions from pg_catalog/rpc...");
    // Let's check if we can call an arbitrary RPC function or if we can find existing RPCs
    // Typically we can check info schema via postgrest OpenAPI description:
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    const schema = await res.json();
    console.log("Available paths in REST API:", Object.keys(schema.paths || {}));
}

run();
