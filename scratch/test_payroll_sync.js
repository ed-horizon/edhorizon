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

    // Get the June 2026 payroll run
    const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('month', 6)
        .eq('year', 2026)
        .single();

    if (runError) {
        console.error("Error fetching run:", runError.message);
        return;
    }
    console.log("Found payroll run:", run);

    // Fetch verified live classes
    const startOfMonth = new Date(run.year, run.month - 1, 1).toISOString();
    const endOfMonth = new Date(run.year, run.month, 0, 23, 59, 59, 999).toISOString();

    const { data: verifiedClasses, error: classError } = await supabase
        .from('live_classes')
        .select('teacher_id, duration_hours, student_id, student_attendance(status)')
        .eq('verification_status', 'verified')
        .gte('scheduled_at', startOfMonth)
        .lte('scheduled_at', endOfMonth);

    if (classError) {
        console.error("Error fetching classes:", classError.message);
    }
    console.log(`Found ${verifiedClasses?.length || 0} verified classes.`);

    // Fetch teachers
    const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            staff_details (
                id,
                hourly_rate,
                status
            )
        `)
        .eq('role', 'teacher');

    if (teachersError) {
        console.error("Error fetching teachers:", teachersError.message);
    }
    console.log(`Found ${teachersData?.length || 0} teacher profiles.`);

    const teachers = (teachersData || []).map((t) => {
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || t.email.split('@')[0],
            email: t.email,
            hourly_rate: Number(details?.hourly_rate || 0),
            status: details?.status || 'active',
            hasDetails: !!details
        };
    });

    for (const t of teachers) {
        console.log(`Teacher: ${t.full_name} (${t.id}) - Has staff_details: ${t.hasDetails}`);
    }

    // Try inserting a dummy item to see if it succeeds or violates foreign keys
    const { data: existingItems, error: itemsError } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_run_id', run.id);

    if (itemsError) {
        console.error("Error fetching items:", itemsError.message);
    }
    console.log(`Current items in database:`, existingItems);

    console.log("Simulating sync inserts...");
    for (const teacher of teachers) {
        const existing = existingItems?.find(i => i.staff_id === teacher.id);
        if (!existing) {
            console.log(`Inserting item for teacher: ${teacher.full_name}...`);
            const { data, error } = await supabase
                .from('payroll_items')
                .insert({
                    payroll_run_id: run.id,
                    staff_id: teacher.id,
                    amount: 0,
                    status: 'pending'
                })
                .select();

            if (error) {
                console.error(`INSERT FAILED for ${teacher.full_name}:`, error.message);
            } else {
                console.log(`INSERT SUCCESS for ${teacher.full_name}:`, data);
            }
        }
    }
}

run();
