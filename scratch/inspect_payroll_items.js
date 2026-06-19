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

    // Fetch PostgREST OpenAPI schema detail for payroll_items
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    const schema = await res.json();
    const tableDef = schema.definitions ? schema.definitions.payroll_items : null;
    
    if (tableDef) {
        console.log("PostgREST Schema for payroll_items properties:", Object.keys(tableDef.properties || {}));
        console.log("PostgREST Schema full definition:", tableDef);
    } else {
        console.log("No definition found for payroll_items in PostgREST schema.");
    }

    // Attempt a SELECT * LIMIT 1
    const { data, error } = await supabase
        .from('payroll_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error("SELECT * Error:", error.message);
    } else {
        console.log("SELECT * successful! Columns returned:", data[0] ? Object.keys(data[0]) : "No rows in table");
    }
}

run();
