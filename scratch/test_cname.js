const dns = require('dns');

dns.resolveCname('db.bgaepltxhycmripzovan.supabase.co', (err, addresses) => {
    if (err) {
        console.log("Failed to resolve CNAME:", err.message);
    } else {
        console.log("CNAME Addresses:", addresses);
    }
});

// Also check resolveMx, resolveNs, resolveTxt, etc.
dns.resolve('db.bgaepltxhycmripzovan.supabase.co', 'ANY', (err, records) => {
    if (err) {
        console.log("ANY check failed:", err.message);
    } else {
        console.log("ANY records:", records);
    }
});
