const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

    console.log("Checking if staff_shifts table exists...");
    const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error from staff_shifts check:", error);
    } else {
        console.log("staff_shifts table check successful! Data:", data);
    }
}

run();
