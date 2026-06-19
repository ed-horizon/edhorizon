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

    const { data: items } = await supabase.from('payroll_items').select('id').limit(1);
    const item = items[0];
    console.log("Updating Item ID:", item.id);

    // Exact update payload from approvePayrollItem action
    const { data, error } = await supabase
        .from('payroll_items')
        .update({
            deductions: 0,
            deductions_amount: 0,
            deduction_reason: null,
            bonus_amount: 0,
            payout_status: 'processing'
        })
        .eq('id', item.id)
        .select();

    if (error) {
        console.error("Update Error:", error);
    } else {
        console.log("Update Successful! New data:", data);
        
        // Revert back
        await supabase
            .from('payroll_items')
            .update({
                payout_status: 'pending'
            })
            .eq('id', item.id);
        console.log("Reverted back to pending");
    }
}

run();
