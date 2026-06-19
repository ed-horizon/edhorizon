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

    const runId = '819676fb-68f0-4cf2-9cd3-8892ae6ef624'; // June 2026

    // 1. Delete existing items to start fresh
    console.log("Deleting existing items for June run...");
    const { error: deleteErr } = await supabase
        .from('payroll_items')
        .delete()
        .eq('run_id', runId);
        
    if (deleteErr) {
        console.error("Delete error:", deleteErr);
        return;
    }

    // 2. Fetch the payroll run details
    const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', runId)
        .single();

    if (runError || !run) {
        console.error("Run fetch error:", runError);
        return;
    }

    // 3. Fetch verified live classes for this run's month/year
    const startOfMonth = new Date(run.year, run.month - 1, 1).toISOString();
    const endOfMonth = new Date(run.year, run.month, 0, 23, 59, 59, 999).toISOString();

    const { data: verifiedClasses } = await supabase
        .from('live_classes')
        .select('teacher_id, duration_hours, student_id, student_attendance(status)')
        .eq('verification_status', 'verified')
        .gte('scheduled_at', startOfMonth)
        .lte('scheduled_at', endOfMonth);

    console.log(`Fetched ${verifiedClasses?.length || 0} verified classes for cycle ${run.month}/${run.year}`);

    // 4. Fetch custom tutor hourly rates from student details
    const { data: studentDetailsData } = await supabase
        .from('student_details')
        .select('id, tutor_hourly_rate');

    const studentRates = Object.fromEntries(
        (studentDetailsData || []).map((s) => [s.id, s.tutor_hourly_rate !== null ? Number(s.tutor_hourly_rate) : null])
    );

    // 5. Fetch all teacher profiles
    const { data: teachersData } = await supabase
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

    const teachers = (teachersData || []).map((t) => {
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || t.email.split('@')[0],
            email: t.email,
            hourly_rate: Number(details?.hourly_rate || 0),
            status: details?.status || 'active'
        };
    });

    // 6. Calculate accrued payouts dynamically from live_classes
    const calculatedPayouts = {};
    teachers.forEach(t => {
        calculatedPayouts[t.id] = 0;
    });

    verifiedClasses?.forEach((c) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        if (att?.status === 'absent') {
            return; // Skip student "No Show" classes
        }
        if (calculatedPayouts[c.teacher_id] !== undefined) {
            const teacher = teachers.find(t => t.id === c.teacher_id);
            const baseRate = teacher?.hourly_rate || 0;
            const customStudentRate = c.student_id ? studentRates[c.student_id] : null;
            const rate = (customStudentRate !== null && customStudentRate !== undefined && !isNaN(customStudentRate) && customStudentRate > 0)
                ? customStudentRate
                : baseRate;

            const hours = Number(c.duration_hours || 1.0);
            calculatedPayouts[c.teacher_id] += hours * rate;
        }
    });

    // 7. Synchronize DB payroll items: Insert missing
    const { data: existingItems } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('run_id', runId);

    const existingItemsMap = Object.fromEntries(
        (existingItems || []).map((item) => [item.staff_id, item])
    );

    const isRunFinalized = run.status === 'completed' || run.status === 'paid';
    if (!isRunFinalized) {
        for (const teacher of teachers) {
            const calculatedAmount = calculatedPayouts[teacher.id] || 0;
            const existing = existingItemsMap[teacher.id];

            if (!existing) {
                console.log(`Inserting missing item for: ${teacher.full_name} (${calculatedAmount})`);
                await supabase
                    .from('payroll_items')
                    .insert({
                        run_id: runId,
                        staff_id: teacher.id,
                        basic_amount: calculatedAmount,
                        payout_status: 'pending',
                        deductions_amount: 0,
                        deductions: 0,
                        bonus_amount: 0
                    });
            }
        }
    }

    // 8. Re-query
    const { data: finalItems, error: finalItemsErr } = await supabase
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
        .eq('run_id', runId);

    if (finalItemsErr) {
        console.error("Final query error:", finalItemsErr);
    } else {
        console.log(`Successfully synced and fetched ${finalItems.length} payroll items!`);
        console.log("Sample synced item:", finalItems[0]);
    }
}

run();
