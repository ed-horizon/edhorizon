const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\ca98dd66-df5a-4cb5-9994-002d675d9120\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found at:", logPath);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        count++;
        try {
            const step = JSON.parse(line);
            if (step.type === 'RUN_COMMAND' && step.content && step.content.includes('run_payments_migration')) {
                console.log(`Step ${step.step_index}: run_payments_migration output ->`);
                console.log(step.content);
                console.log("-----------------------------------------");
            }
            if (step.content && step.content.includes('SUCCESS') && step.content.includes('password')) {
                console.log(`Step ${step.step_index}: SUCCESS statement ->`);
                console.log(step.content);
                console.log("-----------------------------------------");
            }
        } catch (e) {}
    }
}

run();
