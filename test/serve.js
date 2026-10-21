/* 本地预览:直接托管 public/(比 hexo server 轻) */
const { startServer } = require('./static-server');

const port = Number(process.env.PORT || 4140);
startServer(port).then(() => {
  console.log(`Serving public/ at http://127.0.0.1:${port}`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
