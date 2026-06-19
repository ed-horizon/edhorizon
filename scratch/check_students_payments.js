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

    console.log("Fetching student profiles...");
    const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role');
    
    if (studentError) {
        console.error("Failed to fetch students:", studentError);
        return;
    }

    console.log("Students/Profiles:");
    students.forEach(s => {
        console.log(`- ID: ${s.id} | Name: ${s.full_name} | Email: ${s.email} | Role: ${s.role}`);
    });

    console.log("\nFetching all payments...");
    const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('*');

    if (paymentError) {
        console.error("Failed to fetch payments:", paymentError);
        return;
    }

    payments.forEach(p => {
        const student = students.find(s => s.id === p.student_id);
        console.log(`Payment ID: ${p.id} | StudentID in payment: ${p.student_id} | Student Name: ${student ? student.full_name : "UNKNOWN"} | Amount: ${p.amount} | Status: ${p.status}`);
    });
}

run();
