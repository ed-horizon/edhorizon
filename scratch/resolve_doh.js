const https = require('https');

function resolveDoH(hostname, type = 'CNAME') {
    return new Promise((resolve, reject) => {
        const url = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=${type}`;
        const options = {
            headers: {
                'accept': 'application/dns-json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log("Resolving A of db.bgaepltxhycmripzovan.supabase.co...");
        const resCname = await resolveDoH('db.bgaepltxhycmripzovan.supabase.co', 'A');
        console.log("A:", JSON.stringify(resCname, null, 2));

        console.log("\nResolving A of aws-0-ap-south-1.pooler.supabase.com...");
        const resAaaa = await resolveDoH('aws-0-ap-south-1.pooler.supabase.com', 'A');
        console.log("A:", JSON.stringify(resAaaa, null, 2));
    } catch (err) {
        console.error("DoH Resolution failed:", err.message);
    }
}

run();
