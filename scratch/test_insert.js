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

    const { data: runs } = await supabase.from('payroll_runs').select('id').limit(1);
    const runId = runs[0].id;
    const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'teacher').limit(1);
    const staffId = profiles[0].id;

    // Test with deductions_amount and bonus_amount
    const { data, error } = await supabase
        .from('payroll_items')
        .insert({
            run_id: runId,
            staff_id: staffId,
            basic_amount: 1000,
            bonus_amount: 200,
            deductions_amount: 100,
            deductions: 50,
            payout_status: 'pending'
        })
        .select();

    if (error) {
        console.error("Insert Error:", error);
    } else {
        console.log("Insert Successful! Data:", data);
        
        // Cleanup the test item
        await supabase.from('payroll_items').delete().eq('id', data[0].id);
    }
}

run();
