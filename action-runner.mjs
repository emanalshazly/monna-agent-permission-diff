import { spawnSync } from 'node:child_process';
import { appendFileSync,realpathSync,mkdtempSync,openSync,closeSync,renameSync,readFileSync,statSync,rmSync } from 'node:fs';
import { resolve,relative,isAbsolute,join } from 'node:path';
import { fileURLToPath } from 'node:url';
function input(value){if(!value)throw Error('Missing input');const workspace=realpathSync(process.env.GITHUB_WORKSPACE||process.cwd());const path=realpathSync(resolve(workspace,value));const rel=relative(workspace,path);if(rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel))throw Error('Input outside workspace');return path;}
const SUMMARY_LIMIT=1024*1024;
const REPORT_NOTICE='Full redacted report produced. Use this step\'s report-path output to collect it; the complete report does not fit in the remaining job summary space.\n';
let staging;
try{
  const args=[fileURLToPath(new URL('./cli.mjs',import.meta.url)),input(process.env.MONNA_BEFORE),input(process.env.MONNA_AFTER),'--type',process.env.MONNA_FORMAT||'auto','--format','markdown','--fail-on',process.env.MONNA_FAIL_ON||'high'];
  staging=mkdtempSync(join(process.env.RUNNER_TEMP||process.cwd(),'.monna-report-'));
  const staged=join(staging,'report.md'),fd=openSync(staged,'wx');let r;
  try{r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:30000,maxBuffer:65536,stdio:['ignore',fd,'pipe']});}
  finally{closeSync(fd);}
  if(r.status!==0&&r.status!==1){console.error('Permission diff failed: invalid input or execution error.');process.exitCode=2;}
  else{
    const path=join(process.env.RUNNER_TEMP||process.cwd(),'monna-permission-diff.md');renameSync(staged,path);
    const size=statSync(path).size,display=size<=SUMMARY_LIMIT?readFileSync(path,'utf8'):REPORT_NOTICE;
    if(process.env.GITHUB_STEP_SUMMARY){
      let used=0;try{used=statSync(process.env.GITHUB_STEP_SUMMARY).size;}catch(e){if(e.code!=='ENOENT')throw e;}
      const summary=size<=SUMMARY_LIMIT-used?display:REPORT_NOTICE;
      if(used+Buffer.byteLength(summary)<=SUMMARY_LIMIT)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
      else console.log('The existing step summary has no room; the full report remains available through report-path.');
    }
    if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`report-path=${path}\n`);
    console.log(display);process.exitCode=r.status;
  }
}catch{console.error('Permission diff could not read the configured workspace files.');process.exitCode=2;}
finally{if(staging)try{rmSync(staging,{recursive:true,force:true});}catch{console.error('Unable to remove report staging directory.');process.exitCode=2;}}
