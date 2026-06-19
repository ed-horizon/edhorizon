async function run() {
    try {
        const res = await fetch('https://bgaepltxhycmripzovan.supabase.co/auth/v1/health');
        console.log("Status:", res.status);
        console.log("Headers:");
        for (const [key, value] of res.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}
run();
