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

    const testEmail = `test_tutor_${Date.now()}@edhorizon.com`;
    const testPassword = 'password123';
    const testFullName = 'Test Tutor New';
    const testRole = 'teacher';

    console.log(`Creating test tutor user with email: ${testEmail}...`);
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
            full_name: testFullName,
            role: testRole
        }
    });

    if (authError) {
        console.error("Auth creation failed:", authError.message);
        return;
    }

    const newUserId = authUser.user.id;
    console.log(`User created successfully! ID: ${newUserId}`);

    console.log("Upserting staff details...");
    const { error: detailsError } = await adminClient
        .from("staff_details")
        .upsert({
            id: newUserId,
            employee_id: `EMP-${Date.now()}`,
            status: 'active',
            joining_date: new Date().toISOString().split('T')[0]
        });

    if (detailsError) {
        console.error("Upserting staff details failed:", detailsError.message);
        return;
    }
    console.log("Staff details upserted successfully!");

    console.log("Testing user sign-in with password...");
    const clientSupabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    const { data: signInData, error: signInError } = await clientSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (signInError) {
        console.error("Sign in failed:", signInError.message);
    } else {
        console.log(`SUCCESS! Logged in as: ${signInData.user.email} (ID: ${signInData.user.id})`);
    }

    console.log("Cleaning up test user...");
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(newUserId);
    if (deleteError) {
        console.error("Cleanup failed:", deleteError.message);
    } else {
        console.log("Test user cleaned up successfully.");
    }
}

run();
