const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse env variables
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
        env.NEXT_PUBLIC_URL || env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Testing insert into student_details with classes_per_month...");
    
    // We try to upsert a dummy row to see what error occurs
    const dummyId = '6993c7d8-d047-4f18-b025-046dba9e6a63'; // An existing student ID
    
    const { data, error } = await supabase
        .from('student_details')
        .upsert({
            id: dummyId,
            classes_per_month: 12
        });

    if (error) {
        console.error("UPSERT ERROR:", error);
    } else {
        console.log("UPSERT SUCCESS (column exists!)");
    }
}

run();
