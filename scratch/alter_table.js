const { Client } = require('pg');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const configs = [
    {
        name: 'Pooler with Sivavini@2024',
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.bgaepltxhycmripzovan',
        password: 'Sivavini@2024',
        database: 'postgres'
    },
    {
        name: 'Pooler with edhorizon123',
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.bgaepltxhycmripzovan',
        password: 'edhorizon123',
        database: 'postgres'
    },
    {
        name: 'Direct with Sivavini@2024',
        host: 'db.bgaepltxhycmripzovan.supabase.co',
        port: 5432,
        user: 'postgres',
        password: 'Sivavini@2024',
        database: 'postgres'
    },
    {
        name: 'Direct with edhorizon123',
        host: 'db.bgaepltxhycmripzovan.supabase.co',
        port: 5432,
        user: 'postgres',
        password: 'edhorizon123',
        database: 'postgres'
    }
];

async function tryConfig(cfg) {
    console.log(`Trying connection: ${cfg.name}...`);
    const client = new Client({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await client.connect();
        console.log(`SUCCESS connected with: ${cfg.name}`);
        
        console.log("Altering live_classes table to add is_compensation column...");
        await client.query(`
            ALTER TABLE public.live_classes 
            ADD COLUMN IF NOT EXISTS is_compensation BOOLEAN DEFAULT FALSE;
        `);
        
        console.log("Reloading schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("Successfully altered table and reloaded schema!");
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed config ${cfg.name}:`, err.message);
        try { await client.end(); } catch (e) {}
        return false;
    }
}

async function run() {
    for (const cfg of configs) {
        const success = await tryConfig(cfg);
        if (success) {
            console.log("All done!");
            process.exit(0);
        }
    }
    console.error("All connection configurations failed.");
    process.exit(1);
}

run();
