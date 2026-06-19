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

    // Get an item to test with
    const { data: items } = await supabase.from('payroll_items').select('id, payout_status').limit(1);
    if (!items || items.length === 0) {
        console.log("No payroll items found to test approval action");
        return;
    }
    const item = items[0];
    console.log("Testing on Item ID:", item.id, "Initial status:", item.payout_status);

    // Test setting to 'processing'
    console.log("Setting payout_status to 'processing' (Approve)...");
    const { data: dataApprove, error: errApprove } = await supabase
        .from('payroll_items')
        .update({ payout_status: 'processing' })
        .eq('id', item.id)
        .select();

    if (errApprove) {
        console.error("Approve error:", errApprove);
    } else {
        console.log("Approve successful! New status:", dataApprove[0].payout_status);
    }

    // Test setting back to 'pending'
    console.log("Setting payout_status to 'pending' (Revoke)...");
    const { data: dataRevoke, error: errRevoke } = await supabase
        .from('payroll_items')
        .update({ payout_status: 'pending' })
        .eq('id', item.id)
        .select();

    if (errRevoke) {
        console.error("Revoke error:", errRevoke);
    } else {
        console.log("Revoke successful! New status:", dataRevoke[0].payout_status);
    }
}

run();
