import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig,ConfigError } from '../src/json.mjs';

const errorOf=text=>{try{parseConfig(text);}catch(error){assert.ok(error instanceof ConfigError,'expected a ConfigError');return error;}throw new Error('expected the parser to reject this input');};

test('a non-object root is reported at the root, not at the end of the input',()=>{
  assert.match(errorOf('5\n').message,/at line 1, column 1\.$/);
});

test('a duplicate key is reported at the key, not at the colon',()=>{
  assert.match(errorOf('{"a":1,"a":2}').message,/at line 1, column 8\.$/);
});

test('a missing separator is reported at the offending character',()=>{
  assert.match(errorOf('{"a" 1}').message,/at line 1, column 6\.$/);
  assert.match(errorOf('{"a":1 "b":2}').message,/at line 1, column 8\.$/);
});
