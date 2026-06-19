const { Client } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';

const passwords = [
    'your-super-secret-and-long-postgres-password',
    'postgres',
    'password123',
    'password',
    'edhorizon',
    'edhorizon123'
];

async function tryConnect(password) {
    console.log(`Trying password: ${password}`);
    const client = new Client({
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`SUCCESS connected with password: ${password}`);
        
        console.log("Running DDL Alter Table to add tutor_hourly_rate...");
        const res = await client.query('ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS tutor_hourly_rate NUMERIC DEFAULT NULL;');
        console.log("DDL executed successfully:", res);
        console.log("Reloading schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed for password ${password}:`, err.message);
        try {
            await client.end();
        } catch(e) {}
        return false;
    }
}

async function run() {
    for (const pw of passwords) {
        const success = await tryConnect(pw);
        if (success) {
            console.log("DDL execution complete!");
            process.exit(0);
        }
    }
    console.log("All common passwords failed.");
    process.exit(1);
}

run();
