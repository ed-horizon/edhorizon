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

    console.log("Updating Vinitha's password to 'password123'...");
    const { data: userData, error: updateError } = await adminClient.auth.admin.updateUserById(
        'e20e42a1-7f8d-4f51-9040-9594811e57db',
        { password: 'password123' }
    );

    if (updateError) {
        console.error("Failed to update password:", updateError);
        return;
    }

    console.log("Password updated successfully!");

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

    console.log("Signing in as Vinitha...");
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'vinitha@edhorizon.com',
        password: 'password123'
    });

    if (signInError) {
        console.error("Sign in failed:", signInError);
        return;
    }

    console.log("Signed in successfully! User ID:", authData.user.id);

    console.log("Querying reschedule_requests as Vinitha...");
    const { data, error } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(full_name, email)
        `)
        .eq('teacher_id', authData.user.id);

    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Reschedule requests returned:", JSON.stringify(data, null, 2));
    }
}

run();
