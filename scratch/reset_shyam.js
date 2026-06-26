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

    console.log("Searching for user with email shyam@gmail.com...");
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
        console.error("List users failed:", listError);
        return;
    }

    const shyam = users.find(u => u.email === 'shyam@gmail.com');
    if (!shyam) {
        console.error("User shyam@gmail.com not found!");
        return;
    }

    console.log(`Found Shyam! User ID: ${shyam.id}`);
    console.log("Updating password to 'password123'...");
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        shyam.id,
        { password: 'password123' }
    );

    if (updateError) {
        console.error("Failed to update password:", updateError);
    } else {
        console.log("Password updated successfully!");
    }
}

run();
