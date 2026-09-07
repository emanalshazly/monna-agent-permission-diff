import test from 'node:test';
import assert from 'node:assert/strict';
import { compare,shouldFail } from '../src/diff.mjs';
import { parseConfig,ConfigError } from '../src/json.mjs';
import { markdown,sarif } from '../src/report.mjs';
const c=(a,b,type='claude-settings')=>compare(JSON.stringify(a),JSON.stringify(b),{format:type});
test('allow addition and deny/ask removal are potential expansions',()=>{
  const r=c({permissions:{deny:['Read(.env)'],ask:['Bash']}},{permissions:{allow:['Bash(*)']}});
  assert.deepEqual(r.findings.map(f=>f.code),['ALLOW_ADDED','DENY_REMOVED','ASK_REMOVED']);assert.ok(r.findings.every(f=>f.direction==='potential_expansion'));assert.equal(shouldFail(r),true);
});
test('tightening is reported but below default threshold',()=>{
  const r=c({permissions:{allow:['Bash']}},{permissions:{deny:['Bash'],ask:['Read']}});
  assert.equal(shouldFail(r),false);assert.ok(r.findings.every(f=>f.direction==='potential_reduction'));
});
test('bypass mode change is critical',()=>assert.equal(c({},{permissions:{defaultMode:'bypassPermissions'}}).findings[0].severity,'critical'));
test('removed mode still needs review rather than guessing the default',()=>assert.equal(c({permissions:{defaultMode:'plan'}},{}).findings[0].code,'MODE_CHANGED'));
test('reorder, whitespace and duplicate permission entries do not create findings',()=>{
  assert.equal(c({permissions:{allow:['Bash','Read']}},{permissions:{allow:['Read','Bash','Read']}}).findings.length,0);
  assert.equal(compare('{"permissions":{}}','{\n "permissions": {}\n}').findings.length,0);
});
test('path changes are reviewable and never pretend to resolve symlinks',()=>{
  const r=c({permissions:{additionalDirectories:['/project/docs']}},{permissions:{additionalDirectories:['/project']}});
  assert.deepEqual(r.findings.map(f=>f.code),['DIRECTORY_ADDED','DIRECTORY_REMOVED']);
});
test('unmodeled field changes are not silent',()=>{
  const r=c({sandbox:{enabled:true}},{sandbox:{enabled:false}});assert.equal(r.coverage.status,'partial');assert.equal(r.findings[0].code,'UNMODELED_CHANGE');assert.equal(shouldFail(r,'medium'),true);
});
test('unchanged unknown fields still mark coverage partial',()=>{
  const r=c({futureRule:true},{futureRule:true});assert.equal(r.findings.length,0);assert.equal(r.coverage.status,'partial');
});
test('new MCP servers flag expansion and unknown fields',()=>{
  const r=c({mcpServers:{}},{mcpServers:{x:{command:'node',futurePermission:'wide'}}},'mcp');assert.deepEqual(r.findings.map(f=>f.code),['SERVER_ADDED','UNMODELED_CHANGE']);assert.equal(r.coverage.status,'partial');
});
test('removed MCP servers remain visible',()=>assert.equal(c({mcpServers:{x:{command:'x'}}},{mcpServers:{}},'mcp').findings[0].code,'SERVER_REMOVED'));
test('all MCP execution and credential boundary changes covered',()=>{
  const a={mcpServers:{x:{command:'a',args:['a'],url:'https://a',type:'sse',env:{KEY:'a'},headers:{Authorization:'a'},disabled:true}}};
  const b={mcpServers:{x:{command:'b',args:['b'],url:'https://b',type:'http',env:{KEY:'b'},headers:{Authorization:'b'},disabled:false}}};
  assert.equal(c(a,b,'mcp').findings.length,7);
});
test('MCP argument order is significant but object key order is not',()=>{
  assert.equal(c({mcpServers:{x:{args:['a','b']}}},{mcpServers:{x:{args:['b','a']}}},'mcp').findings[0].code,'ARGUMENTS_CHANGED');
  assert.equal(c({mcpServers:{x:{env:{A:'a',B:'b'}}}},{mcpServers:{x:{env:{B:'b',A:'a'}}}},'mcp').findings.length,0);
});
test('secret canaries never enter JSON, Markdown, SARIF or error messages',()=>{
  const secret='UNIQUE_SECRET_CANARY_729184';
  const r=c({mcpServers:{}},{mcpServers:{[secret]:{command:secret,args:[secret],env:{[secret]:secret},url:'https://host/?token='+secret}}},'mcp');
  for(const out of [JSON.stringify(r),markdown(r),JSON.stringify(sarif(r))])assert.equal(out.includes(secret),false);
  assert.throws(()=>parseConfig('{"'+secret+'":1,"'+secret+'":2}'),e=>!e.message.includes(secret));
});
test('permission patterns and hostile unknown keys are not echoed',()=>{
  const secret='<script>alert(1)</script>token123';const r=c({},{permissions:{allow:[secret]},[secret]:secret});assert.ok(!JSON.stringify(r).includes(secret));assert.ok(!markdown(r).includes(secret));
});
test('evidence points to actual changed source line',()=>{
  const r=compare('{"permissions":{}}','{\n "permissions": {\n  "allow": [\n   "Bash"\n  ]\n }\n}');assert.equal(r.findings[0].evidence.after.line,4);
});
test('duplicate object keys including escaped duplicates rejected',()=>{
  for(const s of ['{"permissions":{},"permissions":{}}','{"x":1,"\\u0078":2}'])assert.throws(()=>parseConfig(s),/Duplicate/);
});
test('prototype keys do not mutate global prototypes',()=>{
  const p=parseConfig('{"__proto__":{"polluted":true}}');assert.equal({}.polluted,undefined);assert.equal(p.data.__proto__.polluted,true);
});
test('malformed, nonfinite, trailing and primitive JSON fail',()=>{
  for(const s of ['[]','null','1','{"x":NaN}','{"x":1e999}','{"x":01}','{} garbage','{"x":1,}','{"x":"\n"}'])assert.throws(()=>parseConfig(s),ConfigError);
});
test('depth and size are bounded',()=>{
  assert.throws(()=>parseConfig('{"x":'+ '['.repeat(70)+'0'+']'.repeat(70)+'}'),/complexity/);
  assert.throws(()=>parseConfig(' '.repeat(1000001)),/at most/);
});
test('unsupported and ambiguous formats fail closed',()=>{
  assert.throws(()=>compare('{}','{}'),/detect/);
  assert.throws(()=>compare('{"mcpServers":{},"permissions":{}}','{}'),/Ambiguous/);
  assert.throws(()=>c({},{} ,'invented'),/Unsupported/);
});
test('malformed supported fields are rejected',()=>{
  for(const a of [{permissions:null},{permissions:{allow:'*'}},{permissions:{ask:[1]}},{permissions:{defaultMode:true}}])assert.throws(()=>c({},a),ConfigError);
  for(const b of [{},{mcpServers:[]},{mcpServers:{x:null}},{mcpServers:{x:{args:'x'}}},{mcpServers:{x:{env:{A:1}}}}])assert.throws(()=>c({mcpServers:{}},b,'mcp'),ConfigError);
});
test('deterministic repeated runs and threshold controls',()=>{
  const a={},b={permissions:{allow:['Bash']}};assert.deepEqual(c(a,b),c(a,b));assert.equal(shouldFail(c(a,b),'none'),false);assert.throws(()=>shouldFail(c(a,b),'invalid'),ConfigError);
});
test('SARIF uses synthetic artifact names and precise evidence coordinates',()=>{
  const s=sarif(c({},{permissions:{allow:['Bash']}}));assert.equal(s.version,'2.1.0');assert.equal(s.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri,'after.json');
});
test('seeded irrelevant key reorder property holds over 100 cases',()=>{
  for(let i=0;i<100;i++){const a={mcpServers:{x:{env:{A:String(i),B:'b'},args:['--scope',String(i)]}}};const b={mcpServers:{x:{args:['--scope',String(i)],env:{B:'b',A:String(i)}}}};assert.equal(c(a,b,'mcp').findings.length,0);}
});
