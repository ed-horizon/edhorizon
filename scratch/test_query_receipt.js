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
    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const paymentId = '3c940f29-7b19-4c72-8854-29288466d5ac';

    console.log("Running query with relation alias...");
    const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .select(`
            *,
            student:profiles!student_id(
                full_name, 
                email, 
                student_details:student_details!student_details_id_fkey(grade_level)
            )
        `)
        .eq('id', paymentId)
        .single();

    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Query success! Data:", JSON.stringify(payment, null, 2));
    }
}

run();
