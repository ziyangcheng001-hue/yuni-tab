const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('routes Google suggestions through the Google endpoint', async () => {
  let listener;
  let requestedUrl;
  let response;
  const context = {
    importScripts(file) {
      context.SearchEngines = require('../' + file);
    },
    chrome: {
      runtime: {
        onMessage: {
          addListener(fn) { listener = fn; }
        }
      }
    },
    fetch(url) {
      requestedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['codex', ['codex cli', 'codex app']])
      });
    }
  };

  vm.runInNewContext(fs.readFileSync('worker.js', 'utf8'), context);
  const staysOpen = listener(
    { type: 'suggest', engine: 'google', q: 'codex' },
    {},
    value => { response = value; }
  );
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(staysOpen, true);
  assert.equal(
    requestedUrl,
    'https://suggestqueries.google.com/complete/search?client=chrome&q=codex'
  );
  assert.deepEqual(Array.from(response.data), ['codex cli', 'codex app']);
});
