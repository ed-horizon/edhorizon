async function run() {
    const url = 'https://bgaepltxhycmripzovan.supabase.co/storage/v1/object/public/materials/9c0a3ff3-e6e5-4db8-8074-160d458a06ac_1782455059085_hw.jpg';
    console.log(`Checking URL: ${url}`);
    try {
        const res = await fetch(url, { method: 'GET' });
        console.log(`Status: ${res.status}`);
        const body = await res.text();
        console.log(`Response:`, body);
    } catch (err) {
        console.error(`Fetch failed:`, err.message);
    }
}

run();
