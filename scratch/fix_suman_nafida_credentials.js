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
    const adminClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sumanId = '4d4f175c-7b43-4981-9467-89936fb0e27c';
    const sumanEmail = 'suman12@gmail.com';
    const nafidaId = 'e424a371-5614-4ca1-8b4f-e2c540ceab03';
    const nafidaEmail = 'nafida@gmail.com';

    console.log("Updating Suman's Auth account and setting password...");
    const { error: sAuthErr } = await adminClient.auth.admin.updateUserById(
        sumanId,
        {
            email: sumanEmail,
            password: 'password123',
            email_confirm: true
        }
    );
    if (sAuthErr) console.error("Failed Suman Auth update:", sAuthErr.message);
    else console.log("Suman Auth update success!");

    console.log("Updating Suman's Profile email...");
    const { error: sProfErr } = await adminClient
        .from('profiles')
        .update({ email: sumanEmail })
        .eq('id', sumanId);
    if (sProfErr) console.error("Failed Suman profile update:", sProfErr.message);
    else console.log("Suman Profile update success!");

    console.log("Updating Nafida's Auth account and setting password...");
    const { error: nAuthErr } = await adminClient.auth.admin.updateUserById(
        nafidaId,
        {
            email: nafidaEmail,
            password: 'password123',
            email_confirm: true
        }
    );
    if (nAuthErr) console.error("Failed Nafida Auth update:", nAuthErr.message);
    else console.log("Nafida Auth update success!");

    console.log("Updating Nafida's Profile email...");
    const { error: nProfErr } = await adminClient
        .from('profiles')
        .update({ email: nafidaEmail })
        .eq('id', nafidaId);
    if (nProfErr) console.error("Failed Nafida profile update:", nProfErr.message);
    else console.log("Nafida Profile update success!");

    console.log("\nVerifying Logins...");
    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    console.log("Logging in as Suman...");
    const { data: sData, error: sLoginErr } = await supabase.auth.signInWithPassword({
        email: sumanEmail,
        password: 'password123'
    });
    if (sLoginErr) console.error("Suman login failed:", sLoginErr.message);
    else console.log(`Suman login SUCCESS! Email: ${sData.user.email}`);

    console.log("Logging in as Nafida...");
    const { data: nData, error: nLoginErr } = await supabase.auth.signInWithPassword({
        email: nafidaEmail,
        password: 'password123'
    });
    if (nLoginErr) console.error("Nafida login failed:", nLoginErr.message);
    else console.log(`Nafida login SUCCESS! Email: ${nData.user.email}`);
}

run();
