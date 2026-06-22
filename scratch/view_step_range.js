const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found");
        return;
    }
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.step_index === 9427) {
                console.log(`[Step ${step.step_index}] Source: ${step.source}, Type: ${step.type}`);
                if (step.content || step.output) {
                    console.log("Content:\n", step.content || step.output);
                }
                console.log("=========================================\n");
            }
        } catch (e) {}
    }
}
run();
