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

    console.log("Updating reschedule request status to pending...");
    const { data, error } = await supabase
        .from('reschedule_requests')
        .update({ status: 'pending' })
        .eq('id', 'cb9c8e1f-1d81-4c37-9298-83a36acd66a0')
        .select();

    if (error) {
        console.error("Error updating status:", error);
    } else {
        console.log("Success! Updated row:", data);
    }
}

run();
