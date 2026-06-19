const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = process.argv[2] || 'Sivavini@2024';

async function run() {
    console.log("Connecting to Supabase database...");
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
        console.log("Connected successfully!");
        
        const sqlPath = path.join(__dirname, '../supabase/migrations/20260612000000_payments_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log("Applying payments schema migration DDL...");
        await client.query(sql);
        
        console.log("Reloading schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("Migration applied successfully!");
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        try {
            await client.end();
        } catch(e) {}
        process.exit(1);
    }
}

run();
