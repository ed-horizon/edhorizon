const { Client } = require('pg');

async function testPort(port, host) {
    console.log(`Testing connection to ${host} on port ${port}...`);
    const client = new Client({
        host,
        port,
        user: 'postgres',
        password: 'Sivavini@2024',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await client.connect();
        console.log(`SUCCESS! Connected on port ${port}.`);
        const res = await client.query("SELECT 1 as val;");
        console.log("Query result:", res.rows);
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed on port ${port}: ${err.message}`);
        try { await client.end(); } catch (e) {}
        return false;
    }
}

async function run() {
    const host = 'db.bgaepltxhycmripzovan.supabase.co';
    const success5432 = await testPort(5432, host);
    if (!success5432) {
        await testPort(6543, host);
    }
}

run();
