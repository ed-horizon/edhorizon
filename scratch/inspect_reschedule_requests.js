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

    const { data, error } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(full_name, email)
        `);

    if (error) {
        console.error("Error fetching reschedule_requests:", error);
    } else {
        console.log("reschedule_requests exists! Rows:", JSON.stringify(data, null, 2));
    }
}

run();
