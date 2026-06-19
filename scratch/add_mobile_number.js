const { Client } = require('pg');
const dns = require('dns');

const hostName = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = 'edhorizon123';

dns.lookup(hostName, { family: 4 }, async (err, ipAddress) => {
    if (err) {
        console.error("Failed to resolve hostname to IPv4:", err);
        process.exit(1);
    }
    console.log(`Resolved ${hostName} to IPv4: ${ipAddress}`);

    const client = new Client({
        host: ipAddress,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase database.');
        console.log('Altering student_details table...');
        await client.query("ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS mobile_number TEXT;");
        console.log('Reloading PostgREST schema...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Alter table successful!');
    } catch (err) {
        console.error('Error running query:', err);
    } finally {
        await client.end();
    }
});
