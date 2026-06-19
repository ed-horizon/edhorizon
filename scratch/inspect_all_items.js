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

    const { data: items, error } = await supabase.from('payroll_items').select('*');
    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("All Payroll Items in DB:", items.map(i => ({
            id: i.id,
            run_id: i.run_id,
            staff_id: i.staff_id,
            payout_status: i.payout_status,
            basic_amount: i.basic_amount
        })));
    }
}

run();
