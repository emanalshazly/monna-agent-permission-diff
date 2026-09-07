import { spawnSync } from 'node:child_process';
import { appendFileSync,writeFileSync,realpathSync } from 'node:fs';
import { resolve,relative,isAbsolute,join } from 'node:path';
import { fileURLToPath } from 'node:url';
function input(value){if(!value)throw Error('Missing input');const workspace=realpathSync(process.env.GITHUB_WORKSPACE||process.cwd());const path=realpathSync(resolve(workspace,value));const rel=relative(workspace,path);if(rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel))throw Error('Input outside workspace');return path;}
try{
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('./cli.mjs',import.meta.url)),input(process.env.MONNA_BEFORE),input(process.env.MONNA_AFTER),'--type',process.env.MONNA_FORMAT||'auto','--format','markdown','--fail-on',process.env.MONNA_FAIL_ON||'high'],{encoding:'utf8',timeout:30000,maxBuffer:8000000});
  if(r.status!==0&&r.status!==1){console.error('Permission diff failed: invalid input or execution error.');process.exitCode=2;}
  else{
    const path=join(process.env.RUNNER_TEMP||process.cwd(),'monna-permission-diff.md');writeFileSync(path,r.stdout);
    if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,r.stdout);
    if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`report-path=${path}\n`);
    console.log(r.stdout);process.exitCode=r.status;
  }
}catch{console.error('Permission diff could not read the configured workspace files.');process.exitCode=2;}
