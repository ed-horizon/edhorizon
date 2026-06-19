const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.step_index >= 5883 && step.step_index <= 5938) {
                // If it's a RUN_COMMAND or it has a success/done message, log it
                if (step.type === 'RUN_COMMAND' || step.type === 'SYSTEM_MESSAGE' || step.type === 'USER_INPUT' || step.content.includes('success') || step.content.includes('SUCCESS') || step.content.includes('password')) {
                    console.log(`Step ${step.step_index}: Type: ${step.type}`);
                    if (step.content) {
                        console.log(`Content:\n${step.content.substring(0, 1000)}\n`);
                    }
                }
            }
        } catch (e) {}
    }
}

run();
