const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Types
content = content.replace(
    /skills: \{ reading: number; writing: number; pronunciation: number \}/g,
    'skills: { recall: number; listening: number; writing: number; pronunciation: number }'
);
content = content.replace(
    /skills: \{\n\s*reading: \{ points: number; nextReview: string \};\n\s*writing: \{ points: number; nextReview: string \};\n\s*pronunciation: \{ points: number; nextReview: string \};\n\s*\}/g,
    'skills: {\n    recall: { points: number; nextReview: string };\n    listening: { points: number; nextReview: string };\n    writing: { points: number; nextReview: string };\n    pronunciation: { points: number; nextReview: string };\n  }'
);

// 2. Headings and labels
content = content.replace(
    /Reading, Writing & Pronunciation/g,
    'Recall, Listening, Writing & Pronunciation'
);
content = content.replace(
    /📖 Reading/g,
    '🧠 Recall'
);
content = content.replace(
    /value="reading"/g,
    'value="recall"'
);
content = content.replace(
    /value="reading_desc"/g,
    'value="recall_desc"'
);
content = content.replace(
    /Reading ↓/g,
    'Recall ↓</option>\n                <option value="listening_desc">Listening ↓'
);

// 3. Mini-skill in RecentActivity
content = content.replace(
    /<div className="mini-skill" title=\{`Reading: \$\{act\.skills\.reading\}`\}>\n\s*<div className="mini-skill-bar">\n\s*<span className="mini-skill-fill" style=\{\{ width: `\$\{act\.skills\.reading\}%`, background: '#3B82F6' \}\} \/>\n\s*<\/div>\n\s*<span className="mini-skill-val">\{act\.skills\.reading\}<\/span>\n\s*<\/div>/g,
    '<div className="mini-skill" title={`Recall: ${act.skills.recall}`}>\n                              <div className="mini-skill-bar">\n                                <span className="mini-skill-fill" style={{ width: `${act.skills.recall}%`, background: \'#3B82F6\' }} />\n                              </div>\n                              <span className="mini-skill-val">{act.skills.recall}</span>\n                            </div>\n                            <div className="mini-skill" title={`Listening: ${act.skills.listening}`}>\n                              <div className="mini-skill-bar">\n                                <span className="mini-skill-fill" style={{ width: `${act.skills.listening}%`, background: \'#10B981\' }} />\n                              </div>\n                              <span className="mini-skill-val">{act.skills.listening}</span>\n                            </div>'
);

// 4. Map arrays
content = content.replace(
    /\(\['reading', 'writing', 'pronunciation'\] as const\)\.map/g,
    "(['recall', 'listening', 'writing', 'pronunciation'] as const).map"
);

// 5. Table Headers
content = content.replace(
    /<th className="col-skill">Reading<\/th>/g,
    '<th className="col-skill">Recall</th>\n                      <th className="col-skill">Listening</th>'
);

// 6. Table Cells (due)
// The map function uses `skill` variable, so no need to change the inner loop, but `dueItems` might have specific structure
content = content.replace(
    /label === 'reading' \? '📖 Reading' :/g,
    'label === \'recall\' ? \'🧠 Recall\' :\n                                  label === \'listening\' ? \'🎧 Listening\' :'
);

// 7. Radar Chart
content = content.replace(
    /reading: \{\n\s*label: 'Reading',\n\s*color: '#3b82f6',\n\s*avg: data\.skills\.reading\.avg,\n\s*mastered: data\.skills\.reading\.mastered,\n\s*familiar: data\.skills\.reading\.familiar,\n\s*learning: data\.skills\.reading\.learning\n\s*\}/g,
    'recall: {\n                    label: \'Recall\',\n                    color: \'#3b82f6\',\n                    avg: data.skills.recall.avg,\n                    mastered: data.skills.recall.mastered,\n                    familiar: data.skills.recall.familiar,\n                    learning: data.skills.recall.learning\n                  },\n                  listening: {\n                    label: \'Listening\',\n                    color: \'#10b981\',\n                    avg: data.skills.listening.avg,\n                    mastered: data.skills.listening.mastered,\n                    familiar: data.skills.listening.familiar,\n                    learning: data.skills.listening.learning\n                  }'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('done');
