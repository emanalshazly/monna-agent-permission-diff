import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

test('Action retains the complete CLI report for configurations within the input limits',t=>{
 const folder=mkdtempSync(join(tmpdir(),'monna-report-capacity-'));
 t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const entries=Array.from({length:40000},(_,i)=>'FICTIONAL_'+i);
 const before=JSON.stringify({permissions:{deny:entries}}),after=JSON.stringify({permissions:{allow:entries}});
 for(const input of [before,after]){
  assert.ok(input.length<1000000);assert.ok(Buffer.byteLength(input)<2000000);
 }
 const a=join(folder,'before.json'),b=join(folder,'after.json'),output=join(folder,'output'),summary=join(folder,'summary');
 writeFileSync(a,before);writeFileSync(b,after);
 const cli=spawnSync(process.execPath,['cli.mjs',a,b,'--format','markdown','--fail-on','none'],
  {encoding:'utf8',maxBuffer:32000000,timeout:30000});
 assert.equal(cli.status,0,cli.stderr);assert.ok(Buffer.byteLength(cli.stdout)>8000000);
 assert.ok(!cli.stdout.includes('FICTIONAL_'));
 const action=spawnSync(process.execPath,[resolve('action-runner.mjs')],{encoding:'utf8',maxBuffer:32000000,timeout:40000,
  env:{...process.env,GITHUB_WORKSPACE:folder,RUNNER_TEMP:folder,MONNA_BEFORE:'before.json',MONNA_AFTER:'after.json',
   MONNA_FORMAT:'auto',MONNA_FAIL_ON:'none',GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary}});
 assert.equal(action.status,0,action.stderr);
 const reportPath=readFileSync(output,'utf8').trim().slice('report-path='.length);
 assert.equal(readFileSync(reportPath,'utf8'),cli.stdout);
 assert.ok(readFileSync(summary).length<=1024*1024);assert.match(readFileSync(summary,'utf8'),/report-path/);
 assert.equal(readFileSync(a,'utf8'),before);assert.equal(readFileSync(b,'utf8'),after);
 assert.equal(readdirSync(folder).some(name=>name.startsWith('.monna-report-')),false);
});

test('a full summary preserves existing content and the configured review exit',t=>{
 const folder=mkdtempSync(join(tmpdir(),'monna-summary-budget-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const prior='x'.repeat(1024*1024-64),summary=join(folder,'summary'),output=join(folder,'output');
 writeFileSync(summary,prior);writeFileSync(join(folder,'before.json'),'{"permissions":{}}');
 writeFileSync(join(folder,'after.json'),'{"permissions":{"allow":["FICTIONAL_RULE"]}}');
 const result=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,
  GITHUB_WORKSPACE:folder,RUNNER_TEMP:folder,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary,
  MONNA_BEFORE:'before.json',MONNA_AFTER:'after.json',MONNA_FORMAT:'auto',MONNA_FAIL_ON:'high'}});
 assert.equal(result.status,1,result.stderr);assert.equal(readFileSync(summary,'utf8'),prior);
 assert.match(result.stdout,/existing step summary has no room/);
 const path=readFileSync(output,'utf8').trim().slice('report-path='.length);
 const report=readFileSync(path,'utf8');assert.match(report,/ALLOW_ADDED/);assert.ok(!report.includes('FICTIONAL_RULE'));
});

test('an invalid CLI comparison removes staging and preserves the previous report',t=>{
 const folder=mkdtempSync(join(tmpdir(),'monna-staging-failure-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const previous=join(folder,'monna-permission-diff.md'),output=join(folder,'output');
 writeFileSync(previous,'previous complete report');writeFileSync(join(folder,'before.json'),'{"permissions":{}}');
 writeFileSync(join(folder,'after.json'),'not JSON');
 const result=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,
  GITHUB_WORKSPACE:folder,RUNNER_TEMP:folder,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:'',
  MONNA_BEFORE:'before.json',MONNA_AFTER:'after.json',MONNA_FORMAT:'auto',MONNA_FAIL_ON:'none'}});
 assert.equal(result.status,2);assert.equal(readFileSync(previous,'utf8'),'previous complete report');
 assert.equal(existsSync(output),false);assert.equal(readdirSync(folder).some(name=>name.startsWith('.monna-report-')),false);
});
