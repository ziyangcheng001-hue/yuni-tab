const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('newtab.html', 'utf8');
const script = fs.readFileSync('newtab.js', 'utf8');

test('loads the provider module before the new-tab interaction script', () => {
  const providerIndex = html.indexOf('<script src="search-engines.js"></script>');
  const newtabIndex = html.indexOf('<script src="newtab.js"></script>');
  assert.notEqual(providerIndex, -1);
  assert.ok(providerIndex < newtabIndex);
});

test('renders accessible Bing and Google engine options', () => {
  assert.match(html, /data-search-engine="bing"/);
  assert.match(html, /data-search-engine="google"/);
  assert.match(html, /role="group" aria-label="搜索引擎"/);
});

test('persists the engine and sends it with autocomplete requests', () => {
  assert.match(script, /localStorage\.getItem\('searchEngine'\)/);
  assert.match(script, /localStorage\.setItem\('searchEngine', activeEngine\)/);
  assert.match(script, /type:\s*'suggest',\s*engine:\s*requestEngine,\s*q:\s*q/);
});

test('routes submitted searches and suggestion clicks through the provider module', () => {
  const providerRoutes = script.match(/SearchEngines\.buildSearchUrl\(activeEngine,/g) || [];
  assert.equal(providerRoutes.length, 2);
  assert.doesNotMatch(script, /location\.href = 'https:\/\/www\.bing\.com\/search\?q='/);
});

test('guards delayed suggestion rendering with the active request id', () => {
  assert.match(script, /render\(data, requestId\)/);
  assert.match(script, /function render\(list, requestId\)/);
  assert.match(script, /function build\(\) \{\s*if \(requestId !== suggestRequestId\) return;/);
});

test('invalidates pending suggestions as soon as the input changes', () => {
  assert.match(
    script,
    /input\.addEventListener\('input', function \(\) \{\s*suggestRequestId \+= 1;/
  );
});
