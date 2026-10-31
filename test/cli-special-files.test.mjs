import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));

test('CLI rejects named pipes without waiting for a writer', {skip: process.platform === 'win32'}, () => {
  const directory = mkdtempSync(join(tmpdir(), 'monna-special-file-'));
  try {
    const regular = join(directory, 'regular.json');
    const pipe = join(directory, 'fictional-input.json');
    writeFileSync(regular, '{"permissions":{}}');
    const created = spawnSync('mkfifo', [pipe], {encoding:'utf8'});
    assert.equal(created.status, 0, created.stderr);
    for (const [before, after] of [[pipe, regular], [regular, pipe]]) {
      const result = spawnSync(process.execPath, [cli, before, after], {
        encoding:'utf8', timeout:2000,
      });
      assert.equal(result.error, undefined, 'input admission waited for FIFO contents');
      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.equal(JSON.parse(result.stderr).status, 'invalid_input');
      assert.ok(!result.stderr.includes(pipe));
    }
    const valid = spawnSync(process.execPath, [cli, regular, regular], {
      encoding:'utf8', timeout:2000,
    });
    assert.equal(valid.status, 0, valid.stderr);
    assert.deepEqual(JSON.parse(valid.stdout).findings, []);
  } finally {
    rmSync(directory, {recursive:true, force:true});
  }
});
