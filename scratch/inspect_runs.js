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

    const { data: runs, error } = await supabase.from('payroll_runs').select('*');
    if (error) {
        console.error("Runs Error:", error);
    } else {
        console.log("Payroll Runs:", runs);
    }

    const { data: items, error: itemsError } = await supabase.from('payroll_items').select('*').limit(5);
    if (itemsError) {
        console.error("Items Error:", itemsError);
    } else {
        console.log("Payroll Items sample:", items);
    }
}

run();
