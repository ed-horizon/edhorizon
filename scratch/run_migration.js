const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const hostName = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = 'Sivavini@2024';

async function run() {
    console.log(`Connecting to database at ${hostName}:${port}...`);
    const client = new Client({
        host: hostName,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase database.');
        const sqlPath = path.join(__dirname, '../supabase/migrations/20260622130000_add_tutor_joined_late.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running SQL migration...');
        await client.query(sql);
        console.log('Reloading PostgREST schema...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Error running migration:', err.message);
    } finally {
        await client.end();
    }
}

run();
