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

    const tables = ['student_details', 'class_schedules', 'live_classes', 'student_leaves', 'reschedule_requests', 'payments'];

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Error fetching from ${table}:`, error.message);
        } else {
            console.log(`\nTable: ${table}`);
            console.log(`Columns:`, data[0] ? Object.keys(data[0]) : "No rows (fetching columns via API schema check...)");
            if (data[0]) {
                console.log(`Sample row:`, data[0]);
            }
        }
    }
}

run();
