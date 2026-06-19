const { Client } = require('pg');
const dns = require('dns');

// Let dns resolve natively

const host = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';

const passwords = [
    'Sivavini@2024',
    'Sivavini@2025',
    'Sivavini@2026',
    'SivaVini@2024',
    'SivaVini@2025',
    'SivaVini@2026',
    'Sivavini@24',
    'SivaVini@24',
    'Sivavini@123',
    'SivaVini@123',
    'edhorizon',
    'edhorizon123',
    'EdHorizon123',
    'edhorizon2024',
    'edhorizon2025',
    'edhorizon2026',
    'postgres',
    'password123',
    'password'
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
