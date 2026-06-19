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

    console.log("Fetching student_details schema info...");
    const { data, error } = await supabase
        .from('student_details')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Success! Columns in student_details:", Object.keys(data[0] || {}));
    }
}

run();
