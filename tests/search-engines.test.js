const test = require('node:test');
const assert = require('node:assert/strict');
const SearchEngines = require('../search-engines.js');

test('normalizes missing and unknown engines to Bing', () => {
  assert.equal(SearchEngines.normalizeEngine(), 'bing');
  assert.equal(SearchEngines.normalizeEngine('unknown'), 'bing');
  assert.equal(SearchEngines.normalizeEngine('google'), 'google');
});

test('builds encoded search URLs for both engines', () => {
  assert.equal(
    SearchEngines.buildSearchUrl('bing', 'liquid glass'),
    'https://www.bing.com/search?q=liquid%20glass'
  );
  assert.equal(
    SearchEngines.buildSearchUrl('google', '液态 玻璃'),
    'https://www.google.com/search?q=%E6%B6%B2%E6%80%81%20%E7%8E%BB%E7%92%83'
  );
});

test('builds the provider-specific autocomplete URL', () => {
  assert.equal(
    SearchEngines.buildSuggestUrl('bing', 'codex'),
    'https://api.bing.com/osjson.aspx?query=codex'
  );
  assert.equal(
    SearchEngines.buildSuggestUrl('google', 'codex'),
    'https://suggestqueries.google.com/complete/search?client=chrome&q=codex'
  );
});

test('normalizes valid suggestion payloads and rejects malformed data', () => {
  assert.deepEqual(
    SearchEngines.parseSuggestions(['codex', ['codex cli', '', 42, 'codex app']]),
    ['codex cli', 'codex app']
  );
  assert.deepEqual(SearchEngines.parseSuggestions({ data: [] }), []);
  assert.deepEqual(SearchEngines.parseSuggestions(['codex']), []);
});
