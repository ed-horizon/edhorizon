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

    // Get a run id: let's use the one for cycle 6 / FY 2026 (month 6, year 2026)
    const { data: runs } = await supabase.from('payroll_runs').select('*').eq('month', 6).eq('year', 2026);
    if (!runs || runs.length === 0) {
        console.log("No payroll run found for 6/2026");
        return;
    }
    const runObj = runs[0];
    const id = runObj.id;
    console.log("Found run:", runObj);

    // Fetch teachers
    const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            staff_details (
                hourly_rate,
                status
            )
        `)
        .eq('role', 'teacher');

    if (teachersError) {
        console.error("Teachers fetch error:", teachersError);
        return;
    }

    console.log("Fetched teachers:", teachersData.length);

    // Sync
    for (const teacher of teachersData) {
        const calculatedAmount = 1200; // Mock amount for test
        
        // Let's check if item exists
        const { data: existing } = await supabase
            .from('payroll_items')
            .select('*')
            .eq('run_id', id)
            .eq('staff_id', teacher.id)
            .maybeSingle();

        if (!existing) {
            console.log("Inserting new payroll item for teacher:", teacher.full_name);
            const { error: insertErr } = await supabase
                .from('payroll_items')
                .insert({
                    run_id: id,
                    staff_id: teacher.id,
                    basic_amount: calculatedAmount,
                    payout_status: 'pending',
                    deductions_amount: 0,
                    deductions: 0,
                    bonus_amount: 0
                });
            if (insertErr) {
                console.error("Insert error for teacher:", teacher.full_name, insertErr);
            }
        } else {
            console.log("Payroll item already exists for teacher:", teacher.full_name, existing);
        }
    }

    // Now query back with profile join
    const { data: items, error: queryError } = await supabase
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

    if (queryError) {
        console.error("Query error:", queryError);
    } else {
        console.log("Query success! Items:");
        console.log(JSON.stringify(items, null, 2));
    }
}

run();
