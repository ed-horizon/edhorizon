const { Client } = require('pg');
const hosts = ['65.0.195.55', '3.108.251.216'];
const passwords = ['Sivavini@2024', 'edhorizon123'];

async function tryConnect(host, password) {
    console.log(`Trying password on IPv4 pooler ${host}: ${password}`);
    const client = new Client({
        host,
        port: 6543,
        user: 'postgres.bgaepltxhycmripzovan',
        password,
        database: 'postgres',
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
        try { await client.end(); } catch(e) {}
        return false;
    }
}

async function run() {
    for (const host of hosts) {
        for (const pw of passwords) {
            const ok = await tryConnect(host, pw);
            if (ok) {
                console.log(`FOUND DATABASE PASSWORD: ${pw} on ${host}`);
                process.exit(0);
            }
        }
    }
    process.exit(1);
}
run();
