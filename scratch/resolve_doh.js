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
        console.log("Resolving CNAME of db.bgaepltxhycmripzovan.supabase.co...");
        const resCname = await resolveDoH('db.bgaepltxhycmripzovan.supabase.co', 'CNAME');
        console.log("CNAME:", JSON.stringify(resCname, null, 2));

        console.log("\nResolving AAAA of db.bgaepltxhycmripzovan.supabase.co...");
        const resAaaa = await resolveDoH('db.bgaepltxhycmripzovan.supabase.co', 'AAAA');
        console.log("AAAA:", JSON.stringify(resAaaa, null, 2));
    } catch (err) {
        console.error("DoH Resolution failed:", err.message);
    }
}

run();
