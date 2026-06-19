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

    // Get the profile for e20e42a1-7f8d-4f51-9040-9594811e57db
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'e20e42a1-7f8d-4f51-9040-9594811e57db')
        .single();

    if (pError) {
        console.error("Error fetching profile:", pError);
    } else {
        console.log("Teacher profile:", profile);
    }

    // Get all reschedule requests
    const { data: reqs, error: rError } = await supabase
        .from('reschedule_requests')
        .select('*');

    if (rError) {
        console.error("Error fetching reschedule_requests:", rError);
    } else {
        console.log("All reschedule requests:", reqs);
    }
}

run();
