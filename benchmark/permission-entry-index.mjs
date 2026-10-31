// Optional measured reproduction; no timing assertion belongs in node --test.
// Usage: node benchmark/permission-entry-index.mjs <baseline-checkout-at-7555911>
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,mkdtempSync,openSync,readFileSync,readSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw new Error('Supply a clean baseline checkout at 7555911a4990338791853c7f363c01941a2fd376.');
const baseline=resolve(process.argv[2]);
const sourceHashes={
  'src/diff.mjs':'2be379655d5183f40e5dae72ab98e99c344c997282e7ca0a7b1ebeb0708c02f9',
  'src/json.mjs':'f9255cf3359463b3fe9e2b9d01de50934c0169183940c7522d6dbe386a07e58f',
  'src/report.mjs':'78457dc9ce46be347e8367001abc8bffc2ca1531b07a4fdbaacbe74c701f9b7c',
  'cli.mjs':'2da3205907e7ec43a10e04c2c89c11dcdd053002a013c2f2ade71b82c60ae757'
};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [path,hash]of Object.entries(sourceHashes))assert.equal(digest(readFileSync(join(baseline,path))),hash,'Baseline source must match the pinned revision.');
const modules={before:await import(pathToFileURL(join(baseline,'src/diff.mjs'))),after:await import(pathToFileURL(join(root,'src/diff.mjs')))};
const input=prefix=>JSON.stringify({permissions:{allow:Array.from({length:40000},(_,i)=>prefix+String(i).padStart(5,'0'))}});
const before=input('B'),after=input('A');
const {parseConfig}=await import(pathToFileURL(join(root,'src/json.mjs')));
const inputSummary=text=>({characters:text.length,bytes:Buffer.byteLength(text),nodes:parseConfig(text).locations.size,sha256:digest(text)});
const inputs={before:inputSummary(before),after:inputSummary(after)};
for(const input of Object.values(inputs))assert.ok(input.characters<=1000000&&input.bytes<=2000000&&input.nodes<=50000);
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const core={before:[],after:[]};
let reportHash;
function compare(label){
  const start=performance.now();
  const report=modules[label].compare(before,after);
  const elapsed=performance.now()-start;
  assert.equal(report.findings.length,80000);
  const text=JSON.stringify(report),hash=digest(text);
  assert.ok(!text.includes('A00000')&&!text.includes('B00000'));
  reportHash??=hash;
  assert.equal(hash,reportHash,'Core reports must remain identical.');
  return elapsed;
}
compare('before');compare('after'); // Unmeasured warm-up.
for(let i=0;i<5;i++)for(const label of(i%2?['after','before']:['before','after']))core[label].push(compare(label));
const temporary=mkdtempSync(join(tmpdir(),'monna-entry-index-'));
const cli={};
function compareFiles(left,right){
  const a=openSync(left,'r'),b=openSync(right,'r');
  const x=Buffer.alloc(1024*1024),y=Buffer.alloc(x.length),hash=createHash('sha256');
  let bytes=0;
  try{
    for(;;){
      const nx=readSync(a,x,0,x.length,null),ny=readSync(b,y,0,y.length,null);
      assert.equal(nx,ny);if(!nx)break;
      assert.ok(x.subarray(0,nx).equals(y.subarray(0,ny)),'CLI output bytes differ.');
      hash.update(x.subarray(0,nx));bytes+=nx;
    }
  }finally{closeSync(a);closeSync(b);}
  return {byte_identical:true,bytes,sha256:hash.digest('hex')};
}
try{
  const beforeFile=join(temporary,'before.json'),afterFile=join(temporary,'after.json');
  writeFileSync(beforeFile,before);writeFileSync(afterFile,after);
  for(const format of ['json','markdown','sarif']){
    const samples={before:[],after:[]};let output;
    for(let i=0;i<3;i++){
      for(const label of(i%2?['after','before']:['before','after'])){
        const fd=openSync(join(temporary,label+'.out'),'w');
        const start=performance.now();let run;
        try{
          run=spawnSync(process.execPath,[join(label==='before'?baseline:root,'cli.mjs'),beforeFile,afterFile,'--format',format,'--fail-on','none'],
                        {stdio:['ignore',fd,'pipe'],encoding:'utf8',windowsHide:true});
          samples[label].push(performance.now()-start);
        }finally{closeSync(fd);}
        assert.ifError(run.error);assert.equal(run.status,0,run.stderr);
      }
      output=compareFiles(join(temporary,'before.out'),join(temporary,'after.out'));
    }
    cli[format]={...samples,before_median_ms:median(samples.before),after_median_ms:median(samples.after),
                 speedup:median(samples.before)/median(samples.after),output};
  }
}finally{
  // Delete only the exact temporary directory created by this benchmark.
  assert.equal(resolve(dirname(temporary)),resolve(tmpdir()));
  assert.ok(basename(temporary).startsWith('monna-entry-index-'));
  rmSync(temporary,{recursive:true,force:true});
}
console.log(JSON.stringify({baseline:'7555911a4990338791853c7f363c01941a2fd376',runtime:process.version,platform:process.platform,architecture:process.arch,
  scope:'One fictional, admitted 40000-entry disjoint-list case; not an independent or general performance benchmark.',
  inputs,findings:80000,core:{...core,before_median_ms:median(core.before),after_median_ms:median(core.after),
    speedup:median(core.before)/median(core.after),json_sha256:reportHash},cli},null,2));
