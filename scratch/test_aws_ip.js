async function run() {
    try {
        const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
        const data = await res.json();
        console.log("Fetched AWS IP ranges.");
        
        const targetPrefix = '2406:da1a';
        const matched = data.ipv6_prefixes.filter(item => item.ipv6_prefix.toLowerCase().startsWith(targetPrefix));
        
        console.log("Matched Prefixes:");
        console.log(JSON.stringify(matched, null, 2));
    } catch (err) {
        console.error("Failed:", err.message);
    }
}
run();
