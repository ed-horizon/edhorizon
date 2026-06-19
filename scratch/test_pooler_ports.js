const { Client } = require('pg');

const host = 'aws-0-ap-south-1.pooler.supabase.com';
const user = 'postgres.bgaepltxhycmripzovan';
const database = 'postgres';
const password = 'edhorizon123';

async function tryPort(port) {
    console.log(`Connecting to pooler on port ${port}...`);
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
        console.log(`SUCCESS connected to pooler on port ${port}!`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed for port ${port}:`, err.message);
        try {
            await client.end();
        } catch (e) {}
        return false;
    }
}

async function run() {
    await tryPort(6543);
    await tryPort(5432);
}

run();
