const dns = require('dns');

const hosts = [
    'bgaepltxhycmripzovan.supabase.co',
    'db.bgaepltxhycmripzovan.supabase.co',
    'aws-0-ap-south-1.pooler.supabase.com'
];

async function checkHost(host) {
    console.log(`\nChecking host: ${host}`);
    try {
        const address = await new Promise((resolve, reject) => {
            dns.lookup(host, { family: 4 }, (err, addr, family) => {
                if (err) reject(err);
                else resolve(addr);
            });
        });
        console.log(`Resolved IPv4:`, address);
    } catch (err) {
        console.error(`Failed to resolve ${host}:`, err.message);
    }
}

async function run() {
    for (const host of hosts) {
        await checkHost(host);
    }
}

run();
