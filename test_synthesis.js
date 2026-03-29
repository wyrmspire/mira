const http = require('http');

http.get('http://localhost:3000/api/experiences', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const experiences = JSON.parse(data);
      const decLine = experiences[0];
      if (decLine) {
        console.log("Found instance:", decLine.id);
        const postData = JSON.stringify({
          userId: decLine.user_id,
          sourceType: 'persistent',
          sourceId: decLine.id
        });
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/synthesis',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res2) => {
          let resData = '';
          res2.on('data', (c) => resData += c);
          res2.on('end', () => console.log('POST Response:', res2.statusCode, resData));
        });
        req.on('error', (e) => console.error(e));
        req.write(postData);
        req.end();
      }
    } catch (e) {
      console.error(e.message);
    }
  });
});
