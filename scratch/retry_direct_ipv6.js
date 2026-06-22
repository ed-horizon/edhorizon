const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');

function resolveDoH(hostname) {
    return new Promise((resolve, reject) => {
        const url = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=AAAA`;
        const options = {
            headers: { 'accept': 'application/dns-json' }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        resolve(json.Answer[0].data);
                    } else {
                        reject(new Error("No AAAA record found"));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

const hostName = 'db.bgaepltxhycmripzovan.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';
const password = 'Sivavini@2024';

async function run() {
    let ipv6 = '';
    try {
        console.log(`Resolving AAAA for ${hostName} via DoH...`);
        ipv6 = await resolveDoH(hostName);
        console.log(`Resolved to IPv6: ${ipv6}`);
    } catch (err) {
        console.error(`DNS Resolution failed: ${err.message}. Using fallback IPv6.`);
        ipv6 = '2406:da1a:b00:1302:1745:cf24:3843:e47f';
    }

    const maxRetries = 15;
    let connected = false;
    let client = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Connection attempt ${attempt}/${maxRetries} to [${ipv6}]:${port}...`);
        client = new Client({
            host: ipv6,
            port,
            user,
            password,
            database,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 8000
        });

        try {
            await client.connect();
            console.log('CONNECTED successfully to database!');
            connected = true;
            break;
        } catch (err) {
            console.log(`Attempt ${attempt} failed: ${err.message}`);
            try { await client.end(); } catch (e) {}
            // Wait 1s before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (!connected) {
        console.error("All connection attempts timed out or failed.");
        process.exit(1);
    }

    try {
        const sqlPath = path.join(__dirname, '../supabase/migrations/20260622130000_add_tutor_joined_late.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running DDL migration SQL...');
        await client.query(sql);
        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Error running SQL:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
