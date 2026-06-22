const https = require('https');

function resolveDoH(hostname, type) {
    return new Promise((resolve) => {
        const url = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=${type}`;
        const options = {
            headers: { 'accept': 'application/dns-json' }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    resolve({ error: err.message });
                }
            });
        }).on('error', (err) => resolve({ error: err.message }));
    });
}

async function run() {
    const targets = [
        'db.bgaepltxhycmripzovan.supabase.co',
        'db.bgaepltxhycmripzovan.supabase.com',
        'bgaepltxhycmripzovan.supabase.co'
    ];
    const types = ['A', 'AAAA', 'CNAME'];
    for (const target of targets) {
        for (const type of types) {
            console.log(`Querying DoH for ${target} [${type}]...`);
            const res = await resolveDoH(target, type);
            if (res.Answer) {
                console.log(`Answer:`, JSON.stringify(res.Answer, null, 2));
            } else {
                console.log(`No Answer`);
            }
        }
        console.log("------------------------");
    }
}
run();
