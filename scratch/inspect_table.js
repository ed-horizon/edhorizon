const { Client } = require('pg');
const dns = require('dns');

const hostNames = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'db.bgaepltxhycmripzovan.supabase.co'
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
            console.log(`Resolved ${host} to ${ip}. Trying to connect...`);
            
            // For pooler we use port 6543 and user 'postgres.bgaepltxhycmripzovan'.
            // For direct connection we use port 5432 and user 'postgres'.
            const isPooler = host.includes('pooler');
            const port = isPooler ? 6543 : 5432;
            const user = isPooler ? 'postgres.bgaepltxhycmripzovan' : 'postgres';
            
            const client = new Client({
                host: ip,
                port: port,
                user: user,
                password: password,
                database: 'postgres',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000
            });

            try {
                await client.connect();
                console.log(`SUCCESS connected to ${host} via ${ip}!`);
                
                // 1. Get check constraints
                const constraintsRes = await client.query(`
                    SELECT pg_get_constraintdef(oid) AS constraint_def, conname 
                    FROM pg_constraint 
                    WHERE conrelid = 'public.staff_details'::regclass;
                `);
                console.log("Check constraints on staff_details:");
                console.log(constraintsRes.rows);
                
                // 2. Get columns
                const columnsRes = await client.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'staff_details';
                `);
                console.log("Columns on staff_details:");
                console.log(columnsRes.rows.map(r => `${r.column_name} (${r.data_type})`));

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
                console.log("Completed successfully!");
                process.exit(0);
            }
        }
    }
    console.error("All configurations failed.");
    process.exit(1);
}

run();
