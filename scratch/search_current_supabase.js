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

    let currentCmd = "";
    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'run_command') {
                        const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                        if (args.CommandLine && args.CommandLine.includes('supabase')) {
                            currentCmd = args.CommandLine;
                            console.log(`[Step ${step.step_index}] REQUESTED: ${currentCmd}`);
                        }
                    }
                }
            }
            if (step.type === 'RUN_COMMAND' && currentCmd) {
                console.log(`[Step ${step.step_index}] OUTPUT FOR: ${currentCmd}`);
                console.log(step.content || step.output);
                console.log("-----------------------------------------\n");
                currentCmd = "";
            }
        } catch (e) {}
    }
}
run();
