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

test('uses a vector search icon instead of an emoji', () => {
  assert.match(
    html,
    /<button type="submit" title="搜索" aria-label="搜索">\s*<svg class="search-icon"/
  );
  assert.doesNotMatch(html, /<button type="submit" title="搜索">🔍<\/button>/);
});

test('runs Dock idle hiding independently from search-box idle hiding', () => {
  assert.match(html, /body\.dock-idle\.dock-hidden #bm-dock/);
  assert.doesNotMatch(html, /body\.dock-idle\.searchbox-hidden #bm-dock/);
  assert.match(script, /var dockIdleTimer = null;/);
  assert.match(script, /function resetDockIdle\(\)/);
  assert.match(script, /document\.body\.classList\.add\('dock-hidden'\)/);
});

test('reloads suggestions when a non-empty search input regains focus', () => {
  assert.match(
    script,
    /input\.addEventListener\('focus', function \(\) \{\s*var val = input\.value\.trim\(\);\s*if \(val\) fetchSuggest\(val\);\s*\}\);/
  );
});
