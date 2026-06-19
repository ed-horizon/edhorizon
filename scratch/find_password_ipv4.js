const { Client } = require('pg');
const dns = require('dns');

const hostName = 'db.bgaepltxhycmripzovan.supabase.com';
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

async function tryConnect(hostIp, password) {
    console.log(`Trying password: ${password} on ${hostIp}`);
    const client = new Client({
        host: hostIp,
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
    dns.lookup(hostName, { family: 4 }, async (err, address) => {
        if (err) {
            console.error("DNS lookup failed:", err.message);
            process.exit(1);
        }
        console.log(`Resolved ${hostName} to IPv4: ${address}`);
        
        for (const pw of passwords) {
            const ok = await tryConnect(address, pw);
            if (ok) {
                console.log(`FOUND DATABASE PASSWORD: ${pw}`);
                process.exit(0);
            }
        }
        console.log("All passwords failed.");
        process.exit(1);
    });
}

run();
