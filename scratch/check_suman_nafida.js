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

    console.log("Listing auth users...");
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
        console.error("Failed to list users:", error.message);
        return;
    }

    const filtered = users.filter(u => u.email && (u.email.toLowerCase().includes('suman') || u.email.toLowerCase().includes('nafida')));
    console.log("\nFound matching auth users:");
    filtered.forEach(u => {
        console.log(`- Email: ${u.email} | ID: ${u.id} | Metadata:`, JSON.stringify(u.user_metadata));
    });

    console.log("\nChecking profiles table for matching names/emails...");
    const { data: profiles, error: pError } = await adminClient
        .from('profiles')
        .select('*');

    if (pError) {
        console.error("Failed to query profiles:", pError.message);
        return;
    }

    const matchedProfiles = profiles.filter(p => p.email && (p.email.toLowerCase().includes('suman') || p.email.toLowerCase().includes('nafida') || (p.full_name && (p.full_name.toLowerCase().includes('suman') || p.full_name.toLowerCase().includes('nafida')))));
    console.log("Found matching profile records:");
    matchedProfiles.forEach(p => {
        console.log(`- Email: ${p.email} | Name: ${p.full_name} | ID: ${p.id} | Role: ${p.role}`);
    });
}

run();
