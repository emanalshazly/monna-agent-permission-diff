import {readFile} from 'node:fs/promises';
import {test, expect} from '@playwright/test';

const [beforeDemo, afterDemo, taskDemo] = await Promise.all(
  ['before', 'after', 'policy'].map(async name => {
    const data = await readFile(new URL(`../examples/task-${name}.json`, import.meta.url), 'utf8');
    return data.replaceAll('\r\n', '\n');
  })
);

async function expectDemoInputs(page) {
  await expect(page.locator('#before')).toHaveValue(beforeDemo);
  await expect(page.locator('#after')).toHaveValue(afterDemo);
  await expect(page.locator('#task')).toHaveValue(taskDemo);
  await expect(page.locator('#compare')).toBeEnabled();
}

async function expectDemoReport(page, testInfo) {
  const findings = page.locator('#findings .finding');
  await expect(findings).toHaveCount(2);
  await expect(findings.nth(0)).toContainText('ALLOW_ADDED');
  await expect(findings.nth(0)).toContainText('Remove the added allow.');
  await expect(findings.nth(1)).toContainText('ASK_REMOVED');
  await expect(findings.nth(1)).toContainText('Keep the previous approval requirement');
  await expect(page.locator('#findings .task-fit')).toHaveText([
    'Out of scope · Policy line 10', 'Out of scope · Policy line 10'
  ]);

  const pending = page.waitForEvent('download');
  await page.locator('#json').click();
  const download = await pending;
  const path = testInfo.outputPath('task-review.json');
  await download.saveAs(path);
  expect(await download.failure()).toBeNull();
  const text = await readFile(path, 'utf8');
  await expect(page.locator('#exportText')).toHaveValue(text);
  const report = JSON.parse(text);
  expect(report.findings.map(finding => ({
    code: finding.code,
    need: finding.task_review.need,
    policyLine: finding.task_review.policy_evidence.line,
  }))).toEqual([
    {code: 'ALLOW_ADDED', need: 'out_of_scope', policyLine: 10},
    {code: 'ASK_REMOVED', need: 'out_of_scope', policyLine: 10},
  ]);
}

test('waits for all demo inputs before comparing and exporting', async ({page}, testInfo) => {
  const release = Promise.withResolvers();
  await page.route('**/examples/task-policy.json', async route => {
    await release.promise;
    await route.continue();
  });
  await page.goto('/');
  await page.locator('#before').fill(afterDemo);
  await page.locator('#after').fill(afterDemo);
  await page.locator('#compare').click();
  await expect(page.locator('#status')).toContainText('0 changes');
  await expect(page.locator('#json')).toBeEnabled();

  await page.locator('#sample').click();
  try {
    await expect(page.locator('#compare')).toBeDisabled();
    await expect(page.locator('#status')).toHaveText('Loading comparison inputs…');
    await expect(page.locator('#json')).toBeDisabled();
  } finally {
    release.resolve();
  }
  await expectDemoInputs(page);
  await page.locator('#compare').click();
  await expectDemoReport(page, testInfo);
});

test('a delayed local file cannot overwrite the newer demo or its export', async ({page}, testInfo) => {
  const filename = 'delayed-before.json';
  await page.addInitScript(delayedName => {
    const readFile = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      if (this.name !== delayedName) return readFile.call(this);
      return new Promise((resolve, reject) => {
        window.finishPermissionDiffRead = async () => {
          try {
            resolve(await readFile.call(this));
          } catch (error) {
            reject(error);
          }
          await new Promise(resolveFrame => requestAnimationFrame(resolveFrame));
        };
      });
    };
  }, filename);
  await page.goto('/');
  await page.locator('#fileBefore').setInputFiles({
    name: filename, mimeType: 'application/json', buffer: Buffer.from(afterDemo),
  });
  await page.waitForFunction(() => typeof window.finishPermissionDiffRead === 'function');
  await expect(page.locator('#compare')).toBeDisabled();

  await page.locator('#sample').click();
  await expectDemoInputs(page);
  await page.locator('#compare').click();
  await page.evaluate(() => window.finishPermissionDiffRead());
  await expectDemoInputs(page);
  await expectDemoReport(page, testInfo);
});

test('warns about removed task-required access alongside the static verdict', async ({page}) => {
  const requiredRule = 'Read(./notes.md)';
  await page.goto('/');
  await page.locator('#before').fill(JSON.stringify({permissions:{allow:[requiredRule]}}));
  await page.locator('#after').fill(JSON.stringify({permissions:{allow:[]}}));
  await page.locator('#taskPanel summary').click();
  await page.locator('#task').fill(JSON.stringify({
    goal: 'Read notes', rules: [{rule: requiredRule, need: 'required'}]
  }));
  await page.locator('#compare').click();
  await expect(page.locator('#status')).toContainText(
    'Configuration review · 1 changes · no_review_level_change_detected'
  );
  await expect(page.locator('#taskSummary')).toContainText('Task policy needs review.');
  await expect(page.locator('#findings')).toContainText('retain the required access');

  await page.locator('#lang').click();
  await expect(page.locator('#taskSummary')).toContainText('سياسة المهمة تحتاج مراجعة');
  await page.locator('#task').fill('');
  await page.locator('#compare').click();
  await expect(page.locator('#taskSummary')).toBeHidden();
});
