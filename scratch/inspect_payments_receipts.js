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

    console.log("Fetching all payments details...");
    const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Query failed:", error);
        return;
    }

    console.log(`Found ${payments.length} total payments.`);
    payments.forEach(p => {
        console.log(`ID: ${p.id} | Month: ${p.billing_month}/${p.billing_year} | Amount: ${p.amount} | Method: ${p.payment_method} | Status: ${p.status} | Receipt: ${p.receipt_number || "NONE"}`);
    });
}

run();
