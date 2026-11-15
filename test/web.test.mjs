import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM adapter; import the actual browser entry point and real parser.
// These checks cover handler state, not browser layout or download completion.
test('language changes preserve diagnostics without breaking idle or result states', async () => {
  const previous = globalThis.document;
  const element = () => ({
    textContent: '', value: '', dataset: {}, disabled: true, hidden: true,
    children: [],
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
  });
  const ids = ['lang','before','after','format','sample','compare','fileBefore',
    'fileAfter','status','findings','exportText','exportPreview','json','md','sarif'];
  const elements = Object.fromEntries(ids.map(id => [id, element()]));
  const initial = 'Load the example or add two JSON files to start.';
  elements.status.textContent = initial;
  elements.status.dataset.t = 'ready';
  elements.format.value = 'auto';
  globalThis.document = {
    documentElement: {},
    getElementById: id => elements[id],
    querySelectorAll: () => [elements.status],
    createElement: element,
  };
  const assertDisabled = () => {
    for (const id of ['json','md','sarif']) assert.equal(elements[id].disabled, true);
  };
  const roundTrip = () => {
    const diagnostic = elements.status.textContent;
    elements.lang.onclick();
    assert.equal(elements.status.textContent, diagnostic);
    assert.equal(document.documentElement.lang, 'ar');
    assertDisabled();
    elements.lang.onclick();
    assert.equal(elements.status.textContent, diagnostic);
    assert.equal(document.documentElement.lang, 'en');
  };
  try {
    await import('../web.mjs');
    elements.before.value = '{"permissions":{}}';
    elements.after.value = '{"permissions":';
    elements.compare.onclick();
    assert.match(elements.status.textContent, /^Input error: .*line 1, column 16/);
    roundTrip();

    elements.fileBefore.files = [{size: 2000001}];
    await elements.fileBefore.onchange();
    assert.equal(elements.status.textContent, 'File exceeds 2 MB.');
    roundTrip();

    elements.fileBefore.files = [{size: 1, arrayBuffer: async () => new Uint8Array([0xff]).buffer}];
    await elements.fileBefore.onchange();
    assert.equal(elements.status.textContent, 'File must contain valid UTF-8 JSON.');
    roundTrip();

    elements.after.oninput();
    assert.equal(elements.status.textContent, initial);
    elements.lang.onclick();
    assert.notEqual(elements.status.textContent, initial);
    elements.lang.onclick();
    assert.equal(elements.status.textContent, initial);

    elements.sample.onclick();
    elements.compare.onclick();
    const result = elements.status.textContent;
    assert.match(result, /^6 changes/);
    elements.lang.onclick();
    assert.notEqual(elements.status.textContent, result);
    assert.equal(elements.findings.children.length, 6);
    for (const id of ['json','md','sarif']) assert.equal(elements[id].disabled, false);
    elements.lang.onclick();
    assert.equal(elements.status.textContent, result);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
