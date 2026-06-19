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
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    console.log("Logging in as Vinitha...");
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'vinitha@edhorizon.com',
        password: 'password123'
    });

    if (signInError) {
        console.error("Sign in failed:", signInError.message);
        return;
    }

    const user = authData.user;
    console.log("Logged in! User ID:", user.id);

    console.log("Querying own profile...");
    const { data: ownProfile, error: ownError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (ownError) {
        console.error("Failed to query own profile:", ownError.message);
    } else {
        console.log("Own profile query success! Role:", ownProfile.role);
    }

    console.log("Querying another profile (anjana@edhorizon.com)...");
    const { data: otherProfile, error: otherError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'anjana@edhorizon.com')
        .single();

    if (otherError) {
        console.error("Failed to query other profile:", otherError.message);
    } else {
        console.log("Other profile query success! Role:", otherProfile.role);
    }
}

run();
