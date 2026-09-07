#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { compare,shouldFail } from './src/diff.mjs';
import { ConfigError } from './src/json.mjs';
import { markdown,sarif } from './src/report.mjs';
async function read(path){
  let handle;try{handle=await open(path,'r');const stat=await handle.stat();if(!stat.isFile()||stat.size>2000000)throw new ConfigError('Input must be a regular file under 2000000 bytes.');const bytes=Buffer.alloc(2000001);let total=0;while(total<bytes.length){const {bytesRead}=await handle.read(bytes,total,bytes.length-total,null);if(!bytesRead)break;total+=bytesRead;}if(total>2000000)throw new ConfigError('Input exceeds byte limit.');try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,total));}catch{throw new ConfigError('Input must be valid UTF-8.');}}finally{await handle?.close();}
}
try{
  const args=process.argv.slice(2);
  if(args.includes('--help')){console.log('Usage: node cli.mjs BEFORE AFTER [--type auto|claude-settings|mcp] [--format json|markdown|sarif] [--fail-on none|info|medium|high|critical]\nExit: 0 below threshold; 1 review threshold reached; 2 invalid input. No network or server execution.');}
  else{
    if(args.length<2)throw new ConfigError('Two input files are required. Use --help or npm run demo.');
    const [a,b,...rest]=args;const options={type:'auto',format:'json','fail-on':'high'};const seen=new Set();
    for(let i=0;i<rest.length;i+=2){const key=rest[i].slice(2);if(!rest[i].startsWith('--')||!Object.hasOwn(options,key)||!rest[i+1]||seen.has(key))throw new ConfigError('Invalid or repeated option.');seen.add(key);options[key]=rest[i+1];}
    if(!['json','markdown','sarif'].includes(options.format))throw new ConfigError('Unsupported output format.');
    const report=compare(await read(a),await read(b),{format:options.type});const fail=shouldFail(report,options['fail-on']);
    console.log(options.format==='markdown'?markdown(report):JSON.stringify(options.format==='sarif'?sarif(report):report,null,2));process.exitCode=fail?1:0;
  }
}catch(e){console.error(JSON.stringify({error:e instanceof ConfigError?e.message:'Unable to read configuration files.',status:'invalid_input'}));process.exitCode=2;}
