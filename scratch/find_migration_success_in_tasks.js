const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\vinit\\.gemini\\antigravity-ide\\brain\\5ceabcfd-3ef0-4f8d-b54e-7ce7274b9ec6\\.system_generated\\tasks';

async function run() {
    if (!fs.existsSync(tasksDir)) {
        console.error("Tasks directory not found");
        return;
    }
    const files = fs.readdirSync(tasksDir);
    for (const file of files) {
        if (!file.endsWith('.log')) continue;
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('successful') || content.includes('SUCCESS') || content.includes('success')) {
            if (content.includes('migration') || content.includes('table') || content.includes('database') || content.includes('Database')) {
                console.log(`=== Found in ${file} ===`);
                console.log(content.substring(0, 500));
                console.log("-------------------------\n");
            }
        }
    }
}
run();
