const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\ca98dd66-df5a-4cb5-9994-002d675d9120\\.system_generated\\logs\\transcript.jsonl';

async function run() {
    if (!fs.existsSync(logPath)) {
        console.error("Log file not found at:", logPath);
        return;
    }

    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentCmd = "";
    let count = 0;
    
    for await (const line of rl) {
        count++;
        try {
            const step = JSON.parse(line);
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'run_command') {
                        const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                        if (args.CommandLine && args.CommandLine.includes('payments')) {
                            currentCmd = args.CommandLine;
                            console.log(`[Line ${count} Step ${step.step_index}] REQUESTED: ${currentCmd}`);
                        }
                    }
                }
            }
            if (step.type === 'RUN_COMMAND' || step.source === 'SYSTEM') {
                if (currentCmd) {
                    const outputSnippet = step.content ? step.content.substring(0, 500) : (step.output ? step.output.substring(0, 500) : "");
                    console.log(`[Line ${count} Step ${step.step_index}] RESULT FOR: ${currentCmd}`);
                    console.log(`Output: ${outputSnippet.trim()}`);
                    console.log("-----------------------------------------");
                    currentCmd = ""; // reset
                }
            }
        } catch (e) {}
    }
}

run();
