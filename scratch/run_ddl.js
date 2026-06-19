const { Client } = require('pg');

const hostName = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = 'Sivavini@2024';

async function run() {
    console.log(`Connecting to database at ${hostName}...`);
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
        
        console.log('Adding mobile_number column to student_details...');
        await client.query("ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS mobile_number TEXT;");
        
        console.log('Reloading PostgREST schema...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('DDL execution successful!');
    } catch (err) {
        console.error('Error running DDL:', err.message);
    } finally {
        await client.end();
    }
}

run();
