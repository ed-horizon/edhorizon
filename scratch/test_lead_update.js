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

    // Fetch one lead
    const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .limit(1)
        .single();

    if (fetchError) {
        console.error("Error fetching lead:", fetchError);
        return;
    }

    console.log("Found lead:", lead);

    // Try updating it with empty string for assigned_to and next_follow_up
    console.log("Attempting to update lead with empty strings...");
    const { error: updateError } = await supabase
        .from('leads')
        .update({
            assigned_to: "",
            next_follow_up: ""
        })
        .eq('id', lead.id);

    if (updateError) {
        console.error("Update failed as expected with error:", updateError);
    } else {
        console.log("Update succeeded!");
    }
}

run();
