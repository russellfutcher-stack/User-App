// A tiny static file server for the exported web app, used by the tests.
const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'dist'),port=+process.argv[3]||8090;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root))return r.end();if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(port);
