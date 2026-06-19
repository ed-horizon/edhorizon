const { Client } = require('pg');

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 6543;
const user = 'postgres';
const database = 'postgres';
const password = 'edhorizon123';

async function run() {
    console.log(`Trying single password check on tenant pooler: ${password}`);
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
        console.log(`SUCCESS connected!`);
        const res = await client.query("SELECT 1 as val;");
        console.log("Query result:", res.rows);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error("Connection failed:", err.message);
        try {
            await client.end();
        } catch(e) {}
        process.exit(1);
    }
}

run();
