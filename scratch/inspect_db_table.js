const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

async function run() {
    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Checking live_classes columns...");
    const { data: classCols, error: classErr } = await supabase
        .from('live_classes')
        .select('*')
        .limit(1);

    if (classErr) {
        console.error("Error fetching live_classes:", classErr.message);
    } else {
        console.log("live_classes columns:", Object.keys(classCols[0] || {}));
    }

    console.log("\nChecking staff_details columns...");
    const { data: staffCols, error: staffErr } = await supabase
        .from('staff_details')
        .select('*')
        .limit(1);

    if (staffErr) {
        console.error("Error fetching staff_details:", staffErr.message);
    } else {
        console.log("staff_details columns:", Object.keys(staffCols[0] || {}));
    }
}

run();
