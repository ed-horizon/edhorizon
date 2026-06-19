const { Client } = require('pg');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'aws-0-ap-south-1.pooler.supabase.com';
const port = 6543;
const user = 'postgres.bgaepltxhycmripzovan';
const database = 'postgres';
const password = 'edhorizon123';

async function run() {
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
        console.log("Connected successfully to pooler!");
        
        console.log("Querying check constraints on payments table...");
        const res = await client.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE conrelid = 'public.payments'::regclass;
        `);
        
        console.log("Constraints:");
        res.rows.forEach(row => {
            console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
        });

        await client.end();
    } catch (err) {
        console.error("Failed:", err.message);
        try { await client.end(); } catch(e) {}
    }
}

run();
