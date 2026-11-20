import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
test('GitHub action emits report and step summary using shell-free arguments',()=>{
  const folder=mkdtempSync(join(tmpdir(),'monna-action-'));const summary=join(folder,'summary.md'),output=join(folder,'output');
  const r=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_WORKSPACE:process.cwd(),RUNNER_TEMP:folder,GITHUB_STEP_SUMMARY:summary,GITHUB_OUTPUT:output,MONNA_BEFORE:'examples/before.json',MONNA_AFTER:'examples/after.json',MONNA_FORMAT:'auto',MONNA_FAIL_ON:'none'}});
  assert.equal(r.status,0,r.stderr);assert.match(readFileSync(summary,'utf8'),/MODE_CHANGED/);assert.match(readFileSync(output,'utf8'),/report-path=/);assert.ok(existsSync(readFileSync(output,'utf8').trim().slice('report-path='.length)));
});
for(const side of ['before','after'])test(`action artifacts preserve the ${side} input and previous report`,t=>{
  const folder=mkdtempSync(join(tmpdir(),'monna-input-preservation-'));
  t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const before=side==='before'?'monna-permission-diff.md':'before.json';
  const after=side==='after'?'monna-permission-diff.md':'after.json';
  const inputs=['{"permissions":{}}','{"permissions":{"allow":["FICTIONAL_RULE"]}}'];
  writeFileSync(join(folder,before),inputs[0]);writeFileSync(join(folder,after),inputs[1]);
  function run(name){
    const output=join(folder,name+'.output');
    const result=spawnSync(process.execPath,[resolve('action-runner.mjs')],{encoding:'utf8',env:{...process.env,
      GITHUB_WORKSPACE:folder,RUNNER_TEMP:folder,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:'',
      MONNA_BEFORE:before,MONNA_AFTER:after,MONNA_FORMAT:'claude-settings',MONNA_FAIL_ON:'none'}});
    assert.equal(result.status,0,result.stderr);
    return readFileSync(output,'utf8').trim().slice('report-path='.length);
  }
  const first=run('first');
  assert.equal(readFileSync(join(folder,before),'utf8'),inputs[0]);
  assert.equal(readFileSync(join(folder,after),'utf8'),inputs[1]);
  const report=readFileSync(first,'utf8');assert.match(report,/ALLOW_ADDED/);assert.ok(!report.includes('FICTIONAL_RULE'));
  const second=run('second');assert.notEqual(second,first);assert.equal(readFileSync(first,'utf8'),report);
});
test('action rejects outside-workspace paths and does not run shell syntax from input',()=>{
  const r=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_WORKSPACE:process.cwd(),MONNA_BEFORE:'../.env.local',MONNA_AFTER:'$(echo SECRET)'}});
  assert.equal(r.status,2);assert.ok(!r.stderr.includes('SECRET'));
});
