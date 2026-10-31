import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../src/diff.mjs';
import {markdown,sarif} from '../src/report.mjs';

test('all permission sets cite the first duplicate occurrence and redact values',()=>{
  for(const [field,added,removed]of[
    ['allow','ALLOW_ADDED','ALLOW_REMOVED'],['deny','DENY_ADDED','DENY_REMOVED'],
    ['ask','ASK_ADDED','ASK_REMOVED'],['additionalDirectories','DIRECTORY_ADDED','DIRECTORY_REMOVED']
  ]){
    const text=values=>JSON.stringify({permissions:{[field]:values}},null,2);
    const report=compare(text(['FICTIONAL_KEEP','FICTIONAL_REMOVED','FICTIONAL_REMOVED']),
                         text(['FICTIONAL_KEEP','FICTIONAL_ADDED','FICTIONAL_ADDED']));
    assert.deepEqual(report.findings.map(f=>f.code),[added,removed]);
    assert.deepEqual(report.findings[0].evidence.after,{line:5,column:7});
    assert.deepEqual(report.findings[1].evidence.before,{line:5,column:7});
    assert.equal(report.findings[0].evidence.before.line,3);
    assert.equal(report.findings[1].evidence.after.line,3);
    for(const output of [JSON.stringify(report),markdown(report),JSON.stringify(sarif(report))]){
      assert.equal(output.includes('FICTIONAL_'),false);
    }
  }
});

test('set findings retain lexical ordering and index zero for special string values',()=>{
  const text=values=>JSON.stringify({permissions:{allow:values}},null,2);
  const report=compare(text(['__proto__','removed','removed','z']),
                       text(['constructor','added','added','z']));
  assert.deepEqual(report.findings.map(f=>f.code),
                   ['ALLOW_ADDED','ALLOW_ADDED','ALLOW_REMOVED','ALLOW_REMOVED']);
  // Added values sort as added, constructor; removed values as __proto__, removed.
  assert.deepEqual(report.findings.map(f=>[f.evidence.before.line,f.evidence.after.line]),
                   [[3,5],[3,4],[4,3],[5,3]]);
  assert.equal(compare(text(['a','a','b']),text(['b','a'])).findings.length,0);
  assert.equal(compare('{"permissions":{}}',text([])).findings.length,0);
});
