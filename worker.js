importScripts('search-engines.js');

// 代理联想请求，由扩展权限处理跨域访问。
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
