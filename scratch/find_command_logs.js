const fs = require('fs');
const readline = require('readline');

async function searchLog(logPath) {
    if (!fs.existsSync(logPath)) {
        console.log(`Log file not found: ${logPath}`);
        return;
    }
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        count++;
        if (line.includes('migration') || line.includes('Migration') || line.includes('pg') || line.includes('Client')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.output && (parsed.output.includes('successfully') || parsed.output.includes('Success') || parsed.output.includes('SUCCESS'))) {
                    console.log(`Log: ${logPath} Line ${count} Output:`, parsed.output);
                }
                if (parsed.CommandLine) {
                    console.log(`Log: ${logPath} Line ${count} CMD:`, parsed.CommandLine);
                }
            } catch (e) {}
        }
    }
}

async function run() {
    await searchLog('C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\ca98dd66-df5a-4cb5-9994-002d675d9120\\.system_generated\\logs\\transcript.jsonl');
    await searchLog('C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl');
}
run();
