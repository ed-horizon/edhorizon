const { Client } = require('pg');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = process.argv[2];

if (!password) {
    console.error("Error: Please provide the database password as a command line argument.");
    console.error("Usage: node scratch/add_class_verification_columns.js <YOUR_DATABASE_PASSWORD>");
    process.exit(1);
}

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
        
        console.log("Running DDL Alter Table to add class verification & join logs columns...");
        const res = await client.query(`
            ALTER TABLE public.live_classes 
            ADD COLUMN IF NOT EXISTS tutor_joined_at TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS student_joined_at TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS parent_verified BOOLEAN DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS parent_dispute_reason TEXT DEFAULT NULL;
        `);
        console.log("DDL executed successfully:", res);
        console.log("Reloading schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        await client.end();
        console.log("Migration finished successfully!");
    } catch (err) {
        console.error("Connection/Query failed:", err.message);
        process.exit(1);
    }
}

run();
