const { Client } = require('pg');

const host = 'aws-0-ap-south-1.pooler.supabase.com';
const port = 6543;
const user = 'postgres.bgaepltxhycmripzovan';
const database = 'postgres';
const password = 'edhorizon123';

async function run() {
    console.log("Connecting to pooler...");
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
        console.log("SUCCESS connected to pooler!");
        const res = await client.query("SELECT 1 as val;");
        console.log("Query result:", res.rows);
        await client.end();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

run();
