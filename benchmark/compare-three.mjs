// First-party, synthetic comparison. Never run against real user configuration.
// Args: directory containing the three reviewed, built competitor checkouts.
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compare} from '../src/diff.mjs';
import {markdown, sarif} from '../src/report.mjs';
const competitors=resolve(process.argv[2]);
const here=dirname(fileURLToPath(import.meta.url));
const pins={'agent-permission-diff':'77b8fae90e0662633ae471636ee13eec9f785e83','mcp-diff':'b1a044e40d77e8a5d53c2dbc679514a0aaccaafc','agentdrift':'e4564d11d4f1f3fb822fc9275298e5eea5dbd6c0'};
for(const [project,pin] of Object.entries(pins)){
 const rev=spawnSync('git',['-C',join(competitors,project),'rev-parse','HEAD'],{encoding:'utf8'});
 if(rev.status!==0||rev.stdout.trim()!==pin)throw new Error('Unreviewed competitor revision: '+project);
 const dirty=spawnSync('git',['-C',join(competitors,project),'diff','--name-only','HEAD'],{encoding:'utf8'});
 if(dirty.status!==0||dirty.stdout.trim())throw new Error('Modified competitor source: '+project);
}
const load=(project,file)=>import(pathToFileURL(join(competitors,project,'dist',file)).href);
const apd=await load('agent-permission-diff','index.js');
const mcp=await load('mcp-diff','diff.js');
const {parseTool}=await load('mcp-diff','schema.js');
const {sha256}=await load('mcp-diff','canonicalize.js');
const {renderMarkdown}=await load('mcp-diff','render.js');
const canary='MONNA_SYNTHETIC_CREDENTIAL_NOT_REAL_4827';
const p=x=>({permissions:x}); const s=x=>({mcpServers:{demo:x}});
// Predeclared expectation: should a reviewer see a non-cosmetic declared change?
// This does not grade severity or effective permission semantics.
const cases=[
 ['write-added',p({}),p({allow:['Write(src/**)']}),true],
 ['deny-removed',p({deny:['Read(.env)']}),p({}),true],
 ['ask-removed',p({ask:['Bash']}),p({}),true],
 ['bypass-enabled',p({defaultMode:'default'}),p({defaultMode:'bypassPermissions'}),true],
 ['directory-added',p({additionalDirectories:[]}),p({additionalDirectories:['/project']}),true],
 ['mcp-added',{mcpServers:{}},s({command:'node'}),true],
 ['arguments-reordered',s({command:'node',args:['a','b']}),s({command:'node',args:['b','a']}),true],
 ['environment-rotated',s({command:'node',env:{TOKEN:'old'}}),s({command:'node',env:{TOKEN:canary}}),true],
 ['endpoint-changed',s({url:'https://example.invalid/a'}),s({url:`https://example.invalid/b?token=${canary}`}),true],
 ['unknown-changed',p({futurePolicy:'restricted'}),p({futurePolicy:'open'}),true],
 ['deny-added',p({}),p({deny:['Bash']}),true],
 ['identical',p({allow:['Read','Bash']}),p({allow:['Read','Bash']}),false],
 ['set-reordered',p({allow:['Read','Bash']}),p({allow:['Bash','Read']}),false],
 ['object-reordered',s({command:'node',env:{A:'a',B:'b'}}),s({env:{B:'b',A:'a'},command:'node'}),false],
];
const fixtureDir=mkdtempSync(join(tmpdir(),'monna-shared-fixtures-'));
const rows=[];
for(const [name,a,b,expected] of cases){
 const before=JSON.stringify(a,null,2),after=JSON.stringify(b,null,2);
 const result=compare(before,after);
 const cwd=join(fixtureDir,name);mkdirSync(join(cwd,'.claude'),{recursive:true});
 const file=join(cwd,'permissions' in a?'.claude/settings.json':'.mcp.json');
 writeFileSync(file,before);const baseline=await apd.snapshot(cwd,{agents:['claude']});
 writeFileSync(file,after);const current=await apd.snapshot(cwd,{agents:['claude']});
 const delta=apd.diff(baseline,current);
 const input={before,after,file:'permissions' in a?'.claude/settings.json':'.mcp.json'};
 const drift=spawnSync('py',[join(here,'compare-agentdrift.py'),join(competitors,'agentdrift','agentdrift.py')],{input:JSON.stringify(input),encoding:'utf8',timeout:30000});
 if(drift.status!==0)throw new Error('Agentdrift adapter failed: '+drift.stderr);
 const driftResult=JSON.parse(drift.stdout);
 const outputs={monna:{json:JSON.stringify(result),markdown:markdown(result),sarif:JSON.stringify(sarif(result))},apd:{json:apd.json(current,delta),markdown:apd.markdown(current,delta),sarif:apd.sarif(delta)},agentdrift:{json:drift.stdout}};
 const signals={monna:result.findings.length>0,apd:delta.length>0,agentdrift:driftResult.length>0};
 rows.push({name,expected,signals,matches:Object.fromEntries(Object.entries(signals).map(([k,v])=>[k,v===expected])),canary_present:Object.fromEntries(Object.entries(outputs).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([f,t])=>[f,t.includes(canary)]))])),raw:{monna:result,apd:delta,agentdrift:driftResult},outputs});
}
// Separate native-surface cases: MCP manifests are NOT configuration files.
function manifest(tools){const base={server:{name:'synthetic',version:'1',transport:'stdio'},capabilities:{tools:{}},tools:tools.map(parseTool),resources:[],prompts:[]};return {...base,fingerprint:sha256(base)};}
const native=[
 ['tool-added',[],[{name:'lookup',inputSchema:{type:'object'}}],true],
 ['read-only-lost',[{name:'lookup',annotations:{readOnlyHint:true}}],[{name:'lookup',annotations:{readOnlyHint:false}}],true],
 ['schema-changed',[{name:'lookup',inputSchema:{type:'object',properties:{a:{type:'string'}}}}],[{name:'lookup',inputSchema:{type:'object',properties:{a:{type:'number'}}}}],true],
 ['identical',[{name:'lookup'}],[{name:'lookup'}],false],
 ['schema-key-reorder',[{name:'lookup',inputSchema:{type:'object',properties:{a:{type:'string'},b:{type:'string'}}}}],[{name:'lookup',inputSchema:{properties:{b:{type:'string'},a:{type:'string'}},type:'object'}}],false],
].map(([name,a,b,expected])=>{const report=mcp.diff(manifest(a),manifest(b));return {name,expected,signal:report.changes.length>0,match:(report.changes.length>0)===expected,report,markdown:renderMarkdown(report)};});
const versions=Object.fromEntries(['agent-permission-diff','mcp-diff','agentdrift'].map(k=>{const r=spawnSync('git',['-C',join(competitors,k),'rev-parse','HEAD'],{encoding:'utf8'});if(r.status!==0)throw new Error('Missing revision');return [k,r.stdout.trim()]}));
const codexDir=join(fixtureDir,'codex-native');mkdirSync(join(codexDir,'.codex'),{recursive:true});
writeFileSync(join(codexDir,'.codex/config.toml'),'sandbox_mode = "read-only"\n');
const codexBefore=await apd.snapshot(codexDir,{agents:['codex']});
writeFileSync(join(codexDir,'.codex/config.toml'),'sandbox_mode = "danger-full-access"\n');
const codexAfter=await apd.snapshot(codexDir,{agents:['codex']});
const codexNative=apd.diff(codexBefore,codexAfter);
const instructionNative=spawnSync('py',[join(here,'compare-agentdrift.py'),join(competitors,'agentdrift','agentdrift.py')],{input:JSON.stringify({file:'AGENTS.md',before:'Require human approval before sending email.',after:'Send email automatically.'}),encoding:'utf8',timeout:30000});
if(instructionNative.status!==0)throw new Error('Native instruction adapter failed');
const nativeStrengths={apd_codex:codexNative,agentdrift_instruction:JSON.parse(instructionNative.stdout),monna:'Both native formats unsupported; not scored as a false negative.'};
const totals=Object.fromEntries(['monna','apd','agentdrift'].map(k=>[k,{matches:rows.filter(r=>r.matches[k]).length,total:rows.length,changed_signaled:rows.filter(r=>r.expected&&r.signals[k]).length,changed_total:rows.filter(r=>r.expected).length,benign_signaled:rows.filter(r=>!r.expected&&r.signals[k]).length,benign_total:rows.filter(r=>!r.expected).length}]));
const output={scope:'First-party synthetic library-level change-signal checks; not a security accuracy ranking or CLI/user study. mcp-diff uses separate manifest cases; not ranked on unsupported config input.',versions,runtime:process.version,fixtures:cases,totals,rows,mcp_native:native,nativeStrengths,limitations:['Expectations authored by MONNA; no independent labels.','Same JSON bytes for three config engines; agentdrift receives exact changed lines from difflib, not a Git-history CLI run.','No real MCP process, credentials or network service used.','Detection means any finding, not a correct explanation or severity.','All generated files stay in temporary fixture directories; input snapshots are synthetic.','Native Codex/instruction positive cases added as a separate coverage check, never merged into the common score.']};
// Strip the local fixture-root path from all raw outputs before saving evidence.
function sanitize(value){if(typeof value==='string')return value.replaceAll(fixtureDir,'<SYNTHETIC_ROOT>').replaceAll(fixtureDir.replaceAll('\\','/'),'<SYNTHETIC_ROOT>').replaceAll(fixtureDir.replaceAll('\\','\\\\'),'<SYNTHETIC_ROOT>');if(Array.isArray(value))return value.map(sanitize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,sanitize(v)]));return value;}
writeFileSync(join(here,'comparison-results.json'),JSON.stringify(sanitize(output),null,2)+'\n');
console.log(JSON.stringify({versions,totals,mcp_native:native.map(({name,match})=>({name,match}))},null,2));
