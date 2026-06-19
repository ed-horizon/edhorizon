const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
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
            if (step.step_index >= 4200 && step.step_index <= 4800) {
                if (step.type === 'RUN_COMMAND' || step.type === 'SYSTEM_MESSAGE') {
                    console.log(`Line ${count} - Step ${step.step_index} - Type: ${step.type}`);
                    if (step.content) {
                        console.log(`Content:\n${step.content.substring(0, 1500)}\n`);
                    }
                }
            }
        } catch (e) {}
    }
}

run();
