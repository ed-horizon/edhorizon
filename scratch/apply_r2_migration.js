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
const password = 'edhorizon123';

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

        // 1. Ensure submission_url and submission_notes exist in homework_assignments
        console.log('Ensuring submission_url and submission_notes columns exist in homework_assignments...');
        await client.query("ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS submission_url TEXT;");
        await client.query("ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS submission_notes TEXT;");

        // 2. Run migration SQL
        const sqlPath = path.join(__dirname, '../supabase/migrations/20260626000000_add_file_metadata.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running 20260626000000_add_file_metadata.sql migration...');
        await client.query(sql);

        // 3. Reload PostgREST schema
        console.log('Reloading PostgREST schema...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Migration and schema adjustments executed successfully!');
    } catch (err) {
        console.error('Error running migration:', err.message);
    } finally {
        await client.end();
    }
}

run();
