const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove surrounding quotes if any
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            env[key] = value.trim();
        }
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration.");
    process.exit(1);
}

async function run() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== profiles and student_details ===");
    const { data: students, error: sErr } = await supabase
        .from('profiles')
        .select(`
            id,
            email,
            full_name,
            student_details!student_details_id_fkey (
                assigned_teacher_id,
                preferred_time,
                preferred_meeting_link
            )
        `)
        .eq('role', 'student');

    if (sErr) {
        console.error("Error fetching students:", sErr);
    } else {
        students.forEach(s => {
            const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
            console.log(`Student: ${s.full_name} (${s.email}) [ID: ${s.id}]`);
            console.log(`  Assigned Teacher: ${details?.assigned_teacher_id}`);
            console.log(`  Preferred Time: ${details?.preferred_time}`);
            console.log(`  Preferred Meeting Link: ${details?.preferred_meeting_link}`);
        });
    }

    console.log("\n=== class_schedules ===");
    const { data: schedules, error: schErr } = await supabase
        .from('class_schedules')
        .select('*');

    if (schErr) {
        console.error("Error fetching schedules:", schErr);
    } else {
        schedules.forEach(sc => {
            console.log(`Schedule: ${sc.title} [ID: ${sc.id}]`);
            console.log(`  Student ID: ${sc.student_id}`);
            console.log(`  Teacher ID: ${sc.teacher_id}`);
            console.log(`  Time of Day: ${sc.time_of_day}`);
            console.log(`  Pattern Days: ${sc.pattern_days}`);
            console.log(`  Status: ${sc.status}`);
        });
    }
}

run();
