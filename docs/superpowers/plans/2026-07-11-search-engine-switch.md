# Search Engine Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Bing/Google selector whose search submission, autocomplete, suggestion navigation, and placeholder all follow the selected provider.

**Architecture:** Introduce one small UMD-style `search-engines.js` module shared by the new-tab page and the classic Manifest V3 service worker. Keep provider validation, URL construction, and response normalization pure and covered by Node's built-in test runner; keep DOM state and persistence in `newtab.js`.

**Tech Stack:** Manifest V3, plain HTML/CSS/JavaScript, Service Worker `importScripts`, `localStorage`, Node.js `node:test`.

---

## File Map

- Create `search-engines.js`: provider definitions, engine validation, URL builders, and suggestion parsing.
- Create `tests/search-engines.test.js`: unit coverage for the shared provider module.
- Modify `newtab.html`: engine selector markup, selector styles, and shared script loading.
- Modify `newtab.js`: active-engine state, persistence, stale-request protection, and provider-aware navigation.
- Modify `worker.js`: provider-aware autocomplete proxy using the shared module.
- Modify `manifest.json`: Google autocomplete host permission.

### Task 1: Build The Tested Search Provider Module

**Files:**
- Create: `tests/search-engines.test.js`
- Create: `search-engines.js`

- [ ] **Step 1: Write the failing provider tests**

Create `tests/search-engines.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run:

```powershell
node --test tests/search-engines.test.js
```

Expected: FAIL with `Cannot find module '../search-engines.js'`.

- [ ] **Step 3: Implement the shared provider module**

Create `search-engines.js`:

```javascript
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SearchEngines = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DEFAULT_ENGINE = 'bing';
  var providers = {
    bing: {
      id: 'bing',
      name: 'Bing',
      placeholder: '在 Bing 上搜索',
      searchBase: 'https://www.bing.com/search?q=',
      suggestBase: 'https://api.bing.com/osjson.aspx?query='
    },
    google: {
      id: 'google',
      name: 'Google',
      placeholder: '在 Google 上搜索',
      searchBase: 'https://www.google.com/search?q=',
      suggestBase: 'https://suggestqueries.google.com/complete/search?client=chrome&q='
    }
  };

  function normalizeEngine(id) {
    return Object.prototype.hasOwnProperty.call(providers, id) ? id : DEFAULT_ENGINE;
  }

  function getProvider(id) {
    return providers[normalizeEngine(id)];
  }

  function buildSearchUrl(id, query) {
    return getProvider(id).searchBase + encodeURIComponent(query);
  }

  function buildSuggestUrl(id, query) {
    return getProvider(id).suggestBase + encodeURIComponent(query);
  }

  function parseSuggestions(payload) {
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
    return payload[1].filter(function (item) {
      return typeof item === 'string' && item.length > 0;
    });
  }

  return {
    DEFAULT_ENGINE: DEFAULT_ENGINE,
    providers: providers,
    normalizeEngine: normalizeEngine,
    getProvider: getProvider,
    buildSearchUrl: buildSearchUrl,
    buildSuggestUrl: buildSuggestUrl,
    parseSuggestions: parseSuggestions
  };
});
```

- [ ] **Step 4: Run the provider tests and verify they pass**

Run:

```powershell
node --test tests/search-engines.test.js
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the provider module**

```powershell
git add search-engines.js tests/search-engines.test.js docs/superpowers/plans/2026-07-11-search-engine-switch.md
git commit -m "feat: add search provider configuration"
```

### Task 2: Make The Worker Provider-Aware

**Files:**
- Create: `tests/worker.test.js`
- Modify: `worker.js`
- Modify: `manifest.json`

- [ ] **Step 1: Write a failing worker routing test**

Create `tests/worker.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the worker test and verify the existing Bing-only worker fails it**

Run:

```powershell
node --test tests/worker.test.js
```

Expected: FAIL because the existing worker requests the Bing endpoint instead of the Google endpoint.

- [ ] **Step 3: Replace the hard-coded Bing worker logic**

Replace `worker.js` with:

```javascript
importScripts('search-engines.js');

// Proxy autocomplete requests so extension host permissions handle cross-origin access.
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'suggest') return;

  var query = typeof msg.q === 'string' ? msg.q.trim() : '';
  if (!query) {
    sendResponse({ ok: false, data: [] });
    return;
  }

  var engine = SearchEngines.normalizeEngine(msg.engine);
  var url = SearchEngines.buildSuggestUrl(engine, query);

  fetch(url)
    .then(function (response) {
      if (!response.ok) throw new Error('Autocomplete request failed');
      return response.json();
    })
    .then(function (payload) {
      sendResponse({ ok: true, data: SearchEngines.parseSuggestions(payload) });
    })
    .catch(function () {
      sendResponse({ ok: false, data: [] });
    });

  return true;
});
```

- [ ] **Step 4: Add the Google autocomplete host permission**

Change `manifest.json` host permissions to:

```json
"host_permissions": [
  "*://api.bing.com/*",
  "*://suggestqueries.google.com/*"
]
```

- [ ] **Step 5: Validate the worker-related files**

Run:

```powershell
node --check worker.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8')); console.log('manifest ok')"
node --test tests/search-engines.test.js tests/worker.test.js
```

Expected: syntax check exits 0, `manifest ok`, and 5 tests pass.

- [ ] **Step 6: Commit the worker integration**

```powershell
git add worker.js manifest.json tests/worker.test.js
git commit -m "feat: proxy autocomplete by search provider"
```

### Task 3: Add The Persistent Settings Control And Navigation Logic

**Files:**
- Modify: `newtab.html`
- Modify: `newtab.js`

- [ ] **Step 1: Add the selector CSS and markup**

Add a compact segmented control after `.row .label` styles in `newtab.html`:

```css
  .engine-picker {
    display: inline-grid; grid-template-columns: repeat(2, minmax(58px, 1fr));
    padding: 3px; border: 1px solid rgba(0,0,0,.08); border-radius: 8px;
    background: rgba(255,255,255,.55);
  }
  .engine-option {
    min-width: 58px; height: 30px; padding: 0 10px;
    border: none; border-radius: 6px; background: transparent;
    color: #555; font: 500 13px/1 inherit; cursor: pointer;
    transition: background .2s, color .2s, box-shadow .2s;
  }
  .engine-option:hover { background: rgba(0,0,0,.05); }
  .engine-option.active {
    background: #fff; color: #0078d4;
    box-shadow: 0 1px 4px rgba(0,0,0,.12);
  }
  .engine-option:focus-visible { outline: 2px solid #0078d4; outline-offset: 1px; }
```

Add this row after the product-name row:

```html
    <div class="row">
      <span class="label">搜索引擎</span>
      <div class="engine-picker" role="group" aria-label="搜索引擎">
        <button type="button" class="engine-option" data-search-engine="bing" aria-pressed="false">Bing</button>
        <button type="button" class="engine-option" data-search-engine="google" aria-pressed="false">Google</button>
      </div>
    </div>
```

Load the shared provider module before `newtab.js`:

```html
  <script src="search-engines.js"></script>
  <script src="newtab.js"></script>
```

- [ ] **Step 2: Add active engine initialization and persistence**

At the top of `newtab.js`, after the existing form/input declarations, add:

```javascript
var engineOptions = document.querySelectorAll('[data-search-engine]');
var activeEngine = SearchEngines.normalizeEngine(localStorage.getItem('searchEngine'));
var suggestRequestId = 0;

function setSearchEngine(engine, persist) {
  activeEngine = SearchEngines.normalizeEngine(engine);
  input.placeholder = SearchEngines.getProvider(activeEngine).placeholder;
  suggestRequestId += 1;
  suggest.classList.remove('show');

  engineOptions.forEach(function (option) {
    var selected = option.dataset.searchEngine === activeEngine;
    option.classList.toggle('active', selected);
    option.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });

  if (persist) localStorage.setItem('searchEngine', activeEngine);
}

engineOptions.forEach(function (option) {
  option.addEventListener('click', function () {
    setSearchEngine(option.dataset.searchEngine, true);
  });
});

setSearchEngine(activeEngine, false);
```

- [ ] **Step 3: Make autocomplete provider-aware and discard stale responses**

Replace `fetchSuggest` with a version that captures the request engine, query, and sequence number:

```javascript
function fetchSuggest(q) {
  var requestEngine = activeEngine;
  var requestId = ++suggestRequestId;

  function accept(data) {
    if (requestId !== suggestRequestId) return;
    if (requestEngine !== activeEngine || input.value.trim() !== q) return;
    if (!data.length) {
      suggest.classList.remove('show');
      return;
    }
    render(data);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(
      { type: 'suggest', engine: requestEngine, q: q },
      function (res) {
        if (!res || !res.ok || !Array.isArray(res.data)) {
          accept([]);
          return;
        }
        accept(res.data);
      }
    );
    return;
  }

  fetch(SearchEngines.buildSuggestUrl(requestEngine, q))
    .then(function (response) {
      if (!response.ok) throw new Error('Autocomplete request failed');
      return response.json();
    })
    .then(function (payload) { accept(SearchEngines.parseSuggestions(payload)); })
    .catch(function () { accept([]); });
}
```

- [ ] **Step 4: Route submitted searches and suggestion clicks through the active provider**

In the suggestion click handler, replace the hard-coded Bing URL with:

```javascript
location.href = SearchEngines.buildSearchUrl(activeEngine, text);
```

In the form submit handler, replace the hard-coded Bing URL with:

```javascript
location.href = SearchEngines.buildSearchUrl(activeEngine, val);
```

- [ ] **Step 5: Run syntax, unit, manifest, and static integration checks**

Run:

```powershell
node --check search-engines.js
node --check newtab.js
node --check worker.js
node --test tests/search-engines.test.js tests/worker.test.js
node -e "const fs=require('node:fs'); const html=fs.readFileSync('newtab.html','utf8'); if(!html.includes('data-search-engine=\"google\"') || html.indexOf('search-engines.js') > html.indexOf('newtab.js')) process.exit(1); console.log('html integration ok')"
```

Expected: all syntax checks exit 0, 5 tests pass, and `html integration ok` is printed.

- [ ] **Step 6: Load the unpacked extension and verify the user workflow**

Manual verification in Edge or Chrome:

1. Reload the unpacked extension from the extensions page.
2. Open a new tab and confirm Bing is selected for a fresh profile.
3. Select Google and confirm the placeholder changes immediately.
4. Type `codex`, wait for Google suggestions, and click one suggestion.
5. Confirm the destination host is `www.google.com` and the query is preserved.
6. Return to a new tab, submit a typed query, and confirm Google search opens.
7. Reload the new tab and confirm Google remains selected.
8. Switch to Bing and repeat suggestion-click and typed-submit checks.
9. Temporarily block the Google suggestion request and confirm search submission still works.

- [ ] **Step 7: Commit the UI integration**

```powershell
git add newtab.html newtab.js
git commit -m "feat: add Bing and Google search switcher"
```

### Task 4: Final Regression Verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete automated verification**

Run:

```powershell
node --check search-engines.js
node --check newtab.js
node --check worker.js
node --test tests/search-engines.test.js tests/worker.test.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8')); console.log('manifest ok')"
git diff --check HEAD~3..HEAD
```

Expected: all commands exit 0, 5 tests pass, `manifest ok`, and no whitespace errors.

- [ ] **Step 2: Review the final repository state**

Run:

```powershell
git status --short --branch
git log -4 --oneline
```

Expected: clean working tree on the implementation branch with the design commit and three focused feature commits visible.
