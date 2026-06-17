const fs = require('fs');
const globalDataPath = 'train-english-next/src/components/providers/GlobalDataProvider.tsx';
let globalDataContent = fs.readFileSync(globalDataPath, 'utf8');
globalDataContent = globalDataContent.replace(
  `export const emptyForm = {`,
  `export const emptyForm: FormData = {`
);
fs.writeFileSync(globalDataPath, globalDataContent, 'utf8');
