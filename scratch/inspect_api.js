const fs = require('fs');

// Parse env variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    console.log("Fetching OpenAPI spec from:", url);
    
    try {
        const res = await fetch(url);
        const spec = await res.json();
        
        console.log("Paths in OpenAPI spec:");
        const paths = Object.keys(spec.paths || {});
        const rpcPaths = paths.filter(p => p.startsWith('/rpc/'));
        
        console.log("RPC endpoints found:", rpcPaths);
        if (rpcPaths.length > 0) {
            rpcPaths.forEach(p => {
                console.log(`Endpoint ${p}:`, spec.paths[p]);
            });
        }
    } catch (err) {
        console.error("Error fetching spec:", err);
    }
}

run();
