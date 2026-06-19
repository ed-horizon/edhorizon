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

    const students = [
        { name: 'Hiba', id: '3e89a559-9d06-4759-9966-d1bd6c4225c6' },
        { name: 'Mehul', id: 'e09039bc-f656-4ac2-9329-3478b90afe45' },
        { name: 'preethi', id: 'ae3ce9f0-1d24-499a-b2ea-dc71eaf07699' }
    ];

    for (const student of students) {
        console.log(`\n=== Student: ${student.name} (${student.id}) ===`);
        
        // 1. Fetch live classes to see the titles
        const { data: classes, error: classError } = await supabase
            .from('live_classes')
            .select('title, topic_taught')
            .eq('student_id', student.id);
            
        console.log("Live Classes:", classes || []);

        // 2. Fetch class schedules to see if subjects are specified
        const { data: schedules, error: schedError } = await supabase
            .from('class_schedules')
            .select('*')
            .eq('student_id', student.id);
            
        console.log("Class Schedules:", schedules || []);
    }
}

run();
