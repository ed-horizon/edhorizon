const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

const hostName = 'db.bgaepltxhycmripzovan.supabase.com';
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
        console.log('Connected to Supabase database via resolved IPv4.');
        const sqlPath = path.join(__dirname, '../supabase/migrations/20260615143000_staff_shifts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running SQL migration...');
        await client.query(sql);
        console.log('Reloading PostgREST schema...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await client.end();
    }
});
