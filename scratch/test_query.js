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

    const runId = '0b8dbd11-5d46-4c7a-9777-17ec30932525'; // let's fetch a valid run first
    const { data: runs } = await supabase.from('payroll_runs').select('id').limit(1);
    if (!runs || runs.length === 0) {
        console.log("No payroll runs found");
        return;
    }
    const id = runs[0].id;
    console.log("Found run ID:", id);

    const { data: items, error } = await supabase
        .from('payroll_items')
        .select(`
            id,
            basic_amount,
            payout_status,
            deductions_amount,
            deductions,
            deduction_reason,
            bonus_amount,
            net_amount,
            profile:profiles!staff_id (
                id,
                full_name,
                email,
                role
            )
        `)
        .eq('run_id', id);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Query Successful! Number of items:", items.length);
        console.log("First item:", JSON.stringify(items[0], null, 2));
    }
}

run();
