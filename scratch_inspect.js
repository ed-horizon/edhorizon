const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

    console.log("Fetching student_details and profiles...");
    const { data: students, error: err } = await supabase
        .from('profiles')
        .select(`
            id,
            email,
            full_name,
            student_details!student_details_id_fkey (
                *
            )
        `)
        .eq('role', 'student');

    if (err) {
        console.error("Error:", err);
        return;
    }

    students.forEach(s => {
        const det = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        console.log(`Student: ${s.full_name} (${s.email})`);
        console.log(`- ID: ${s.id}`);
        console.log(`- Tutor ID: ${det?.assigned_teacher_id}`);
        console.log(`- Preferred Link: ${det?.preferred_meeting_link}`);
        console.log(`- Preferred Time: ${det?.preferred_time}`);
        console.log("---------------------------------------");
    });
}

run();
