const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\ca98dd66-df5a-4cb5-9994-002d675d9120\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.includes('SUCCESS') || line.includes('Connected successfully') || line.includes('Migration applied successfully') || line.includes('FOUND region')) {
            try {
                const parsed = JSON.parse(line);
                console.log(`Line ${count}:`, parsed.output || parsed.content || parsed.tool_calls);
            } catch (e) {
                console.log(`Line ${count} (raw):`, line.substring(0, 500));
            }
        }
    }
}
run();
