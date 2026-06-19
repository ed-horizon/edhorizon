const { Client } = require('pg');

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 6543;
const user = 'postgres';
const database = 'postgres';
const passwords = [
    'Sivavini@2024',
    'Sivavini@2025',
    'Sivavini@2026',
    'SivaVini@2024',
    'SivaVini@2025',
    'SivaVini@2026',
    'edhorizon123',
    'EdHorizon123',
    'postgres'
];

async function tryConnect(password) {
    console.log(`Trying password on tenant pooler: ${password}`);
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
        console.log(`SUCCESS connected! Password: ${password}`);
        const res = await client.query("SELECT 1 as val;");
        console.log("Query result:", res.rows);
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed: ${err.message}`);
        try {
            await client.end();
        } catch(e) {}
        return false;
    }
}

async function run() {
    for (const pw of passwords) {
        const ok = await tryConnect(pw);
        if (ok) {
            console.log(`FOUND DATABASE PASSWORD: ${pw}`);
            process.exit(0);
        }
    }
    console.log("All passwords failed.");
    process.exit(1);
}

run();
