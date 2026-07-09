// 后台 worker：接收 newtab 的请求，代理抓取 Bing 建议（绕过 CORS）
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'suggest') {
    fetch('https://api.bing.com/osjson.aspx?query=' + encodeURIComponent(msg.q))
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data: data[1] || [] }))
      .catch(() => sendResponse({ ok: false, data: [] }));
    return true; // 保持通道，等异步结果
  }
});
