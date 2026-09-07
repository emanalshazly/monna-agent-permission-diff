import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {mkdtempSync,writeFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
const cli=(...args)=>spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'});
test('CLI review exit 1 with valid JSON output',()=>{const r=cli('examples/before.json','examples/after.json');assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).findings.length,6);});
test('CLI none threshold exits zero; Markdown and SARIF usable',()=>{
  for(const fmt of ['json','markdown','sarif']){const r=cli('examples/before.json','examples/after.json','--format',fmt,'--fail-on','none');assert.equal(r.status,0);assert.ok(r.stdout.includes('MONNA'));}
});
test('CLI errors never echo hostile file names or content',()=>{const r=cli('SECRET_CANARY_FILE','missing');assert.equal(r.status,2);assert.ok(!r.stderr.includes('SECRET_CANARY_FILE'));});
test('CLI invalid options fail without reporting a clean scan',()=>{const r=cli('examples/before.json','examples/after.json','--format','bad');assert.equal(r.status,2);assert.equal(r.stdout,'');});
test('CLI rejects invalid UTF-8, oversized input and directories',()=>{
  const d=mkdtempSync(join(tmpdir(),'monna-input-'));const bad=join(d,'bad.json'),large=join(d,'large.json');writeFileSync(bad,Buffer.from([0xff,0xfe,0xff]));writeFileSync(large,' '.repeat(2000001));for(const p of [bad,large,d])assert.equal(cli(p,'examples/after.json').status,2);
});
test('configured executable is never launched',()=>{
  const d=mkdtempSync(join(tmpdir(),'monna-noexec-'));const marker=join(d,'must-not-exist'),a=join(d,'a.json'),b=join(d,'b.json');writeFileSync(a,'{"mcpServers":{}}');writeFileSync(b,JSON.stringify({mcpServers:{x:{command:process.execPath,args:['-e',`require('fs').writeFileSync(${JSON.stringify(marker)},'executed')`]}}}));assert.equal(cli(a,b).status,1);assert.equal(existsSync(marker),false);
});
