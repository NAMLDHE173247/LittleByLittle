const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'src', 'routes', 'progress.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. applyDecayBatch
content = content.replace(
    /"skills\.reading\.points": result\.skills\.reading\.points,/g,
    '"skills.recall.points": result.skills.recall.points,'
);
content = content.replace(
    /"skills\.reading\.nextReview": result\.skills\.reading\.nextReview,/g,
    '"skills.recall.nextReview": result.skills.recall.nextReview,'
);
content = content.replace(
    /"skills\.writing\.points": result\.skills\.writing\.points,/g,
    '"skills.listening.points": result.skills.listening.points,\n              "skills.listening.nextReview": result.skills.listening.nextReview,\n              "skills.writing.points": result.skills.writing.points,'
);

// 2. /stats
content = content.replace(
    /const skills = \["reading", "writing", "pronunciation"\] as const;/g,
    'const skills = ["recall", "listening", "writing", "pronunciation"] as const;'
);
content = content.replace(
    /const overallMax = totalWords \* 100 \* 3;/g,
    'const overallMax = totalWords * 100 * 4;'
);
content = content.replace(
    /const readingOverdue = p\.skills\.reading\.nextReview <= now && p\.skills\.reading\.points > 0;/g,
    'const recallOverdue = p.skills.recall?.nextReview <= now && p.skills.recall?.points > 0;\n      const listeningOverdue = p.skills.listening?.nextReview <= now && p.skills.listening?.points > 0;'
);
content = content.replace(
    /readingOverdue \|\| writingOverdue \|\| pronOverdue/g,
    'recallOverdue || listeningOverdue || writingOverdue || pronOverdue'
);
content = content.replace(
    /reading: p\.skills\.reading\.points,/g,
    'recall: p.skills.recall?.points || 0,\n          listening: p.skills.listening?.points || 0,'
);

// 3. /due
content = content.replace(
    /const skill = \(req\.query\.skill as string\) \|\| "reading";/g,
    'const skill = (req.query.skill as string) || "recall";'
);
content = content.replace(
    /const validSkills = \["reading", "writing", "pronunciation"\];/g,
    'const validSkills = ["recall", "listening", "writing", "pronunciation"];'
);

// 4. /practice-words
content = content.replace(
    /const reading = progress\?\.skills\?\.reading\?\.points \?\? 0;/g,
    'const recall = progress?.skills?.recall?.points ?? 0;\n      const listening = progress?.skills?.listening?.points ?? 0;'
);
content = content.replace(
    /const overall = Math\.round\(\(reading \+ writing \+ pronunciation\) \/ 3\);/g,
    'const overall = Math.round((recall + listening + writing + pronunciation) / 4);'
);
content = content.replace(
    /reading: w\.reading,/g,
    'recall: w.recall,\n        listening: w.listening,'
);

// 5. /review & /adjust & /seed-demo
content = content.replace(
    /reading: \{ points: 0, nextReview: new Date\(\) \},/g,
    'recall: { points: 0, nextReview: new Date() },\n          listening: { points: 0, nextReview: new Date() },'
);

// 6. /seed-demo
content = content.replace(
    /let readingPts: number, writingPts: number, pronPts: number;/g,
    'let recallPts: number, listeningPts: number, writingPts: number, pronPts: number;'
);
content = content.replace(
    /readingPts = 75 \+ Math\.floor\(Math\.random\(\) \* 25\);/g,
    'recallPts = 75 + Math.floor(Math.random() * 25);\n        listeningPts = 70 + Math.floor(Math.random() * 25);'
);
content = content.replace(
    /readingPts = 40 \+ Math\.floor\(Math\.random\(\) \* 40\);/g,
    'recallPts = 40 + Math.floor(Math.random() * 40);\n        listeningPts = 40 + Math.floor(Math.random() * 40);'
);
content = content.replace(
    /readingPts = 10 \+ Math\.floor\(Math\.random\(\) \* 30\);/g,
    'recallPts = 10 + Math.floor(Math.random() * 30);\n        listeningPts = 10 + Math.floor(Math.random() * 30);'
);
content = content.replace(
    /readingPts = Math\.floor\(Math\.random\(\) \* 10\);/g,
    'recallPts = Math.floor(Math.random() * 10);\n        listeningPts = Math.floor(Math.random() * 10);'
);
content = content.replace(
    /reading: \{ points: readingPts, nextReview: makeReviewDate\(\) \},/g,
    'recall: { points: recallPts, nextReview: makeReviewDate() },\n          listening: { points: listeningPts, nextReview: makeReviewDate() },'
);

// 7. /words
content = content.replace(
    /const isDecaying = progress\n        \? \(progress\.skills\.reading\.nextReview <= now && reading > 0\) \|\|/g,
    'const isDecaying = progress\n        ? (progress.skills.recall?.nextReview <= now && recall > 0) ||\n          (progress.skills.listening?.nextReview <= now && listening > 0) ||'
);
content = content.replace(
    /skills: \{ reading, writing, pronunciation \},/g,
    'skills: { recall, listening, writing, pronunciation },'
);
content = content.replace(
    /skill === "reading" \? reading :/g,
    'skill === "recall" ? recall :\n          skill === "listening" ? listening :'
);
content = content.replace(
    /reading_desc: \(a, b\) => b\.skills\.reading - a\.skills\.reading,/g,
    'recall_desc: (a, b) => b.skills.recall - a.skills.recall,\n      listening_desc: (a, b) => b.skills.listening - a.skills.listening,'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('done');
