import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {reviewPR,prMarkdown} from './src/pr-review.mjs';
let text,exitCode=2,result;
try{
 if(process.env.GITHUB_EVENT_NAME!=='pull_request')throw Error('Expected a pull_request event.');
 const bytes=readFileSync(process.env.GITHUB_EVENT_PATH);if(bytes.length>2000000)throw Error('Oversized event.');
 const event=JSON.parse(bytes.toString('utf8'));
 const pr=event.pull_request;
 if(!pr||pr.base?.repo?.full_name!==process.env.GITHUB_REPOSITORY)throw Error('Repository mismatch.');
 result=reviewPR({cwd:process.env.GITHUB_WORKSPACE,repository:process.env.GITHUB_REPOSITORY,base:pr.base.sha,head:pr.head.sha,threshold:process.env.MONNA_FAIL_ON||'medium'});
 text=prMarkdown(result);exitCode=result.exitCode;
}catch{text='# MONNA — Agent permission PR review\n\n**incomplete**: could not establish or read the PR comparison. Check the pull_request event, commit availability and full-history checkout. No clean result is claimed.\n';}
const folder=process.env.RUNNER_TEMP||process.cwd();
const reportPath=join(folder,'monna-pr-review.md');
writeFileSync(reportPath,text);
if(result)writeFileSync(join(folder,'monna-pr-review.json'),JSON.stringify(result,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text);
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`report-path=${reportPath}\nverdict=${result?.verdict||'incomplete'}\n`);
// Keep untrusted repository paths out of runner logs/workflow commands.
console.log(`MONNA PR review: ${result?.verdict||'incomplete'}; see the job summary.`);
process.exitCode=exitCode;
