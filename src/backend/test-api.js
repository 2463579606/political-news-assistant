// 测试前端 API 调用
const http = require('http');

async function testAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/news',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

testAPI().then(result => {
  console.log('API 测试成功!');
  console.log('返回数据:', result.data.length, '条');
  console.log('第一条:', result.data[0].title);
}).catch(err => {
  console.error('API 测试失败:', err.message);
});
