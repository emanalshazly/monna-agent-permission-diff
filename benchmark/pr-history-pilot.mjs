// Read-only retrospective on pinned public history. No upstream changes or code execution.
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {reviewPR,prMarkdown} from '../src/pr-review.mjs';
const cases=[
 {repository:'affaan-m/everything-claude-code',base:'d0e5caebd4fb0afe867cdc2e35c27f80f6aef6b4',head:'e85bc5fe8765dffb3609c311b3af93060685c00c'},
 {repository:'modelcontextprotocol/inspector',base:'dd46acba8710eaaa244fba9fe99e980aca5ed9ce',head:'961dc283fcd15fb0960546ae29cbdfa540437e1a'},
];
const output=join(process.cwd(),'docs','pr-pilot');mkdirSync(output,{recursive:true});
const records=[];
for(const c of cases){
 const cwd=mkdtempSync(join(tmpdir(),'monna-pr-history-'));
 const run=args=>{const r=spawnSync('git',args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:2000000});if(r.status!==0)throw Error('Public history fetch failed for '+c.repository);};
 run(['init','--bare']);run(['fetch','--depth=2','--no-tags','https://github.com/'+c.repository+'.git',c.head]);
 const started=performance.now();const result=reviewPR({cwd,...c,threshold:'medium'});const elapsed_ms=performance.now()-started;
 const name=c.repository.replace('/','--');writeFileSync(join(output,name+'.md'),prMarkdown(result));
 records.push({...c,commit_url:`https://github.com/${c.repository}/commit/${c.head}`,elapsed_ms,changedFileCount:result.changedFileCount,recognizedConfigFiles:result.files.length,findings:result.findings,verdict:result.verdict,files:result.files.map(f=>({path:f.path,status:f.status,coverage:f.report?.coverage.status,codes:f.report?.findings.map(x=>x.code)}))});
 console.log(JSON.stringify(records.at(-1)));
}
writeFileSync(join(output,'results.json'),JSON.stringify({scope:'Two selected public commits known to touch Claude settings; retrospective compatibility/actionability evidence, not an independently labeled security or time-saved study.',records},null,2)+'\n');
