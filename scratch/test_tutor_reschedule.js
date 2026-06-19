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

    console.log("Generating link/impersonation for Vinitha...");
    // Let's get Vinitha's email: vinitha@edhorizon.com
    // We can use admin.generateLink or auth.admin.getUserById
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById('e20e42a1-7f8d-4f51-9040-9594811e57db');
    if (userError) {
        console.error("Error fetching user:", userError);
        return;
    }

    console.log("Fetched Vinitha's user object. Creating client as Vinitha...");
    
    // We can sign in Vinitha using adminClient.auth.admin.createSession or just sign in with email/password if we don't have password.
    // Wait, createSession is supported in service role client!
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.createSession({
        userId: 'e20e42a1-7f8d-4f51-9040-9594811e57db'
    });

    if (sessionError) {
        console.error("Error creating session:", sessionError);
        return;
    }

    const vinithaClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    // Set the session on vinithaClient
    await vinithaClient.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token
    });

    console.log("Querying reschedule_requests as Vinitha...");
    const { data, error } = await vinithaClient
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(full_name, email)
        `)
        .eq('teacher_id', 'e20e42a1-7f8d-4f51-9040-9594811e57db');

    if (error) {
        console.error("Error fetching reschedule_requests as Vinitha:", error);
    } else {
        console.log("Reschedule requests returned for Vinitha:", data);
    }
}

run();
