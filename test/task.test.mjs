import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compare, shouldFail } from '../src/diff.mjs';
import { markdown, sarif } from '../src/report.mjs';

const json = value => JSON.stringify(value, null, 2);
const demo = name => readFileSync(new URL(`../examples/task-${name}.json`, import.meta.url), 'utf8');

test('P1: list-only demo ties both send changes to the policy and original source lines', () => {
  const before = demo('before');
  const after = demo('after');
  const report = compare(before, after, { task: demo('policy') });
  assert.deepEqual(report.task_review, { goal_evidence: { line: 2, column: 11 }, effective_access: 'unknown' });
  assert.equal(report.verdict, 'review_required');
  assert.equal(shouldFail(report), true);

  const [allow, ask] = report.findings;
  assert.deepEqual(report.findings.map(finding => finding.code), ['ALLOW_ADDED', 'ASK_REMOVED']);
  assert.equal(allow.evidence.after.line, 5);
  assert.equal(ask.evidence.before.line, 7);
  for (const finding of report.findings) {
    assert.equal(finding.task_review.need, 'out_of_scope');
    assert.equal(finding.task_review.policy_evidence.line, 10);
  }
  assert.match(allow.task_review.recommendation, /Remove the added allow/);
  assert.match(ask.task_review.recommendation, /Keep the previous approval requirement/);

  const plain = compare(before, after);
  const { task_review, findings, ...reviewed } = report;
  assert.deepEqual({ ...reviewed, findings: findings.map(({ task_review, ...finding }) => finding) }, plain);
});

test('P2: reordering an allow set has no recommendation or new finding', () => {
  const list = 'mcp__mock_inbox__list';
  const read = 'mcp__mock_inbox__read';
  const report = compare(
    json({ permissions: { allow: [list, read] } }),
    json({ permissions: { allow: [read, list] } }),
    { task: json({ goal: 'List and read inbox metadata', rules: [
      { rule: list, need: 'required' }, { rule: read, need: 'required' }
    ] }) }
  );
  assert.deepEqual(report.findings, []);
  assert.equal(report.verdict, 'no_review_level_change_detected');
  assert.equal(report.task_review.effective_access, 'unknown');
});

test('P3: undocumented MCP option requests evidence and retains partial coverage', () => {
  const fixture = delegationProfile => json({
    mcpServers: { mock_calendar: {
      type: 'http',
      url: 'https://calendar.example.invalid/mcp',
      providerOptions: { delegationProfile }
    } }
  });
  const report = compare(fixture('profile-A'), fixture('profile-B'), {
    task: json({ goal: 'List calendar events only' })
  });
  assert.equal(report.coverage.status, 'partial');
  assert.equal(report.verdict, 'review_required');
  assert.equal(report.findings.length, 1);
  const [finding] = report.findings;
  assert.equal(finding.code, 'UNMODELED_CHANGE');
  assert.deepEqual([finding.evidence.before.line, finding.evidence.after.line], [6, 6]);
  assert.equal(finding.task_review.need, 'unknown');
  assert.match(finding.task_review.recommendation, /provider documentation.*redacted policy/);
  assert.equal(finding.task_review.policy_evidence, undefined);
});

test('task rules match exactly, with different advice for required and approval-bound changes', () => {
  const read = 'Read(./docs/guide.md)';
  const report = compare(json({ permissions: { ask: ['Write(./draft.md)'] } }), json({
    permissions: { allow: [read, 'Read(./docs/notes.md)', 'Write(./draft.md)'] }
  }), { task: json({ goal: 'Use the guide and draft with approval', rules: [
    { rule: 'Read(./docs/**)', need: 'out_of_scope' },
    { rule: read, need: 'required' },
    { rule: 'Write(./draft.md)', need: 'approval_required' }
  ] }) });
  assert.deepEqual(report.findings.map(finding => finding.task_review.need), [
    'required', 'unknown', 'approval_required', 'approval_required'
  ]);
  assert.match(report.findings[2].task_review.recommendation, /Replace the direct allow/);
  assert.match(report.findings[3].task_review.recommendation, /Restore the required approval/);
});

test('task review exports preserve redaction and cite policy evidence', () => {
  const secret = 'PRIVATE_TEST_CANARY_<img>';
  const report = compare(json({ permissions: {} }), json({ permissions: { allow: [secret] } }), {
    task: json({ goal: secret, rules: [{ rule: secret, need: 'out_of_scope' }] })
  });
  const text = markdown(report);
  const reportSarif = sarif(report);
  for (const output of [JSON.stringify(report), text, JSON.stringify(reportSarif)]) {
    assert.ok(!output.includes(secret));
    assert.ok(output.includes('out_of_scope'));
  }
  assert.match(text, /Task rule line/);
  assert.equal(reportSarif.runs[0].results[0].properties.task_review.policy_evidence.line, 6);
});

test('invalid policy input fails without echoing user-provided rules or values', () => {
  const secret = 'REDACTED_TEST_POLICY_VALUE';
  const duplicate = { rule: secret, need: 'required' };
  const invalid = [
    { goal: ' ' },
    { goal: secret, rules: null },
    { goal: secret, rules: [{ rule: secret, need: 'unsupported' }] },
    { goal: secret, rules: [duplicate, duplicate] },
    { goal: secret, [secret]: true }
  ];
  for (const task of invalid) {
    assert.throws(() => compare(demo('before'), demo('after'), { task: json(task) }),
      error => error instanceof Error && !error.message.includes(secret));
  }
});

test('CLI task option runs the same demo and retains the configured exit threshold', () => {
  const args = ['cli.mjs', 'examples/task-before.json', 'examples/task-after.json', '--task', 'examples/task-policy.json'];
  const run = (...extra) => spawnSync(process.execPath, [...args, ...extra], { encoding: 'utf8' });
  const normal = run();
  assert.equal(normal.status, 1);
  assert.equal(JSON.parse(normal.stdout).findings[0].task_review.need, 'out_of_scope');
  const advisory = run('--fail-on', 'none', '--format', 'markdown');
  assert.equal(advisory.status, 0);
  assert.match(advisory.stdout, /Remove the added allow/);
  const invalid = run('--task', 'examples/task-policy.json');
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, '');
});
