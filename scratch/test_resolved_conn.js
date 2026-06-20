const { Client } = require('pg');
const dns = require('dns');

const hostNames = [
    'db.bgaepltxhycmripzovan.supabase.co',
    'db.bgaepltxhycmripzovan.supabase.com'
];
const passwords = ['Sivavini@2024', 'edhorizon123'];

function lookupAndConnect(host, password) {
    return new Promise((resolve) => {
        console.log(`Resolving ${host}...`);
        dns.lookup(host, { family: 4 }, async (err, ip) => {
            if (err) {
                console.error(`Failed to resolve ${host}:`, err.message);
                resolve(false);
                return;
            }
            console.log(`Resolved ${host} to ${ip}. Trying to connect to port 5432...`);
            const client = new Client({
                host: ip,
                port: 5432,
                user: 'postgres',
                password,
                database: 'postgres',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000
            });

            try {
                await client.connect();
                console.log(`SUCCESS connected to ${host} via ${ip} with password!`);
                const res = await client.query("SELECT 1 as val;");
                console.log("Query success:", res.rows);
                await client.end();
                resolve(true);
            } catch (connErr) {
                console.error(`Failed connection to ${host} via ${ip}:`, connErr.message);
                try { await client.end(); } catch (e) {}
                resolve(false);
            }
        });
    });
}

async function run() {
    for (const host of hostNames) {
        for (const pwd of passwords) {
            const success = await lookupAndConnect(host, pwd);
            if (success) {
                console.log("We have a working config!");
                process.exit(0);
            }
        }
    }
    console.error("All resolved connection configurations failed.");
    process.exit(1);
}

run();
