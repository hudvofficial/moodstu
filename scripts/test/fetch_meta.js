const https = require('https');

https.get('https://stu.moodwedding.com/gallery/tiger-family', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const metas = data.match(/<meta[^>]*>/g) || [];
    console.log(metas.join('\n'));
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
