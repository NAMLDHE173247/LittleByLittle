const fs = require('fs');
const path = 'C:/Users/MSI/.gemini/antigravity-ide/brain/35c262bf-82e0-440a-878a-8b414956a2d7/.system_generated/logs/transcript.jsonl';

const lines = fs.readFileSync(path, 'utf-8').split('\n');
let diffBlock = '';
let inDiff = false;
let foundDeletedLines = [];

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    // the diff block is in the output of the tool response
    // or maybe it's in a SYSTEM_MESSAGE or tool response
    const str = JSON.stringify(obj);
    if (str.includes('[diff_block_start]') && str.includes('@@ -902,1341 +902,964 @@')) {
      // found the exact tool response!
      console.log('Found the massive diff block!');
      // extract the text
      const text = obj.output || obj.content || str;
      
      // let's use regex or split to get the diff block
      const diffStart = text.indexOf('[diff_block_start]');
      const diffEnd = text.indexOf('[diff_block_end]');
      if (diffStart !== -1 && diffEnd !== -1) {
        diffBlock = text.substring(diffStart, diffEnd);
      } else {
        // look deeply inside properties
        if (obj.tool_calls) {
          // not in tool_calls
        }
      }
    }
  } catch (e) {
    // ignore parse errors if any
  }
}

console.log("Diff length: " + diffBlock.length);
if (diffBlock.length > 0) {
    fs.writeFileSync('c:/Users/MSI/Desktop/LittleByLittle/diff_block.txt', diffBlock);
}
