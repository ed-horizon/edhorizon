const { Client } = require('pg');

const regions = [
    'ap-south-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ca-central-1',
    'sa-east-1'
];
const port = 6543;
const user = 'postgres.bgaepltxhycmripzovan';
const database = 'postgres';
const password = process.argv[2] || 'edhorizon123';

async function tryRegion(region) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Trying region ${region}...`);
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
        console.log(`SUCCESS connected to pooler in region ${region}!`);
        const res = await client.query("SELECT 1 as val;");
        console.log("Query result:", res.rows);
        await client.end();
        return true;
    } catch (err) {
        console.log(`Failed for region ${region}: ${err.message}`);
        try {
            await client.end();
        } catch(e) {}
        return false;
    }
}

async function run() {
    for (const r of regions) {
        const ok = await tryRegion(r);
        if (ok) {
            console.log(`FOUND region: ${r}`);
            process.exit(0);
        }
    }
    console.log("All regions failed.");
    process.exit(1);
}

run();
