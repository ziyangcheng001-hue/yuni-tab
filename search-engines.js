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
