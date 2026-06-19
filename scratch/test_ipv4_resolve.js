const dns = require('dns');

dns.lookup('db.bgaepltxhycmripzovan.supabase.co', { family: 4 }, (err, address) => {
    if (err) {
        console.error("Lookup failed:", err.message);
    } else {
        console.log("SUCCESS Resolved IPv4 Address:", address);
    }
});
