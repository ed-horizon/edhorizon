const dns = require('dns');

const hosts = [
    'db.bgaepltxhycmripzovan.supabase.co',
    'db.bgaepltxhycmripzovan.supabase.com',
    'bgaepltxhycmripzovan.supabase.co',
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com'
];

hosts.forEach(host => {
    dns.lookup(host, (err, addr, family) => {
        if (err) {
            console.log(`Failed for ${host}:`, err.message);
        } else {
            console.log(`Success for ${host}: ${addr} (Family: ${family})`);
        }
    });
});
