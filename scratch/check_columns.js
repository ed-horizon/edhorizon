const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    console.log("Fetching PostgREST OpenAPI schema...");
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    const schema = await res.json();
    const homeworkDef = schema.definitions.homework_assignments;
    if (homeworkDef) {
        console.log("Columns of homework_assignments:");
        console.log(JSON.stringify(homeworkDef.properties, null, 2));
    } else {
        console.log("Could not find homework_assignments definition.");
    }
}

run();
