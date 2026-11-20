import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';
const files=new Set([
  'index.html','style.css','web.mjs','src/diff.mjs','src/json.mjs','src/report.mjs','src/task.mjs',
  'examples/task-before.json','examples/task-after.json','examples/task-policy.json'
]);
const contentTypes = {html:'text/html; charset=utf-8',css:'text/css',json:'application/json',mjs:'text/javascript'};
createServer(async(req,res)=>{const path=new URL(req.url,'http://127.0.0.1').pathname.slice(1)||'index.html';if(!files.has(path)){res.writeHead(404);res.end();return;}try{const body=await readFile(new URL(path,import.meta.url));res.setHeader('Content-Type',contentTypes[path.split('.').at(-1)]);res.setHeader('Cache-Control','no-store');res.end(body);}catch{res.writeHead(500);res.end();}}).listen(8432,'127.0.0.1',()=>console.log('Permission Diff preview: http://127.0.0.1:8432'));
