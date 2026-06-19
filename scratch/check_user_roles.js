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

    console.log("Fetching profile roles...");
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role');

    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Profiles list:");
        data.forEach(p => {
            console.log(`- ${p.email} | Name: ${p.full_name} | Role: ${p.role} | ID: ${p.id}`);
        });
    }
}

run();
