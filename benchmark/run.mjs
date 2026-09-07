import {performance} from 'node:perf_hooks';import {compare} from '../src/diff.mjs';
// Expected labels are fixture expectations, not model-generated ground truth.
const cases=[
  {name:'allow-expansion',before:{permissions:{}},after:{permissions:{allow:['Bash(*)']}},expected:['ALLOW_ADDED']},
  {name:'deny-removal',before:{permissions:{deny:['Read(.env)']}},after:{permissions:{}},expected:['DENY_REMOVED']},
  {name:'approval-removal',before:{permissions:{ask:['Bash']}},after:{permissions:{}},expected:['ASK_REMOVED']},
  {name:'bypass-mode',before:{permissions:{}},after:{permissions:{defaultMode:'bypassPermissions'}},expected:['MODE_CHANGED']},
  {name:'benign-reorder',before:{permissions:{allow:['Read','Bash']}},after:{permissions:{allow:['Bash','Read']}},expected:[]},
  {name:'unknown-security-field',before:{permissions:{futurePolicy:'restricted'}},after:{permissions:{futurePolicy:'open'}},expected:['UNMODELED_CHANGE']},
  {name:'new-server',before:{mcpServers:{}},after:{mcpServers:{x:{command:'not-executed'}}},expected:['SERVER_ADDED']},
  {name:'remote-endpoint',before:{mcpServers:{x:{url:'https://a'}}},after:{mcpServers:{x:{url:'https://b'}}},expected:['ENDPOINT_CHANGED']},
  {name:'credentials-rotation',before:{mcpServers:{x:{env:{KEY:'before'}}}},after:{mcpServers:{x:{env:{KEY:'after'}}}},expected:['ENVIRONMENT_CHANGED']},
  {name:'arguments-order',before:{mcpServers:{x:{args:['a','b']}}},after:{mcpServers:{x:{args:['b','a']}}},expected:['ARGUMENTS_CHANGED']}
];
const results=[];for(const c of cases){const actual=compare(JSON.stringify(c.before),JSON.stringify(c.after)).findings.map(f=>f.code).sort();results.push({case:c.name,expected:c.expected,actual,pass:JSON.stringify(actual)===JSON.stringify([...c.expected].sort())});}
const timings=[];for(let i=0;i<1000;i++){const c=cases[i%cases.length];const start=performance.now();compare(JSON.stringify(c.before),JSON.stringify(c.after));timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);
console.log(JSON.stringify({benchmark_version:'1.0',scope:'10 synthetic fixtures; not a market-wide or independent benchmark',runtime:process.version,platform:process.platform,passed:results.filter(r=>r.pass).length,total:results.length,iterations:1000,p95_ms:timings[949],results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
