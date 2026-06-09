const fs = require('fs');
const jsonStr = fs.readFileSync('c:/Users/MSI/Desktop/LittleByLittle/old_vocab.txt', 'utf-8');
if (jsonStr.trim()) {
    const obj = JSON.parse(jsonStr);
    let code = '';
    // if the view_file tool output has it
    if (obj.output) {
        code = obj.output;
    } else if (obj.content) {
        code = obj.content;
    }
    // Extract actual lines if it has "Showing lines..."
    if (code.includes('The following code has been modified')) {
        const lines = code.split('\n');
        let finalCode = '';
        let start = false;
        for (let l of lines) {
            if (l.match(/^\d+:/)) {
                finalCode += l.replace(/^\d+:\s?/, '') + '\n';
            }
        }
        fs.writeFileSync('c:/Users/MSI/Desktop/LittleByLittle/server/src/routes/vocabulary.ts', finalCode.trim() + '\n');
        console.log('Recovered vocabulary.ts');
    }
}
