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

    // List of statuses to test
    const statuses = [
        'pending',
        'approved',
        'paid',
        'processing',
        'completed',
        'draft',
        'verified',
        'unapproved',
        'ready',
        'submitted',
        'review'
    ];

    for (const status of statuses) {
        const { data, error } = await supabase
            .from('payroll_items')
            .insert({
                run_id: runId,
                staff_id: staffId,
                basic_amount: 1000,
                bonus_amount: 0,
                deductions_amount: 0,
                payout_status: status
            })
            .select();

        if (error) {
            console.log(`Status '${status}': FAILED - ${error.message}`);
        } else {
            console.log(`Status '${status}': SUCCESS!`);
            // Cleanup
            await supabase.from('payroll_items').delete().eq('id', data[0].id);
        }
    }
}

run();
