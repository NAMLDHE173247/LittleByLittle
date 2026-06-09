const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/progress/review',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', (e) => console.error(e));

// We need a valid wordId to test, so let's fetch one first
http.get('http://localhost:5000/api/vocabulary', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const vocab = JSON.parse(data).data[0];
    req.write(JSON.stringify({ wordId: vocab._id, skill: 'recall', correct: true }));
    req.end();
  });
});
