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
            
            // Check for run_command tool calls
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'run_command' && call.args) {
                        const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                        if (args.CommandLine) {
                            console.log(`[Step ${step.step_index}] CMD: ${args.CommandLine}`);
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

run();
