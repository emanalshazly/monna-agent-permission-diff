import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('GitHub action emits report and step summary using shell-free arguments',()=>{
  const folder=mkdtempSync(join(tmpdir(),'monna-action-'));const summary=join(folder,'summary.md'),output=join(folder,'output');
  const r=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_WORKSPACE:process.cwd(),RUNNER_TEMP:folder,GITHUB_STEP_SUMMARY:summary,GITHUB_OUTPUT:output,MONNA_BEFORE:'examples/before.json',MONNA_AFTER:'examples/after.json',MONNA_FORMAT:'auto',MONNA_FAIL_ON:'none'}});
  assert.equal(r.status,0,r.stderr);assert.match(readFileSync(summary,'utf8'),/MODE_CHANGED/);assert.match(readFileSync(output,'utf8'),/report-path=/);assert.ok(existsSync(join(folder,'monna-permission-diff.md')));
});
test('action rejects outside-workspace paths and does not run shell syntax from input',()=>{
  const r=spawnSync(process.execPath,['action-runner.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_WORKSPACE:process.cwd(),MONNA_BEFORE:'../.env.local',MONNA_AFTER:'$(echo SECRET)'}});
  assert.equal(r.status,2);assert.ok(!r.stderr.includes('SECRET'));
});
