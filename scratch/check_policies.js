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

    const { data: policies, error } = await supabase
        .rpc('get_policies'); // If we have an RPC, otherwise query pg_policies using postgres

    // Since we don't have rpc by default, let's run a query on pg_policies using postgres protocol if we can.
    // Wait, let's write a node-postgres script.
}

// Let's use pg client directly since we have database connection details in fix_operations_policies.js
const { Client } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';

async function checkPolicies() {
    console.log("Reading password...");
    // Let's get database password from env or process
    // Wait, let's see if env has database password or if we can read it.
    // In .env.local, let's see if there is a password.
    const pgPassword = env.SUPABASE_DB_PASSWORD || env.DATABASE_PASSWORD; 
    console.log("Keys in env:", Object.keys(env));
    
    // Let's just find the password in .env.local if it's there
    let pass = pgPassword;
    if (!pass) {
        // Look through env properties
        for (const k of Object.keys(env)) {
            if (k.toLowerCase().includes('pass') || k.toLowerCase().includes('db_url') || k.toLowerCase().includes('connection_string')) {
                console.log("Found key:", k, env[k] ? "has value" : "empty");
                if (k.toLowerCase().includes('pass')) pass = env[k];
            }
        }
    }
    
    if (!pass) {
        console.log("No password found in env. Checking files...");
    }

    const client = new Client({
        host,
        port,
        user,
        password: pass || 'Password not found',
        database,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL!");
        const res = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'reschedule_requests';
        `);
        console.log("Policies on reschedule_requests:", JSON.stringify(res.rows, null, 2));
        await client.end();
    } catch (err) {
        console.error("Failed to connect or query:", err.message);
    }
}

checkPolicies();
